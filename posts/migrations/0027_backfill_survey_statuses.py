from django.db import migrations


def backfill_statuses(apps, schema_editor):
    Survey = apps.get_model("posts", "Survey")

    # Legacy → new status mapping
    mapping = {
        "planned": "draft",
        "live": "assigned",
        "paused": "assigned",
        "submitted": "assigned",
        "missed": "archived",
        "cancelled": "archived",
    }

    # Closure reason mapping for terminal statuses
    closure_mapping = {
        "missed": "missed",
        "cancelled": "cancelled",
    }

    # Survey status (new domain) mapping
    survey_status_mapping = {
        "draft": "draft",
        "planned": "draft",
        "open": "active",
        "assigned": "active",
        "live": "active",
        "paused": "active",
        "submitted": "active",
        "completed": "completed",
        "missed": "active",
        "cancelled": "cancelled",
        "archived": "active",
    }

    for survey in Survey.objects.all():
        changed = False
        old_status = survey.status

        # Map legacy status to new status
        if old_status in mapping:
            survey.status = mapping[old_status]
            changed = True

        # Set closure reason for terminal statuses
        if old_status in closure_mapping and not survey.closure_reason:
            survey.closure_reason = closure_mapping[old_status]
            changed = True

        # Set survey_status (new domain field)
        if not survey.survey_status or survey.survey_status == "draft":
            new_ss = survey_status_mapping.get(old_status)
            if new_ss:
                survey.survey_status = new_ss
                changed = True

        if changed:
            survey.save()


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0026_sync_schema_with_datumise_api"),
    ]

    operations = [
        migrations.RunPython(backfill_statuses, migrations.RunPython.noop),
    ]
