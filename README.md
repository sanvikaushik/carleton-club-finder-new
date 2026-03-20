# Carleton Club Finder (Prototype)

Mobile-first campus club app prototype.

- Frontend: React (Vite)
- Backend: Flask (Python)
- Data: hardcoded mock JSON served by Flask
- No database, no authentication

## Prerequisites

- Node.js (for the frontend)
- Python 3 (for the backend)

## Run Backend (Flask)

```bash
cd server
python -m pip install -r requirements.txt
python app.py
```

Backend runs at: `http://localhost:5000`

## Run Frontend (React)

```bash
cd ..
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## API Endpoints

The frontend calls these Flask endpoints (CORS enabled):

- `GET /api/events`
- `GET /api/events/<id>`
- `GET /api/clubs`
- `GET /api/friends`
- `GET /api/schedule`
- `GET /api/user`
- `GET /api/buildings`

## Notes

- All UI interactions (favorites and “I’m Going”) are local prototype state seeded from `GET /api/user`.
- Schedule conflict filtering on the Explore tab is computed client-side using `GET /api/schedule`.

