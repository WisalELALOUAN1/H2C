FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copie requirements.txt
COPY requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt

# Copie tout le code du backend (app, manage.py, etc.)
COPY . .

# Lancement du serveur Gunicorn pointant sur sgrip
CMD ["gunicorn", "sgrip.wsgi:application", "--bind", "0.0.0.0:8000"]
