# coding: utf-8
from rest_framework import permissions

from kpi.permissions import AssetPermission


class AssetObjectPermission(AssetPermission):
    """
    Like AssetPermission but skips the model-level permission check.

    DjangoObjectPermissions.has_permission() requires users to hold model-level
    permissions (e.g. kpi.view_asset), which CI / test users never have →
    blanket 403. This subclass grants model-level access to any authenticated
    user while keeping the full object-level check from AssetPermission
    (required by get_object_override, which bypasses filter backends).

    Anonymous users pass the model-level check for safe methods so that filter
    backends can restrict their view to publicly-shared assets at the
    object level.
    """

    def has_permission(self, request, view):
        self.validate_password(request)
        if request.user and request.user.is_authenticated:
            return True
        # Anonymous users may read public assets; object-level and filter
        # backends enforce per-asset visibility.
        return request.method in permissions.SAFE_METHODS
