from rest_framework import permissions


class IsActiveUser(permissions.BasePermission):
    """Block archived users from accessing the API."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return True  # Let auth handlers deal with anonymous users
        try:
            return request.user.profile.status == "active"
        except Exception:
            return True


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Allow read-only access for everyone,
    but write access only to the object's owner.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner == request.user


class IsCommentOwnerOrObservationOwner(permissions.BasePermission):
    """
    Comment owner can edit and delete.
    Observation owner can delete (but not edit) other users' comments.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if obj.owner == request.user:
            return True
        if request.method == "DELETE" and obj.observation.owner == request.user:
            return True
        return False