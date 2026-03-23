from rest_framework import serializers
from .models import Observation, Comment, Survey, Client, ClientSite, Profile
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string

# Statuses in which a survey is actively being worked on and observations
# may be created or edited.
_ACTIVE_SURVEY_STATUSES = {"assigned"}

# The single stored status that represents a closed survey in the new model.
_TERMINAL_SURVEY_STATUSES = {"archived"}

# Maps every accepted incoming status string to its stored DB value.
# Accepts both legacy frontend values and new domain values.
_STATUS_TRANSLATION = {
    "planned": "open",
    "live": "assigned",
    "paused": "assigned",
    "submitted": "assigned",
    "missed": "archived",
    "cancelled": "archived",
    "draft": "draft",
    "open": "open",
    "assigned": "assigned",
    "completed": "completed",
    "archived": "archived",
}

# All accepted status values (old + new) for write-serializer validation.
_ALL_SURVEY_STATUS_VALUES = list(_STATUS_TRANSLATION.keys())


class TeamMemberSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role", read_only=True)
    role_display = serializers.CharField(source="profile.get_role_display", read_only=True)
    phone = serializers.CharField(source="profile.phone", read_only=True)
    status = serializers.CharField(source="profile.status", read_only=True)
    status_display = serializers.CharField(source="profile.get_status_display", read_only=True)
    name = serializers.SerializerMethodField()
    survey_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            "id", "username", "name", "email",
            "role", "role_display", "phone",
            "status", "status_display", "survey_count",
        ]

    def get_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username


class TeamMemberWriteSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES, required=False
    )
    status = serializers.ChoiceField(
        choices=Profile.STATUS_CHOICES, required=False
    )

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()
        profile = instance.profile
        if "phone" in validated_data:
            profile.phone = validated_data["phone"]
        if "role" in validated_data:
            profile.role = validated_data["role"]
        if "status" in validated_data:
            profile.status = validated_data["status"]
        profile.save()
        return instance

class TeamMemberCreateSerializer(serializers.Serializer):
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES, required=False
    )
    status = serializers.ChoiceField(
        choices=Profile.STATUS_CHOICES, required=False, default="active"
    )

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            email=validated_data.get("email", ""),
            password=get_random_string(16),
        )
        profile = user.profile
        if "phone" in validated_data:
            profile.phone = validated_data["phone"]
        if "role" in validated_data:
            profile.role = validated_data["role"]
        if "status" in validated_data:
            profile.status = validated_data["status"]
        profile.save()
        return user


class CustomRegisterSerializer(RegisterSerializer):
    def validate_email(self, email):
        
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "A user with that email already exists."
            )
        return email



class ObservationSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    owner_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    survey_name = serializers.SerializerMethodField()
    internal_note = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    comment_likes_count = serializers.SerializerMethodField()
    site_name = serializers.SerializerMethodField()
    site_postcode = serializers.SerializerMethodField()
    survey_status = serializers.SerializerMethodField()
    survey_current_session_status = serializers.SerializerMethodField()

    def get_survey_name(self, obj):
        return str(obj.survey) if obj.survey else None

    def get_site_name(self, obj):
        if obj.survey and obj.survey.site:
            return obj.survey.site.name
        return ""

    def get_site_postcode(self, obj):
        if obj.survey and obj.survey.site:
            return obj.survey.site.postcode or ""
        return ""

    def get_survey_status(self, obj):
        if not obj.survey:
            return None
        return obj.survey.survey_status or obj.survey.status

    def get_survey_current_session_status(self, obj):
        if not obj.survey:
            return None
        session = obj.survey.sessions.filter(
            status__in=["active", "paused"]
        ).first()
        return session.status if session else None

    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Observation
        fields = [
            "id",
            "owner",
            "owner_name",
            "survey",
            "survey_name",
            "site_name",
            "site_postcode",
            "title",
            "description",
            "is_draft",
            "image",
            "created_at",
            "updated_at",
            "comment_count",
            "reply_count",
            "is_owner",
            "likes_count",
            "is_liked",
            "internal_note",
            "can_edit",
            "comment_likes_count",
            "survey_status",
            "survey_current_session_status",
        ]

    def get_owner_name(self, obj):
        u = obj.owner
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return request and request.user == obj.owner

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or request.user != obj.owner:
            return False
        if obj.survey and obj.survey.status not in _ACTIVE_SURVEY_STATUSES:
            return False
        return True

    def get_comment_likes_count(self, obj):
        total = 0
        for comment in obj.comments.all():
            total += comment.likes.count()
        return total

    def get_internal_note(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        if request.user == obj.owner or request.user.is_staff:
            return obj.description
        return ""

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        return request and request.user.is_authenticated and obj.likes.filter(id=request.user.id).exists()

class CommentSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    is_owner = serializers.SerializerMethodField()
    is_observation_owner = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()


    class Meta:
        model = Comment
        fields = [
            "id",
            "observation",
            "parent",
            "owner",
            "content",
            "created_at",
            "is_owner",
            "is_observation_owner",
            "likes_count",
            "is_liked",
        ]

        read_only_fields = [
            "owner",
            "created_at",
            "is_owner",
            "is_observation_owner",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.owner)

    def get_is_observation_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.observation.owner)

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get("request")
        return request and request.user.is_authenticated and obj.likes.filter(id=request.user.id).exists()
    
