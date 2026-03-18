from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0022_observation_is_draft"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="survey",
            name="status",
            field=models.CharField(
                choices=[
                    ("planned", "Planned"),
                    ("live", "Live"),
                    ("paused", "Paused"),
                    ("submitted", "Submitted"),
                    ("completed", "Completed"),
                    ("missed", "Missed"),
                    ("cancelled", "Cancelled"),
                ],
                default="planned",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="SurveySession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("session_number", models.PositiveIntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("paused", "Paused"),
                            ("completed", "Completed"),
                            ("abandoned", "Abandoned"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                (
                    "started_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "ended_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "started_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="survey_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "survey",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="posts.survey",
                    ),
                ),
            ],
            options={
                "ordering": ["session_number"],
            },
        ),
        migrations.AddConstraint(
            model_name="surveysession",
            constraint=models.UniqueConstraint(
                condition=models.Q(status__in=["active", "paused"]),
                fields=["survey"],
                name="unique_active_session_per_survey",
            ),
        ),
    ]
