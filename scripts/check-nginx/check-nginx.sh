#!/usr/bin/env bash

set -e

ALL_NGINX_COUNT=$(docker exec kobo-docker_nginx_1 ps xao cmd | awk "/^nginx/" | wc -l)
SPV_NGINX_COUNT=$(docker exec kobo-docker_nginx_1 ps xao cmd | awk "/^nginx:/" | wc -l)
NOT_SPV_NGINX_COUNT=$(($ALL_NGINX_COUNT - $SPV_NGINX_COUNT))
STOP_SUCCESS_MSG="spv nginx processes stopped on $(date)"

echo "Not spv nginx count = $NOT_SPV_NGINX_COUNT"

if [ $NOT_SPV_NGINX_COUNT -gt 0 ]; then
    echo "Ready to stop spv nginx processes on $(date)"
    docker exec kobo-docker_nginx_1 sv stop nginx
    echo $STOP_SUCCESS_MSG
    echo $STOP_SUCCESS_MSG >> /var/log/nginx/check-nginx.success.log 2>&1
else
    echo "Keep spv nginx processes alive on $(date)"
fi
