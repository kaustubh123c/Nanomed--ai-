# Gemini Chatbot Setup (NanoMed-AI / RadShield AI)

This project uses the FastAPI backend as a secure proxy to Google Gemini. The Gemini key must stay on the backend; do not place it in React/Vite variables or commit it to GitHub.

## 1. Rotate the key you pasted into chat
That key has been exposed in a chat message. Revoke it in Google AI Studio and create a fresh key. Do not reuse the exposed key.

## 2. Configure the backend locally
1. Copy `backend/.env.example` to `backend/.env`.
2. Set `GEMINI_API_KEY` to the fresh key.
3. Set a strong `JWT_SECRET_KEY`. Keep `MONGO_URI` set to your MongoDB Atlas URI if you use Atlas.
4. Ensure `backend/.env` is ignored by Git (the root `.gitignore` already excludes it).

The backend supports `GEMINI_MODEL` as an optional override. If it is blank, the chatbot tries its configured model chain and can discover supported Flash models from the Google API if configured model names return 404.

## 3. Run locally on Windows
Backend terminal:
```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Frontend terminal:
```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite proxy forwards `/api` requests to `http://127.0.0.1:8000`.

## 4. Deploy frontend and backend
- Deploy `frontend/` to Vercel (Root Directory: `frontend`, Build: `npm run build`, Output: `dist`).
- Deploy `backend/` to Render as a Python web service. Build: `pip install -r requirements.txt`; Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- In Render environment variables, set `GEMINI_API_KEY`, `JWT_SECRET_KEY`, `MONGO_URI`, `MONGO_DB_NAME`, `MAC_DATA_SOURCE`, and `CORS_ORIGINS` (the exact Vercel domain). Never add the Gemini key to Vercel frontend variables.
- In Vercel environment variables, set `VITE_API_URL` to the public Render backend URL, with no trailing slash, then redeploy. The chatbot iframe reads this setting from the React parent and sends its API calls to the backend.
- Confirm the Render backend `/api/health`, `/api/chatbot/status`, and `/docs` endpoints. `/api/chatbot/status` should report `configured: true`. Then send a message in the chatbot.

## Included chatbot capabilities
- Gemini-backed natural language responses through the backend
- Conversation history for the current session/user (in-memory history resets when backend restarts)
- PDF upload and retrieval endpoints
- Material comparison endpoint and project/physics knowledge tools
- Friendly errors for missing key, rate limits, invalid models, and network issues

## Important limitation
The source package was prepared and statically checked, but a live Gemini request requires your newly rotated key and internet access. MongoDB, NIST XCOM, browser CORS/cookies, and production hosting must be verified with your actual credentials and deployment.

## Chatbot formula rendering fix

The embedded assistant at `frontend/public/nanomed-chatbot.html` now loads KaTeX and its auto-render extension to render valid LaTeX in Gemini responses, including chemical subscripts and equations. This is loaded from jsDelivr CDN, so the browser needs internet access for math typesetting. Plain text remains readable if the CDN is unavailable.
