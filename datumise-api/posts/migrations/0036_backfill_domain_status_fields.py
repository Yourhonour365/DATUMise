"""Backfill new domain status fields from legacy status + closure_reason."""
from django.db import migrations


def backfill(apps, schema_editor):
    Survey = apps.get_model("posts", "Survey")
    for s in Survey.objects.all():
        # survey_status
        if s.status == "draft":
            s.survey_status = "draft"
        elif s.status in ("open", "assigned"):
            s.survey_status = "active"
        elif s.status == "completed":
            s.survey_status = "completed"
        elif s.status == "archived":
            cr = s.closure_reason
            if cr == "cancelled":
                s.survey_status = "cancelled"
            elif cr == "abandoned":
                s.survey_status = "abandoned"
            else:
                s.survey_status = "active"

        # survey_record_status
        s.survey_record_status = (
            "archived" if s.status == "archived" else "unarchived"
        )

        # survey_date_status
        s.survey_date_status = (
            "scheduled" if s.scheduled_for else "unscheduled"
        )

        # scheduled_status
        mapping = {
            "self_scheduled": "self_scheduled",
            "provisional": "provisional",
            "booked": "confirmed",
        }
        s.scheduled_status = mapping.get(s.schedule_status)

        # attendance_status
        if s.status == "archived" and s.closure_reason == "missed":
            s.attendance_status = "missed"
        elif s.status == "completed":
            s.attendance_status = "attended"
        else:
            s.attendance_status = "unknown"

        s.save(update_fields=[
            "survey_status",
            "survey_record_status",
            "survey_date_status",
            "scheduled_status",
            "attendance_status",
        ])


class Migration(migrations.Migration):
    dependencies = [
        ("posts", "0035_add_new_domain_status_fields"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
