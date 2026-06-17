# coding: utf-8
import logging

from rest_framework import filters

from kobo.apps.oc_tenant_auth.models import KeycloakTenantUser as KeycloakModel
from kobo.apps.oc_tenant_auth.utils import get_subdomain_user_ids

logger = logging.getLogger(__name__)


class SubdomainFilter(filters.BaseFilterBackend):
    """
    Restricts asset/collection querysets to users in the caller's Keycloak
    subdomain (tenant). No-ops gracefully when the caller has no Keycloak
    record (anonymous users, test environments without Keycloak).
    """

    SUPPORTED_MODELS = ('asset', 'collection')

    def filter_queryset(self, request, queryset, view):
        user = request.user
        if user.is_anonymous:
            return queryset
        if queryset.model._meta.model_name not in self.SUPPORTED_MODELS:
            return queryset
        try:
            subdomain_user_ids = get_subdomain_user_ids(user)
            return queryset.filter(owner__in=subdomain_user_ids)
        except KeycloakModel.DoesNotExist:
            # No Keycloak record — fall through to standard permission filtering
            return queryset
        except Exception:
            logger.exception(
                'Unexpected error while filtering queryset by subdomain '
                'for user %s', user
            )
            raise
