FROM python:3.12-slim

WORKDIR /app

# curl: backend container health check (used by the compose healthcheck).
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

# Default process for the image. docker-compose (dev) overrides this with --reload;
# production runs this image as-is.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
