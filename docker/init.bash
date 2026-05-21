#!/bin/bash
set -e

source /etc/profile

# check_table TABLE_NAME
# Returns 0 (true) if the table exists in the current database, 1 otherwise.
check_table() {
    local table="$1"
    local result
    # Reject anything that is not a plain identifier (letters, digits, underscores).
    # This prevents SQL injection via the unquoted heredoc below.
    case "${table}" in
        ''|*[!a-zA-Z0-9_]*)
            echo "check_table: invalid table name '${table}'" >&2
            return 1
            ;;
    esac
    result=$(python manage.py dbshell 2>/dev/null <<EOF
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name='${table}';
EOF
)
    # psql prints COUNT(*) = 1 as a lone "1" on its own line.
    printf '%s\n' "${result}" | grep -q '^[[:space:]]*1[[:space:]]*$'
}

echo 'KPI initializing…'

cd "${KPI_SRC_DIR}"

if [[ -z $DATABASE_URL ]]; then
    echo "DATABASE_URL must be configured to run this server"
    echo "example: 'DATABASE_URL=postgres://hostname:5432/dbname'"
    exit 1
fi

# Handle Python dependencies BEFORE attempting any `manage.py` commands
KPI_WEB_SERVER="${KPI_WEB_SERVER:-uWSGI}"
if [[ "${KPI_WEB_SERVER,,}" == 'uwsgi' ]]; then
    # `diff` returns exit code 1 if it finds a difference between the files
    if ! diff -q "${KPI_SRC_DIR}/dependencies/pip/requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    then
        echo "Syncing production pip dependencies…"
        pip-sync dependencies/pip/requirements.txt 1>/dev/null
        cp "dependencies/pip/requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    fi
else
    if ! diff -q "${KPI_SRC_DIR}/dependencies/pip/dev_requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    then
        echo "Syncing development pip dependencies…"
        pip-sync dependencies/pip/dev_requirements.txt 1>/dev/null
        cp "dependencies/pip/dev_requirements.txt" "${TMP_DIR}/pip_dependencies.txt"
    fi
fi

# Wait for databases to be up & running before going further
/bin/bash "${INIT_PATH}/wait_for_mongo.bash"
/bin/bash "${INIT_PATH}/wait_for_postgres.bash"

# Add a fake migration entry per app whose table already exists
if check_table "bossoidc_keycloak"; then
    echo "Table bossoidc_keycloak exists — running fake migration for bossoidc2…"
    gosu "${UWSGI_USER}" python manage.py migrate bossoidc2 0003_keycloak_usertype --fake --noinput
fi

# Fix schema drift: oauth2_provider 0005 may have been recorded as applied without
# actually creating the `created`/`updated` columns on oauth2_provider_application.
# Adding them here is idempotent (IF NOT EXISTS) and unblocks 0006.
echo 'Repairing oauth2_provider schema drift (if any)...'
# Before running the ALTER TABLE, check the table exists first
if check_table "oauth2_provider_application"; then
    gosu "${UWSGI_USER}" python manage.py dbshell <<'EOF'
ALTER TABLE oauth2_provider_application
  ADD COLUMN IF NOT EXISTS created timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated timestamp with time zone NOT NULL DEFAULT now();
EOF
fi

echo 'Running migrations...'
gosu "${UWSGI_USER}" python manage.py migrate --noinput

echo 'Creating superuser…'
gosu "${UWSGI_USER}" python manage.py create_kobo_superuser

if [[ ! -d "${KPI_SRC_DIR}/staticfiles" ]] || ! gosu "${UWSGI_USER}" python "${KPI_SRC_DIR}/docker/check_kpi_prefix_outdated.py"; then
    if [[ "${FRONTEND_DEV_MODE}" == "host" ]]; then
        echo "Dev mode is activated and \`npm\` should be run from host."
        # Create folder to be sure following `rsync` command does not fail
        mkdir -p "${KPI_SRC_DIR}/staticfiles"
    else
        echo "Cleaning old build…"
        rm -rf "${KPI_SRC_DIR}/jsapp/fonts" && \
        rm -rf "${KPI_SRC_DIR}/jsapp/compiled"

        echo "Syncing \`npm\` packages…"
        if ! check-dependencies; then
            npm install --legacy-peer-deps --quiet > /dev/null
        else
            npm run postinstall > /dev/null
        fi

        echo "Rebuilding client code…"
        npm run build

        echo "Building static files from live code…"
        python manage.py collectstatic --noinput
    fi
fi

echo "Copying static files to nginx volume…"
rsync -aq --delete --chown=www-data "${KPI_SRC_DIR}/staticfiles/" "${NGINX_STATIC_DIR}/"

if [[ ! -d "${KPI_SRC_DIR}/locale" ]] || [[ -z "$(ls -A "${KPI_SRC_DIR}/locale")" ]]; then
    echo "Fetching translations…"
    git submodule init && \
    git submodule update && \
    python manage.py compilemessages
fi

rm -rf /etc/profile.d/pydev_debugger.bash.sh
if [[ -d /srv/pydev_orig && -n "${KPI_PATH_FROM_ECLIPSE_TO_PYTHON_PAIRS}" ]]; then
    echo 'Enabling PyDev remote debugging.'
    "${KPI_SRC_DIR}/docker/setup_pydev.bash"
fi

echo 'Cleaning up Celery PIDs…'
rm -rf /tmp/celery*.pid

echo 'Restore permissions on Celery logs folder'
chown -R "${UWSGI_USER}:${UWSGI_GROUP}" "${KPI_LOGS_DIR}"

# This can take a while when starting a container with lots of media files.
# Maybe we should add a disclaimer as we do in KoBoCAT to let the users
# do it themselves
chown -R "${UWSGI_USER}:${UWSGI_GROUP}" "${KPI_MEDIA_DIR}"

echo 'KPI initialization completed.'

exec /usr/bin/runsvdir "${SERVICES_DIR}"
