FROM python:3.12-slim

WORKDIR /app

# Copy shared library first (dependency for worker)
COPY services/shared /app/services/shared
COPY services/worker /app/services/worker

# Install both packages in editable mode
RUN pip install --no-cache-dir -e /app/services/shared -e /app/services/worker

EXPOSE 8001

CMD ["uvicorn", "services.worker.src.main:app", "--host", "0.0.0.0", "--port", "8001"]
