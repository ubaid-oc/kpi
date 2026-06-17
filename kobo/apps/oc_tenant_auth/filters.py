# coding: utf-8
import logging

from rest_framework import filters

from kobo.apps.oc_tenant_auth.models import KeycloakTenantUser as KeycloakModel
from kobo.apps.oc_tenant_auth.utils import get_subdomain_user_ids
from kpi.filters import KpiObjectPermissionsFilter
from kpi.models import Asset

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


class SubdomainAwareObjectPermissionsFilter(KpiObjectPermissionsFilter):
    """
    OC customization: extends KpiObjectPermissionsFilter to include library
    items (question/block/template/collection) owned by users in the caller's
    Keycloak subdomain. Surveys are still governed by standard permissions.
    Falls back to standard behavior when the user has no Keycloak record.
    """

    _LIBRARY_ASSET_TYPES = ('question', 'block', 'template', 'collection')

    def _get_subdomain_library_pks(self, user):
        try:
            subdomain_user_ids = get_subdomain_user_ids(user)
            return set(
                Asset.objects.filter(
                    owner__in=subdomain_user_ids,
                    asset_type__in=self._LIBRARY_ASSET_TYPES,
                ).values_list('pk', flat=True)
            )
        except Exception:
            return set()

    def filter_queryset(self, request, queryset, view):
        standard = super().filter_queryset(request, queryset, view)
        user = request.user
        if user.is_anonymous:
            return standard
        subdomain_pks = self._get_subdomain_library_pks(user)
        if not subdomain_pks:
            return standard
        # Union of standard-permitted items + subdomain library items,
        # still constrained to what SubdomainFilter already passed us (queryset).
        all_pks = set(standard.values_list('pk', flat=True)) | subdomain_pks
        return queryset.filter(pk__in=all_pks)
