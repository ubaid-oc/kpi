from django.contrib.auth.management import DEFAULT_DB_ALIAS
from django.db import connection

from .fix_migrations_for_kobocat import are_migrations_already_applied


def run():

    if not are_migrations_already_applied(DEFAULT_DB_ALIAS):
        print('Skipping KPI migration fixes...')
        return

    if should_fix_internal_mfa_app_label():
        fix_internal_mfa_app_label()

    # OpenClinica: repair migration/schema drift introduced by the Keycloak/SSO
    # upgrades before `manage.py migrate` runs later in scripts/migrate.sh.
    fix_bossoidc2_keycloak_usertype()
    fix_oauth2_provider_application_columns()


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
