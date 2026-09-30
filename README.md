# NanoMed-AI — Full Stack

This package combines the current NanoMed frontend (including the 8-material manual comparison UI) with the original FastAPI backend that provides authentication, MongoDB integration, research/physics APIs, and the Gemini chatbot.

## Structure

- `frontend/` — React + Vite frontend
- `backend/` — FastAPI backend
  - `/api/auth/*` authentication
  - `/api/chatbot/*` AI chatbot
  - materials, experiments, calculators, advanced physics, reports, research workspace/studio, analytics, etc.

## Run locally

### Backend

```cmd
cd backend
py -3.12 -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and set at least `MONGODB_URI` and `JWT_SECRET`. Add `GEMINI_API_KEY` for the chatbot and `GOOGLE_CLIENT_ID` for Google sign-in.

Start:

```cmd
uvicorn app.main:app --reload --port 8000
```

Backend: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs

### Frontend

Open a second terminal:

```cmd
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

The Vite proxy forwards `/api` requests to `http://127.0.0.1:8000`.

## Authentication

The frontend uses:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/google`

## Chatbot

The frontend uses:

- `GET /api/chatbot/status`
- `POST /api/chatbot/chat`
- `POST /api/chatbot/configure` (local development setup)

## Public deployment

Deploy `frontend/` to Vercel and `backend/` as a Python web service (for example Render/Railway). Set the backend environment variables on the hosting provider and set the frontend API URL/proxy configuration appropriately for production.

Never commit `.env` files or API keys.

## Chatbot PDF / Research Paper RAG
The NanoMed AI Assistant now includes the uploaded research-paper chatbot workflow:
- Upload a PDF directly inside the chatbot (15 MB limit).
- Extract and chunk PDF text and create local semantic embeddings.
- Answer relevant questions from the uploaded paper only when matching content is found.
- Show the active uploaded filename and remove it from the chatbot.
- Keep uploaded-document vectors isolated per logged-in user or anonymous browser session.
- Continue using the existing NanoMed assistant, actions, calculations and Gemini integration for normal questions.

### New chatbot API endpoints
- `POST /api/chatbot/upload-pdf`
- `GET /api/chatbot/pdf-status`
- `DELETE /api/chatbot/pdf`
- `POST /api/chatbot/chat`
- `GET /api/chatbot/status`

For production, configure `GEMINI_API_KEY`, `MONGO_URI`, `JWT_SECRET_KEY`, and `CORS_ORIGINS` in the backend host environment. Do not commit `.env` or API keys.
