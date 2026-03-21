from django.db import migrations, models


def migrate_survey_statuses(apps, schema_editor):
    Survey = apps.get_model("posts", "Survey")
    SurveySession = apps.get_model("posts", "SurveySession")

    for survey in Survey.objects.all():
        old_status = survey.status
        if old_status == "planned":
            survey.status = "open"
        elif old_status in ("live", "paused", "submitted"):
            survey.status = "assigned"
        elif old_status == "completed":
            pass  # no change
        elif old_status == "missed":
            survey.status = "archived"
            survey.closure_reason = "missed"
        elif old_status == "cancelled":
            has_sessions = SurveySession.objects.filter(
                survey=survey
            ).exists()
            survey.status = "archived"
            survey.closure_reason = "abandoned" if has_sessions else "cancelled"
        # "draft", "open", "assigned", "archived" already in new domain.
        survey.save()


def reverse_migrate_survey_statuses(apps, schema_editor):
    Survey = apps.get_model("posts", "Survey")

    for survey in Survey.objects.all():
        if survey.status == "open":
            survey.status = "planned"
            survey.save()
        elif survey.status == "assigned":
            survey.status = "live"
            survey.save()
        elif survey.status == "archived":
            if survey.closure_reason == "missed":
                survey.status = "missed"
            else:
                survey.status = "cancelled"
            survey.closure_reason = None
            survey.save()
        # "completed" and "draft" need no change.


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0026_survey_closure_reason"),
    ]

    operations = [
        migrations.AlterField(
            model_name="survey",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("open", "Open"),
                    ("assigned", "Assigned"),
                    ("completed", "Completed"),
                    ("archived", "Archived"),
                ],
                default="open",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            migrate_survey_statuses,
            reverse_migrate_survey_statuses,
        ),
    ]
