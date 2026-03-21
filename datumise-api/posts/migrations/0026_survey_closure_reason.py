from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0025_survey_date_status_visit_time_session_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="survey",
            name="closure_reason",
            field=models.CharField(
                blank=True,
                choices=[
                    ("missed", "Missed"),
                    ("abandoned", "Abandoned"),
                    ("cancelled", "Cancelled"),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
