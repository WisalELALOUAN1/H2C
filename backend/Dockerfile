FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app


COPY requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt


COPY . .


CMD ["bash", "-c", "\
    python manage.py migrate && \
    python create_superuser.py && \
    gunicorn sgrip.wsgi:application --bind 0.0.0.0:8000"]