class SurveySerializer(serializers.ModelSerializer):

    observation_count = serializers.IntegerField(read_only=True)
    real_observation_count = serializers.IntegerField(read_only=True, default=0)
    draft_observation_count = serializers.IntegerField(read_only=True, default=0)
    total_likes_count = serializers.IntegerField(read_only=True)
    total_comments_count = serializers.IntegerField(read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    visit_requirement_display = serializers.CharField(
        source="get_visit_requirement_display", read_only=True
    )
    # New domain fields (read-only, additive)
    survey_status = serializers.CharField(read_only=True)
    survey_record_status = serializers.CharField(read_only=True)
    survey_date_status = serializers.CharField(read_only=True)
    scheduled_status = serializers.CharField(read_only=True)
    attendance_status = serializers.CharField(read_only=True)
    session_count = serializers.SerializerMethodField()
    current_session_number = serializers.SerializerMethodField()
    current_session_type = serializers.SerializerMethodField()
    current_session_notify_required = serializers.SerializerMethodField()
    current_session_status = serializers.SerializerMethodField()
    is_urgent = serializers.BooleanField(source="urgent", read_only=True)

    def _get_active_session(self, obj):
        if not hasattr(obj, "_cached_active_session"):
            obj._cached_active_session = obj.sessions.filter(
                status__in=["active", "paused"]
            ).first()
        return obj._cached_active_session

    def get_status_display(self, obj):
        if obj.status == "assigned":
            session = self._get_active_session(obj)
            if session:
                return "Paused" if session.status == "paused" else "Live"
            return "Submitted"
        if obj.status == "archived":
            return {
                "missed": "Missed",
                "cancelled": "Cancelled",
                "abandoned": "Abandoned",
            }.get(obj.closure_reason, "Archived")
        if obj.status == "completed":
            return "Completed"
        if obj.status == "draft":
            return "Draft"
        return ""

    def get_session_count(self, obj):
        return obj.sessions.count()

    def get_current_session_number(self, obj):
        session = self._get_active_session(obj)
        return session.session_number if session else None

    def get_current_session_type(self, obj):
        session = self._get_active_session(obj)
        return session.session_type if session else None

    def get_current_session_notify_required(self, obj):
        session = self._get_active_session(obj)
        return session.notify_required if session else None

    def get_current_session_status(self, obj):
        session = self._get_active_session(obj)
        return session.status if session else None

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()
    site_name = serializers.CharField(source="site.name", read_only=True, default="")
    site_postcode = serializers.CharField(source="site.postcode", read_only=True, default="")
    site_address = serializers.SerializerMethodField()

    def get_site_address(self, obj):
        if not obj.site:
            return ""
        parts = [obj.site.address_line_1, obj.site.address_line_2, obj.site.city, obj.site.county, obj.site.postcode]
        return ", ".join(p for p in parts if p)

    client_id = serializers.IntegerField(source="client.id", read_only=True)
    site_id = serializers.IntegerField(source="site.id", read_only=True)
    assigned_to = serializers.StringRelatedField()
    assigned_to_id = serializers.IntegerField(source="assigned_to.id", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField()
    is_owner = serializers.SerializerMethodField()
    is_surveyor = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    def get_assigned_to_name(self, obj):
        u = obj.assigned_to
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_name(self, obj):
        return str(obj)

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.created_by)

    def get_is_surveyor(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.assigned_to)

    def get_is_admin(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.profile.role == "admin"
        )

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "notes",
            "client",
            "client_id",
            "site",
            "site_id",
            "site_name",
            "site_postcode",
            "site_address",
            "created_by",
            "assigned_to",
            "assigned_to_id",
            "assigned_to_name",
            "status",
            "status_display",
            "visit_requirement",
            "visit_requirement_display",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "is_urgent",
            "schedule_status",
            "visit_time",
            "closure_reason",
            "notify_required",
            "arrival_action",
            "departure_action",
            "site_requirements",
            "other_attendees",
            "window_end_date",
            "window_end_time",
            "window_start_end_time",
            "window_days",
            "survey_weekends",
            "access_notes",
            "site_contact_name",
            "site_contact_phone",
            "site_contact_email",
            "created_at",
            "observation_count",
            "real_observation_count",
            "draft_observation_count",
            "total_likes_count",
            "total_comments_count",
            "session_count",
            "current_session_number",
            "current_session_type",
            "current_session_notify_required",
            "current_session_status",
            "is_owner",
            "is_surveyor",
            "is_admin",
            "survey_status",
            "survey_record_status",
            "survey_date_status",
            "scheduled_status",
            "attendance_status",
        ]


