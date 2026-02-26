FROM python:3.12-slim

WORKDIR /app

# Copy shared library first (dependency for api)
COPY services/shared /app/services/shared
COPY services/api /app/services/api

# Install both packages in editable mode
RUN pip install --no-cache-dir -e /app/services/shared -e /app/services/api

EXPOSE 8000

CMD ["uvicorn", "services.api.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
