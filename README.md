# Raw Materials Analysis Tool

A full-stack costing & purchasing analysis app — Flask backend + React (Vite) frontend.

## Project structure

```
rm-tool/
├── backend/
│   ├── app.py              ← Flask API + Excel export
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── App.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      ← dev proxy: /api & /export → :5050
└── catalyst.yaml           ← Catalyst deployment config
```

## Local development

**Backend** (terminal 1):
```bash
cd backend
pip install -r requirements.txt
FLASK_ENV=development python app.py   # runs on :5050
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev     # Vite dev server on :5173, proxies /api + /export → :5050
```

Open http://localhost:5173.

## Production build (test locally)

```bash
cd frontend && npm run build     # outputs to frontend/dist/
cd ../backend
FLASK_ENV=production python app.py   # Flask serves dist/ at /
```

Open http://localhost:5050.

## Catalyst deployment

```bash
# From repo root:
catalyst deploy
```

The `catalyst.yaml` installs Python deps, builds the React app, then starts
gunicorn. Flask serves the SPA at `/` and the API at `/api/*`.

### Persistent storage

By default the SQLite database lives at `backend/analyses.db`.  
If Catalyst provides a persistent volume, set:

```yaml
env:
  DB_PATH: /data/analyses.db
```

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analyses` | List all saved analyses |
| POST | `/api/analyses` | Save / update an analysis |
| GET | `/api/analyses/:id` | Load one analysis |
| DELETE | `/api/analyses/:id` | Delete an analysis |
| POST | `/export` | Generate & download `.xlsx` |
