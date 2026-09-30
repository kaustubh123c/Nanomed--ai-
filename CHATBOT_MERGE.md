# NanoMed AI — Original Chatbot Integration

The previous React chatbot UI has been removed from the active app UI and replaced with the chatbot UI from `NamoMed(3).zip`.

## Included
- Original NamoMed chatbot interface
- New Chat / Clear Chat
- Conversation history restore
- PDF upload, replacement and removal
- PDF-grounded RAG questions
- Markdown tables/comparison cards/charts from the original chatbot UI
- Export conversation
- Gemini-backed answers through the existing FastAPI backend

## API integration
The original chatbot frontend was adapted to the current FastAPI backend:
- `POST /api/chatbot/chat`
- `GET /api/chatbot/history`
- `DELETE /api/chatbot/history`
- `GET /api/chatbot/pdf-status`
- `POST /api/chatbot/upload-pdf`
- `DELETE /api/chatbot/pdf`
- `GET /api/health`

## Local run
Backend:
```cmd
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:
```cmd
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

For deployment, set `VITE_API_URL` on the frontend to the public FastAPI URL, for example:
`https://your-nanomed-api.onrender.com`

Do not commit `backend/.env` or API keys.
