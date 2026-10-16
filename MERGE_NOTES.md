# NanoMed AI — merge, chatbot fix, redesign

## 1. Chatbot fixes (backend)
- **Retired models.** `gemini-2.5-flash` is shut down by Google on 2026-10-16 and the old fallback name was unreliable.
  Model chain is now `GEMINI_MODEL` (default `gemini-3.5-flash`) -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash` -> `gemini-2.5-flash-lite`.
  If every name returns 404, the backend asks Google's ListModels API which Flash model your key can use and uses that.
- **Session bug.** `/api/chatbot/chat` generated a new anonymous session id twice per request, so the cookie never matched the id used for history/PDF state. Fixed (one id per request, cookie always set).
- **Login token.** The chatbot iframe now sends your `nanomed_token`, so create/log actions and per-user history work when you are signed in.
- **Non-blocking.** The Gemini function-calling step no longer blocks the server's event loop.
- **Safer startup.** RAG packages (sentence-transformers, langchain) are imported lazily; if they are missing the chatbot still answers, only PDF Q&A is skipped.
- Still required: a valid `GEMINI_API_KEY` in `backend/.env`. Check `http://localhost:8000/api/chatbot/status`.

## 2. Multi-material + multi-energy (merged)
- Backend: `POST /api/calculators/advanced/multi-material-sweep` added to `physics_advanced.py`.
- Frontend: **Sim Lab now has two tabs** — *Beam Simulation* (your original) and *Multi-Material · Multi-Energy* (up to 8 elements by weight %, up to 200 energies, table, log-scale chart, CSV export).
- The multi-energy version's chatbot files were **not** merged. The chatbot is the fixed one from the Chatbot-Fixed build.

## 3. Frontend redesign ("Aurora Clinical")
- New palette and a single consolidated `index.css` (replaces ~12 stacked override layers). Tailwind color tokens remapped, so every internal page re-themes automatically.
- New landing page (bento features, responsive beam diagram), new login/register shell, new sidebar/topbar styling.
- Removed the invented testimonials from the landing page (they were placeholder quotes attributed to made-up people).

## Run
```
cd backend && py -m pip install -r requirements.txt && copy .env.example .env   (set GEMINI_API_KEY)
py -m uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```