class SurveyWriteSerializer(serializers.ModelSerializer):
    # Accept both legacy frontend values and new stored values.
    # REMOVE IN PHASE 4/5 and replace with the new STATUS_CHOICES only.
    status = serializers.ChoiceField(
        choices=[(v, v) for v in _ALL_SURVEY_STATUS_VALUES],
        required=False,
    )

    class Meta:
        model = Survey
        fields = [
            "id",
            "notes",
            "client",
            "site",
            "assigned_to",
            "status",
            "visit_requirement",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "schedule_status",
            "visit_time",
            "closure_reason",
            "notify_required",
            "arrival_action",
            "departure_action",
            "site_requirements",
            "other_attendees",
            "window_end_date",
            "window_end_time",
            "window_start_end_time",
            "window_days",
            "survey_weekends",
        ]

    def validate(self, attrs):
        instance = self.instance
        new_status = attrs.get("status", instance.status if instance else "draft")
        # For assigned_to, distinguish between "not in payload" and "set to null"
        if "assigned_to" in attrs:
            new_assigned = attrs["assigned_to"]
        else:
            new_assigned = instance.assigned_to if instance else None

        # "assigned" (new domain value) also requires an assignee.
        requires_assignment = {
            "live", "paused", "submitted", "completed", "missed", "assigned",
        }
        if new_status in requires_assignment and new_assigned is None:
            raise serializers.ValidationError(
                {"status": f"Survey must be assigned before it can be {new_status}."}
            )

        if "assigned_to" in attrs and attrs["assigned_to"] is None:
            if new_status not in (
                "planned", "cancelled", "open", "draft", "archived",
            ):
                raise serializers.ValidationError(
                    {"assigned_to": "Cannot unassign a survey unless it is planned or cancelled."}
                )

        if "assigned_to" in attrs and attrs["assigned_to"] is not None:
            if attrs["assigned_to"].profile.role != "surveyor":
                raise serializers.ValidationError(
                    {"assigned_to": "Only surveyors can be assigned to surveys."}
                )

        # Resolve site from payload or existing instance
        if "site" in attrs:
            new_site = attrs["site"]
        else:
            new_site = instance.site if instance else None

        # Resolve client: explicit payload takes priority;
        # if site is being changed, re-derive from the new site;
        # otherwise fall back to the existing instance client.
        if "client" in attrs:
            new_client = attrs["client"]
        elif "site" in attrs:
            new_client = attrs["site"].client if attrs["site"] else None
        elif instance and instance.client:
            new_client = instance.client
        elif new_site:
            new_client = new_site.client
        else:
            new_client = None

        # Inject derived client so perform_create receives it in validated_data
        if new_client:
            attrs["client"] = new_client

        # When archiving, skip integrity checks that only apply to active surveys
        effective_new_status = _STATUS_TRANSLATION.get(new_status, new_status)
        is_archiving = effective_new_status in _TERMINAL_SURVEY_STATUSES

        if not is_archiving:
            if new_site is None:
                raise serializers.ValidationError(
                    {"site": "A survey must have a site."}
                )

            if new_site.status != "active":
                raise serializers.ValidationError(
                    {"site": "Surveys cannot be created for inactive sites."}
                )

            if new_client is None or new_client.status != "active":
                raise serializers.ValidationError(
                    {"client": "Surveys cannot be created for inactive clients."}
                )

            if new_site.client_id != new_client.id:
                raise serializers.ValidationError(
                    {"site": "The selected site does not belong to the selected client."}
                )

            new_visit_req = attrs.get(
                "visit_requirement",
                instance.visit_requirement if instance else None,
            )
            new_schedule_status = attrs.get(
                "schedule_status",
                instance.schedule_status if instance else None,
            )
            if new_visit_req == "unrestricted":
                attrs["schedule_status"] = "self_scheduled"
            elif new_visit_req == "prearranged" and new_schedule_status not in (
                None, "provisional", "booked"
            ):
                raise serializers.ValidationError(
                    {
                        "schedule_status": (
                            "Schedule status must be provisional or booked "
                            "for pre-arranged surveys."
                        )
                    }
                )

        if "closure_reason" in attrs and attrs["closure_reason"]:
            effective_status = _STATUS_TRANSLATION.get(new_status, new_status)
            if effective_status not in _TERMINAL_SURVEY_STATUSES:
                raise serializers.ValidationError(
                    {
                        "closure_reason": (
                            "Closure reason can only be set when the survey"
                            " is archived."
                        )
                    }
                )

        if (
            effective_new_status == "open"
            and instance is not None
            and instance.status == "draft"
        ):
            errors = {}
            if new_site is None:
                errors["site"] = "A site is required to open a survey."
            if new_client is None:
                errors["client"] = "A client is required to open a survey."
            new_visit_req = attrs.get(
                "visit_requirement", instance.visit_requirement
            )
            if not new_visit_req:
                errors["visit_requirement"] = (
                    "Visit requirement must be set to open a survey."
                )
            new_visit_time = attrs.get(
                "visit_time", instance.visit_time
            )
            if not new_visit_time:
                errors["visit_time"] = (
                    "Visit pattern must be set to open a survey."
                )
            if new_visit_time == "window":
                new_scheduled = attrs.get(
                    "scheduled_for", instance.scheduled_for
                )
                if not new_scheduled:
                    errors["scheduled_for"] = (
                        "A date is required when visit pattern is window."
                    )
            new_arrival = attrs.get(
                "arrival_action", instance.arrival_action
            )
            if not new_arrival:
                errors["arrival_action"] = (
                    "Arrival action is required to open a survey."
                )
            new_departure = attrs.get(
                "departure_action", instance.departure_action
            )
            if not new_departure:
                errors["departure_action"] = (
                    "Departure action is required to open a survey."
                )
            if instance.sessions.exists():
                errors["status"] = (
                    "Surveys with sessions cannot be moved to open."
                )
            if errors:
                raise serializers.ValidationError(errors)

        return attrs


