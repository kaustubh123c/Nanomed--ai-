# NanoMed-AI chatbot fixes and multi-material comparison

## What changed

- Fixed the Material Comparison view so it calls a dedicated backend physics endpoint instead of asking the language model to calculate numeric results in free text.
- Added `POST /api/chatbot/compare-materials`, which evaluates 2–12 materials with the same advanced shielding calculation service used by the platform.
- Comparison output includes MAC, LAC, HVL, MFP, RSE, density, ranking and calculation status. The ranking is based on RSE at the chosen energy and thickness.
- Added an explicit data-source selector: NIST XCOM (online reference) or the offline estimation model. If XCOM cannot return data, select Offline and rerun; offline estimates must not be represented as NIST values.
- Improved HTTP error messages for chat requests and added backend exception logging.
- Fixed the New Chat button's DELETE endpoint.
- Aligned anonymous chat history, PDF state and chat requests to the same browser session cookie.
- Added recent-turn context to Gemini prompts so follow-up questions can refer to earlier messages.
- Added chatbot status feedback when the backend is online but `GEMINI_API_KEY` is not configured.

## Run on Windows

### Backend (CMD window 1)

From the `NanoMed-AI` project folder:

```cmd
cd backend
py -m pip install -r requirements.txt
copy .env.example .env
```

Edit `backend\.env` and set `GEMINI_API_KEY` to your own valid Google AI Studio API key. Do not share or commit this key.

For local comparisons that do not need an online XCOM lookup, set:

```env
MAC_DATA_SOURCE=offline
```

Start the API:

```cmd
py -m uvicorn app.main:app --reload --port 8000
```

If `py` is not recognized, install Python and enable the Python Launcher during setup.

### Frontend (CMD window 2)

```cmd
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/`. Vite proxies `/api` requests to `http://127.0.0.1:8000`.

## Test

- Backend health: `http://localhost:8000/api/health`
- Chatbot status: `http://localhost:8000/api/chatbot/status`
- API documentation: `http://localhost:8000/docs`
- In the chatbot's **Material Comparison** view, load the example, select Offline for a network-independent check, then click Compare.

Example materials are demonstration inputs only. Validate critical shielding results against appropriate experimental data and/or established radiation-transport simulation. The tool is not a substitute for medical-physics approval or regulatory shielding design.
