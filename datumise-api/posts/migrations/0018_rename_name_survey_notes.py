from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0017_migrate_survey_statuses"),
    ]

    operations = [
        migrations.RenameField(
            model_name="survey",
            old_name="name",
            new_name="notes",
        ),
        migrations.AlterField(
            model_name="survey",
            name="notes",
            field=models.CharField(
                max_length=160, blank=True, default=""
            ),
        ),
    ]