class SurveyDetailSerializer(serializers.ModelSerializer):
    observations = ObservationSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    visit_requirement_display = serializers.CharField(
        source="get_visit_requirement_display", read_only=True
    )
    session_count = serializers.SerializerMethodField()
    current_session_number = serializers.SerializerMethodField()
    current_session_type = serializers.SerializerMethodField()
    current_session_notify_required = serializers.SerializerMethodField()
    current_session_status = serializers.SerializerMethodField()
    is_urgent = serializers.BooleanField(source="urgent", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    # New domain fields (read-only, additive)
    survey_status = serializers.CharField(read_only=True)
    survey_record_status = serializers.CharField(read_only=True)
    survey_date_status = serializers.CharField(read_only=True)
    scheduled_status = serializers.CharField(read_only=True)
    attendance_status = serializers.CharField(read_only=True)

    def _get_active_session(self, obj):
        if not hasattr(obj, "_cached_active_session"):
            obj._cached_active_session = obj.sessions.filter(
                status__in=["active", "paused"]
            ).first()
        return obj._cached_active_session

    def get_assigned_to_name(self, obj):
        u = obj.assigned_to
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_status_display(self, obj):
        if obj.status == "assigned":
            session = self._get_active_session(obj)
            if session:
                return "Paused" if session.status == "paused" else "Live"
            return "Submitted"
        if obj.status == "archived":
            return {
                "missed": "Missed",
                "cancelled": "Cancelled",
                "abandoned": "Abandoned",
            }.get(obj.closure_reason, "Archived")
        if obj.status == "completed":
            return "Completed"
        if obj.status == "draft":
            return "Draft"
        return ""

    def get_session_count(self, obj):
        return obj.sessions.count()

    def get_current_session_number(self, obj):
        session = self._get_active_session(obj)
        return session.session_number if session else None

    def get_current_session_type(self, obj):
        session = self._get_active_session(obj)
        return session.session_type if session else None

    def get_current_session_notify_required(self, obj):
        session = self._get_active_session(obj)
        return session.notify_required if session else None

    def get_current_session_status(self, obj):
        session = self._get_active_session(obj)
        return session.status if session else None

    client = serializers.StringRelatedField()
    site = serializers.StringRelatedField()
    site_name = serializers.CharField(source="site.name", read_only=True, default="")
    site_postcode = serializers.CharField(source="site.postcode", read_only=True, default="")

    client_id = serializers.IntegerField(source="client.id", read_only=True)
    site_id = serializers.IntegerField(source="site.id", read_only=True)
    assigned_to = serializers.StringRelatedField()
    assigned_to_id = serializers.IntegerField(source="assigned_to.id", read_only=True)
    created_by = serializers.StringRelatedField()
    is_owner = serializers.SerializerMethodField()
    is_surveyor = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    def get_name(self, obj):
        return str(obj)

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.created_by)

    def get_is_surveyor(self, obj):
        request = self.context.get("request")
        return bool(request and request.user == obj.assigned_to)

    def get_is_admin(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and request.user.profile.role == "admin"
        )

    class Meta:
        model = Survey
        fields = [
            "id",
            "name",
            "notes",
            "client",
            "client_id",
            "site",
            "site_name",
            "site_postcode",
            "site_id",
            "created_by",
            "assigned_to",
            "assigned_to_id",
            "assigned_to_name",
            "status",
            "status_display",
            "visit_requirement",
            "visit_requirement_display",
            "scheduled_for",
            "due_by",
            "client_present",
            "urgent",
            "is_urgent",
            "schedule_status",
            "visit_time",
            "closure_reason",
            "notify_required",
            "arrival_action",
            "departure_action",
            "window_end_date",
            "window_end_time",
            "window_start_end_time",
            "window_days",
            "survey_weekends",
            "access_notes",
            "site_contact_name",
            "site_contact_phone",
            "site_contact_email",
            "created_at",
            "observations",
            "session_count",
            "current_session_number",
            "current_session_type",
            "current_session_notify_required",
            "current_session_status",
            "is_owner",
            "is_surveyor",
            "is_admin",
            "survey_status",
            "survey_record_status",
            "survey_date_status",
            "scheduled_status",
            "attendance_status",
        ]


class ClientSiteSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source="client.name")
    survey_count = serializers.IntegerField(read_only=True)
    site_type_display = serializers.CharField(source="get_site_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ClientSite
        fields = [
            "id", "client", "client_name", "name", "site_type", "site_type_display",
            "address_line_1", "address_line_2", "city", "county",
            "postcode", "contact_name", "contact_phone", "contact_email",
            "access_notes", "status", "status_display", "survey_count", "created_at",
        ]


class ClientSerializer(serializers.ModelSerializer):
    site_count = serializers.IntegerField(read_only=True)
    survey_count = serializers.IntegerField(read_only=True)
    client_type_display = serializers.CharField(source="get_client_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "name", "client_type", "client_type_display",
            "account_manager", "contact_name", "contact_email", "contact_phone",
            "billing_address", "status", "status_display",
            "site_count", "survey_count", "created_at",
        ]
