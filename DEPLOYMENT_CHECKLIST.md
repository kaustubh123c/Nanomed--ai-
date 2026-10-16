# NanoMed-AI / RadShield AI — deployment and database checklist

## Security first
The Atlas password was pasted into a chat. Treat it as exposed: in MongoDB Atlas, rotate the password for `radshieldai_db_user` before using this deployment. Then set `MONGO_URI` in your local `backend/.env` and in the backend hosting provider's secret environment variables. Do not put database credentials in React/Vite variables, Git, screenshots, or frontend code. If the password contains URI-reserved characters (`@`, `:`, `/`, `?`, `#`, `[`, `]`, `%`), percent-encode the password component.

## MongoDB Atlas setup
1. In Atlas, open **Database Access** and confirm `radshieldai_db_user` has read/write access to the `nanomed_ai` database (or appropriate project-level read/write permissions).
2. Under **Network Access**, allow the backend's outbound IP. For local testing, add your current public IP. Avoid `0.0.0.0/0` unless you understand the exposure and compensate with strong credentials. Some managed hosts have changing outbound IPs; check their current networking guidance.
3. Put the rotated connection string into `backend/.env` as `MONGO_URI=...`. The URI can use `/nanomed_ai` as the database path; the application also uses `MONGO_DB_NAME=nanomed_ai`.
4. Start the backend and visit `/api/health/database`. A successful response identifies the engine and database name but never returns the URI.

## Local Windows run
### Terminal 1 — backend
```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
Open `http://127.0.0.1:8000/docs`, then check `http://127.0.0.1:8000/api/health/database`.

### Terminal 2 — frontend
```powershell
cd frontend
npm ci
npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` to the local backend.

## Deploy backend to Render
This repo includes `render.yaml` and `backend/Dockerfile`. Create a new Blueprint from the repository. Add these environment variables in Render: `MONGO_URI` (rotated secret), `JWT_SECRET_KEY` (random secret), `MONGO_DB_NAME=nanomed_ai`, `CORS_ORIGINS` (your exact deployed frontend origin), and optional `GEMINI_API_KEY` / `GOOGLE_CLIENT_ID`. After deployment, verify `/api/health` and `/api/health/database`.

## Deploy frontend to Vercel
Import the repository and set **Root Directory** to `frontend`. Add `VITE_API_URL=https://YOUR-BACKEND-HOST/api` and `VITE_GOOGLE_CLIENT_ID` if using Google sign-in. Deploy, then replace the backend's `CORS_ORIGINS` with the exact Vercel origin (for example `https://your-project.vercel.app`). Redeploy the backend after changing environment variables.

## Smoke tests
- `GET /api/health` — backend process responds.
- `GET /api/health/database` — database connection succeeds.
- `GET /docs` — routes load in OpenAPI.
- Register a test user using `POST /api/auth/register`, then log in with `POST /api/auth/login`. Use a test-only account and do not reuse passwords.
- Create/list a material and a test simulation in the UI; refresh to verify persisted records.
- In Multi-Energy, use sample energies such as `0.1, 0.5, 1.0, 2.0` MeV and compare results with the selected data source.
- If XCOM fails, check backend outbound internet, inspect server logs, and temporarily set `MAC_DATA_SOURCE=offline` to test the fallback. Do not describe offline model results as live NIST data.

## Notes
- This is a research/education platform, not a clinical treatment-planning system. Validate physics calculations against trusted reference data before scientific or clinical use.
- Deployment cannot be declared successful until real Atlas connectivity, OAuth configuration, external XCOM access, and production hosting have been tested with your own credentials.
