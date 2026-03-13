import django_filters
from .models import Survey, Observation


class SurveyFilter(django_filters.FilterSet):
    client = django_filters.BaseInFilter(field_name="client", lookup_expr="in")
    site = django_filters.BaseInFilter(field_name="site", lookup_expr="in")
    assigned_to = django_filters.BaseInFilter(
        field_name="assigned_to", lookup_expr="in"
    )
    status = django_filters.BaseInFilter(field_name="status", lookup_expr="in")
    schedule_type = django_filters.BaseInFilter(
        field_name="schedule_type", lookup_expr="in"
    )

    class Meta:
        model = Survey
        fields = ["client", "site", "assigned_to", "status", "schedule_type"]


class ObservationFilter(django_filters.FilterSet):
    owner = django_filters.BaseInFilter(field_name="owner", lookup_expr="in")
    survey__client = django_filters.BaseInFilter(
        field_name="survey__client", lookup_expr="in"
    )
    survey__site = django_filters.BaseInFilter(
        field_name="survey__site", lookup_expr="in"
    )

    class Meta:
        model = Observation
        fields = ["owner", "survey__client", "survey__site"]
