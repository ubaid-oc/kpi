from django.contrib.auth.management import DEFAULT_DB_ALIAS
from django.db import connection

from .fix_migrations_for_kobocat import are_migrations_already_applied


def run():

    if not are_migrations_already_applied(DEFAULT_DB_ALIAS):
        print('Skipping KPI migration fixes...')
        return

    if should_fix_internal_mfa_app_label():
        fix_internal_mfa_app_label()

    # Upstream: fake-apply kobo_auth.0001 when upgrading from a release predating
    # the kobo_auth app (custom User model moved here, reusing `auth_user`).
    fix_kobo_auth_initial()

    # Ensure the anonymous user exists before data migrations that assign object
    # permissions to it (e.g. kpi.0055); create_anonymous_user only runs AFTER migrate.
    ensure_anonymous_user()

    # OpenClinica: repair migration/schema drift introduced by the Keycloak/SSO
    # upgrades before `manage.py migrate` runs later in scripts/migrate.sh.
    fix_bossoidc2_keycloak_usertype()
    fix_oauth2_provider_application_columns()


def fix_kobo_auth_initial():
    """
    Fake-apply kobo_auth.0001_initial when upgrading from a release that predates
    the kobo_auth app (upstream moved the custom User model into its own app,
    reusing the existing `auth_user` table via db_table='auth_user').

    On such databases `auth_user` already exists and `account.0001_initial`
    (allauth) is recorded, but `kobo_auth.0001_initial` is not, so Django raises
    InconsistentMigrationHistory ("account.0001_initial is applied before its
    dependency kobo_auth.0001_initial"). kobo_auth.0001 only creates the User
    model (db_table 'auth_user', already present) and a proxy model (no table),
    so recording it as applied is safe and reproduces the intent of
    `manage.py migrate kobo_auth 0001 --fake`.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'auth_user')"
        )
        if not cursor.fetchone()[0]:
            return

        cursor.execute(
            "SELECT * FROM django_migrations "
            "WHERE app = 'kobo_auth' AND name = '0001_initial'"
        )
        if cursor.fetchone() is not None:
            return

        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) "
            "VALUES ('kobo_auth', '0001_initial', NOW())"
        )
        print(
            'Fake-applying kobo_auth.0001_initial '
            '(existing auth_user table; custom User moved to kobo_auth).'
        )


def ensure_anonymous_user():
    """
    Create the anonymous user (settings.ANONYMOUS_USER_ID, default -1) before
    `manage.py migrate` runs.

    kpi data migrations such as kpi.0055_set_require_auth_per_project assign
    object permissions to the anonymous user. On an upgraded database that user
    may not exist yet — create_anonymous_user (which calls get_anonymous_user())
    is only invoked AFTER migrate in scripts/migrate.sh — so the migration hits a
    foreign-key violation ("Key (user_id)=(-1) is not present in table auth_user").

    Insert a minimal auth_user row mirroring get_anonymous_user() (pk + username,
    model defaults otherwise). Raw SQL keeps this independent of model/schema state
    mid-migration. create_anonymous_user later finds this row and fills in the rest.
    """
    from django.conf import settings

    anon_id = getattr(settings, 'ANONYMOUS_USER_ID', -1)
    username = getattr(
        settings, 'ANONYMOUS_DEFAULT_USERNAME_VALUE', 'AnonymousUser'
    )
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1 FROM auth_user WHERE id = %s', [anon_id])
        if cursor.fetchone() is not None:
            return

        cursor.execute(
            'INSERT INTO auth_user '
            '(id, password, is_superuser, username, first_name, last_name, '
            'email, is_staff, is_active, date_joined) '
            "VALUES (%s, '', false, %s, '', '', '', false, true, NOW()) "
            'ON CONFLICT (id) DO NOTHING',
            [anon_id, username],
        )
        print(f'Creating anonymous user (id={anon_id}) before data migrations.')


def should_fix_internal_mfa_app_label():
    """
    Checks for accounts_mfa migrations with the previous app label
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT * FROM django_migrations WHERE app = 'mfa' AND name = '0002_add_mfa_available_to_user_model';"
        )
        return cursor.fetchone() is not None


def fix_internal_mfa_app_label():
    """
    Changes the known migration names for the internal accounts_mfa app
    """
    with connection.cursor() as cursor:
        cursor.execute("""
        UPDATE django_migrations SET app='accounts_mfa' WHERE app='mfa' AND name IN (
            '0001_initial',
            '0002_add_mfa_available_to_user_model',
            '0003_rename_kobo_mfa_method_model',
            '0004_alter_mfamethod_date_created_and_more'
        )
        """)
        print(f'Fixing accounts_mfa app migration records. Modified {cursor.rowcount} records in django_migrations')


def fix_bossoidc2_keycloak_usertype():
    """
    OpenClinica: fake-apply bossoidc2 0003_keycloak_usertype when upgrading from
    a legacy Keycloak/SSO deployment.

    On older OC deployments the `bossoidc_keycloak` table already carries the
    user_type column, so running the real migration raises
    'column "user_type" already exists' (and leaves an InconsistentMigrationHistory
    if it bails). This reproduces the original
    `manage.py migrate bossoidc2 0003_keycloak_usertype --fake` intent by inserting
    a fake django_migrations row when the legacy table exists and the migration has
    not yet been recorded.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'bossoidc_keycloak')"
        )
        legacy_table_exists = cursor.fetchone()[0]
        if not legacy_table_exists:
            return

        cursor.execute(
            "SELECT * FROM django_migrations "
            "WHERE app = 'bossoidc2' AND name = '0003_keycloak_usertype'"
        )
        if cursor.fetchone() is not None:
            return

        cursor.execute(
            "INSERT INTO django_migrations (app, name, applied) "
            "VALUES ('bossoidc2', '0003_keycloak_usertype', NOW())"
        )
        print(
            'Fake-applying bossoidc2 0003_keycloak_usertype '
            '(legacy bossoidc_keycloak table present).'
        )


def fix_oauth2_provider_application_columns():
    """
    OpenClinica: repair oauth2_provider schema drift.

    oauth2_provider 0005 may have been recorded as applied without actually
    creating the `created`/`updated` columns on oauth2_provider_application,
    which blocks 0006. Adding them here is idempotent (IF NOT EXISTS) and runs
    before `manage.py migrate` is invoked further down scripts/migrate.sh.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables "
            "WHERE table_schema = 'public' "
            "AND table_name = 'oauth2_provider_application')"
        )
        table_exists = cursor.fetchone()[0]
        if not table_exists:
            return

        cursor.execute("""
        ALTER TABLE oauth2_provider_application
          ADD COLUMN IF NOT EXISTS created timestamp with time zone NOT NULL DEFAULT now(),
          ADD COLUMN IF NOT EXISTS updated timestamp with time zone NOT NULL DEFAULT now()
        """)
        print('Repairing oauth2_provider_application schema drift (created/updated columns).')
