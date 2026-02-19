# Stock Game Dashboard

Three-column single-page dashboard for your stock game.

## Layout
- Column 1: Tom
- Column 2: Joe
- Column 3: Nic (empty placeholder for now)

## Performance baseline
- Start date is fixed to **January 30, 2026**.
- Each person starts with **GBP 100** total, split by their portfolio percentages.
- Each column shows:
  - Start value
  - Current value
  - P/L in pounds
  - P/L in percent
  - Return trend graph from Jan 30, 2026 start cost to current cost

## Live data
- Market data is fetched from Yahoo Finance through the backend proxy.
- Click `Refresh Live Data`.

## Run locally
1. Start the local server:
   - `python3 /Users/tomlandy/Desktop/Codex/stock-game-dashboard/server.py`
2. Open:
   - `http://127.0.0.1:8787`

## Deploy online (Render)
1. Create a new GitHub repo and push this folder:
   - `/Users/tomlandy/Desktop/Codex/stock-game-dashboard`
2. In Render, click `New +` -> `Blueprint`.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and create the web service automatically.
5. Once deployed, open the Render URL and use the dashboard normally.

Notes:
- `server.py` binds to `0.0.0.0:$PORT` in cloud and `8787` locally.
- Keep using the server approach; browser-only Yahoo calls are unreliable due to CORS/rate limits.
