# Quickstart: Hybrid AI French Learning Platform

**Prerequisites**: Python 3.12+, Node.js 20+, Docker, Supabase CLI

## 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url> french-learning-app
cd french-learning-app

# Install Python dependencies (backend services)
cd services/api && pip install -e ".[dev]" && cd ../..
cd services/worker && pip install -e ".[dev]" && cd ../..
cd services/shared && pip install -e ".[dev]" && cd ../..

# Install frontend dependencies
cd web && npm install && cd ..
cd mobile && npm install && cd ..
```

## 2. Environment Setup

```bash
# Copy environment templates
cp services/api/.env.example services/api/.env
cp services/worker/.env.example services/worker/.env
cp web/.env.example web/.env
cp mobile/.env.example mobile/.env
```

Required environment variables:

```env
# Supabase (all services)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Hugging Face (api + worker)
HF_API_TOKEN=<your Hugging Face API token>
HF_INFERENCE_ENDPOINT_WHISPER=<endpoint URL>
HF_INFERENCE_ENDPOINT_MISTRAL=<endpoint URL>

# Google Gemini (api + worker)
GOOGLE_GEMINI_API_KEY=<your Gemini API key>

# Google Cloud (worker + scheduler, for Cloud Tasks in production)
GOOGLE_CLOUD_PROJECT=<project-id>
CLOUD_TASKS_QUEUE=ai-jobs
CLOUD_TASKS_LOCATION=europe-west1
WORKER_SERVICE_URL=http://localhost:8001
```

## 3. Start Supabase (Local)

```bash
# Initialize and start local Supabase
supabase init  # Only first time
supabase start

# Apply migrations
supabase db push

# Seed initial data (A1 vocabulary, lessons)
supabase db seed
```

## 4. Run Backend Services

```bash
# Terminal 1: API service
cd services/api
uvicorn src.main:app --reload --port 8000

# Terminal 2: Worker service (local mode, polls for jobs)
cd services/worker
python -m src.main --local
```

## 5. Run Frontend

```bash
# Terminal 3: Web app
cd web
npm run dev
# → http://localhost:5173

# Terminal 4: Mobile app (optional)
cd mobile
npx expo start
# → Scan QR code with Expo Go app
```

## 6. Verify Setup

```bash
# Health check
curl http://localhost:8000/health

# Run backend tests
cd services/api && pytest && cd ../..
cd services/worker && pytest && cd ../..
cd services/shared && pytest && cd ../..

# Run frontend tests
cd web && npm test && cd ..
cd mobile && npm test && cd ..
```

## 7. Local Development Notes

- **Supabase Dashboard**: http://127.0.0.1:54323 (inspect database,
  auth users, storage)
- **API docs**: http://localhost:8000/docs (FastAPI Swagger UI)
- **HF models in dev**: Use Hugging Face Inference API (serverless)
  for development; Inference Endpoints for staging/production.
- **Gemini in dev**: Use Gemini API directly with API key.
- **Audio recording**: Works in Chrome/Firefox on web; requires
  Expo Go app on mobile (iOS simulator does not support microphone).
- **Hot reload**: API (uvicorn --reload), Web (Vite HMR), Mobile
  (Expo fast refresh) all support hot reload.

## 8. Docker (Full Stack)

```bash
# Build and run all services
docker compose up --build

# Services:
# - api:    http://localhost:8000
# - web:    http://localhost:5173
# - supabase: http://localhost:54321
```

## Common Commands

```bash
# Lint (backend)
cd services && ruff check . && mypy .

# Lint (frontend)
cd web && npm run lint
cd mobile && npm run lint

# Format
cd services && ruff format .
cd web && npm run format

# Test with coverage
cd services/api && pytest --cov=src --cov-report=term-missing
cd web && npm run test:coverage

# New migration
supabase migration new <migration_name>

# Reset database
supabase db reset
```
