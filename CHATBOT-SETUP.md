# NanoMed AI Chatbot - Updated Setup

## What changed
- Replaced the iframe-based chatbot with a simple native React chat UI.
- Added direct `/api/chatbot/chat` integration.
- Added loading state, error messages, Enter-to-send, Shift+Enter, clear chat, PDF upload/remove, and starter questions.
- Fixed anonymous chat/PDF session isolation.
- Updated the Gemini fallback model to `gemini-2.5-flash-lite`.

## Backend
From `backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example` and set:

```env
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

## Frontend
From `frontend`:

```powershell
npm install
npm run dev
```

If the frontend and backend run on different ports, set:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

Otherwise the frontend uses `/api` by default.

## Important
Do not put the Gemini API key in React/frontend code. Keep it in `backend/.env`.
