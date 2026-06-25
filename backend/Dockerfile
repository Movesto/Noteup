FROM python:3.12-slim

WORKDIR /app

# curl: deployment health check (see terraform ECS task definition).
# tesseract-ocr + ara/eng language data: opt-in PDF OCR import path.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        tesseract-ocr \
        tesseract-ocr-ara \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Default process for the image. docker-compose overrides this with --reload for
# local dev; production (ECS) has no command override and relies on this.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
