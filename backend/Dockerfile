FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

# exec makes uvicorn PID 1 so it receives SIGTERM from Swarm and shuts down cleanly
CMD ["sh", "-c", "python -m scraper.run && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
