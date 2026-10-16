# Multi-Energy Model Fixes

## What changed
- Multi-material energy sweeps now prefetch live NIST XCOM values in batches of up to 100 energies per request, supporting the UI's 1–200 energy-level range without making a separate initial request for every level.
- NIST XCOM response parsing now compares energies at the same four-decimal precision sent to NIST. This avoids false “energy not found” errors for custom values with more than four decimal places.
- If multiple entered energies round to the same four-decimal NIST input, the returned component values are cached for each original input so the sweep can finish consistently.
- The Energy Levels panel now includes quick-start energy presets and clearer guidance for MeV and live XCOM requirements.

## Run the project
1. Start the backend from `backend` using your existing virtual environment and dependencies: `python -m uvicorn app.main:app --reload --port 8000`.
2. Start the frontend from `frontend`: `npm install` then `npm run dev`.
3. Sign in, open Sim Lab → Multi-Material Simulation Lab, select **NIST XCOM** as the data source, and run the energy sweep.

Live NIST XCOM requires internet access from the backend machine and the `requests` and `beautifulsoup4` packages. If NIST is unavailable, choose **Offline database** to use the local model.
