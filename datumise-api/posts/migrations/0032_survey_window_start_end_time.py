from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0031_survey_survey_weekends_survey_window_days_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='survey',
            name='window_start_end_time',
            field=models.CharField(blank=True, max_length=5, null=True),
        ),
    ]
