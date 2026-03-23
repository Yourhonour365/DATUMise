import django_filters
from django.utils import timezone
from datetime import timedelta
from .models import Survey, Observation


class SurveyFilter(django_filters.FilterSet):
    client = django_filters.BaseInFilter(field_name="client", lookup_expr="in")
    site = django_filters.BaseInFilter(field_name="site", lookup_expr="in")
    assigned_to = django_filters.BaseInFilter(
        field_name="assigned_to", lookup_expr="in"
    )
    status = django_filters.BaseInFilter(field_name="status", lookup_expr="in")
    visit_requirement = django_filters.BaseInFilter(
        field_name="visit_requirement", lookup_expr="in"
    )
    site_type = django_filters.BaseInFilter(
        field_name="site__site_type", lookup_expr="in"
    )

    class Meta:
        model = Survey
        fields = ["client", "site", "assigned_to", "status", "visit_requirement", "site_type"]


class ObservationFilter(django_filters.FilterSet):
    owner = django_filters.BaseInFilter(field_name="owner", lookup_expr="in")
    survey__client = django_filters.BaseInFilter(
        field_name="survey__client", lookup_expr="in"
    )
    survey__site = django_filters.BaseInFilter(
        field_name="survey__site", lookup_expr="in"
    )
    site_type = django_filters.BaseInFilter(
        field_name="survey__site__site_type", lookup_expr="in"
    )
    time_period = django_filters.CharFilter(method="filter_time_period")

    class Meta:
        model = Observation
        fields = ["owner", "survey__client", "survey__site", "site_type", "time_period"]

    def filter_time_period(self, queryset, name, value):
        now = timezone.now()
        today = now.date()

        if value == "today":
            return queryset.filter(created_at__date=today)
        elif value == "this_week":
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=7)
            return queryset.filter(created_at__date__gte=start, created_at__date__lt=end)
        elif value == "last_week":
            start = today - timedelta(days=today.weekday() + 7)
            end = start + timedelta(days=7)
            return queryset.filter(created_at__date__gte=start, created_at__date__lt=end)
        elif value == "next_week":
            start = today - timedelta(days=today.weekday()) + timedelta(days=7)
            end = start + timedelta(days=7)
            return queryset.filter(created_at__date__gte=start, created_at__date__lt=end)
        elif value == "this_month":
            return queryset.filter(
                created_at__year=today.year, created_at__month=today.month
            )
        elif value == "last_month":
            first = today.replace(day=1)
            last_month_end = first - timedelta(days=1)
            return queryset.filter(
                created_at__year=last_month_end.year,
                created_at__month=last_month_end.month,
            )
        elif value == "next_month":
            if today.month == 12:
                return queryset.filter(
                    created_at__year=today.year + 1, created_at__month=1
                )
            return queryset.filter(
                created_at__year=today.year, created_at__month=today.month + 1
            )
        return queryset
