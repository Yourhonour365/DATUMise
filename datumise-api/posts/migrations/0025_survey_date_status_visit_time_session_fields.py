from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0024_increase_title_max_length"),
    ]

    operations = [
        migrations.AddField(
            model_name="survey",
            name="date_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("self_scheduled", "Self-scheduled"),
                    ("provisional", "Provisional"),
                    ("booked", "Booked"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="survey",
            name="visit_time",
            field=models.CharField(
                blank=True,
                choices=[
                    ("anytime", "Anytime"),
                    ("window", "Time window"),
                    ("appointment", "Appointment"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="surveysession",
            name="session_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("visit", "Visit"),
                    ("revisit", "Revisit"),
                    ("review", "Review"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="surveysession",
            name="notify_required",
            field=models.BooleanField(default=False),
        ),
    ]
