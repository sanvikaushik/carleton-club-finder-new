# SQL Backend Refactor

## Backend structure

```text
server/
  app.py
  extensions.py
  models.py
  routes.py
  seed.py
  temp_data.py
  mock_data.py
  requirements.txt
```

## Database

- Engine: SQLite
- ORM: Flask + SQLAlchemy
- Database file:
  - `server/instance/clubfinder.sqlite3`
- Temporary seed data:
  - `server/temp_data.py`

## Tables

- `buildings`
- `clubs`
- `events`
- `event_tags`
- `users`
- `friends`
- `favorites`
- `event_attendees`
- `schedule_classes`

## API routes

### `GET /api/events`

Query params:

- `filter=now|upcoming|today|myclubs`
- `user_id=u1`
- `schedule_conflicts=true|false`
- `building_id=<id>`
- `club_id=<id>`

Response:

```json
[
  {
    "id": "e_nicol_now",
    "title": "AI Society Workshop: Intro to ML",
    "clubId": "club-ai",
    "building": "nicol",
    "floor": 3,
    "room": "Nicol-312",
    "startTime": "2026-03-21T12:15:00-04:00",
    "endTime": "2026-03-21T13:45:00-04:00",
    "attendanceCount": 58,
    "capacity": 80,
    "foodAvailable": true,
    "foodType": "Pizza",
    "description": "A practical session on machine learning basics and quick demos.",
    "tags": ["machine-learning", "workshop"],
    "friendsGoing": ["f1", "f2", "f5"]
  }
]
```

### `GET /api/events/<event_id>`

Response: same shape as a single event object above.

### `PUT /api/events/<event_id>/attendance`

Request:

```json
{
  "userId": "u1",
  "attending": true
}
```

Response:

```json
{
  "eventId": "e_nicol_now",
  "attending": true,
  "attendanceCount": 59,
  "attendingEventIds": ["e_minto_now", "e_nicol_now"]
}
```

### `GET /api/clubs`

Response:

```json
[
  {
    "id": "club-ai",
    "name": "AI Society",
    "category": "Technology",
    "description": "Hands-on ML workshops and student-led projects.",
    "favorite": true
  }
]
```

### `PUT /api/clubs/<club_id>/favorite`

Request:

```json
{
  "userId": "u1",
  "favorite": true
}
```

Response:

```json
{
  "clubId": "club-ai",
  "favorite": true,
  "favoriteClubIds": ["club-ai", "club-data", "club-photography"]
}
```

### `GET /api/friends`

Response:

```json
[
  {
    "id": "f1",
    "name": "Amina",
    "avatarColor": "#2E86FF",
    "attendingEventIds": ["e_nicol_now"]
  }
]
```

### `GET /api/schedule`

Response:

```json
{
  "weekStart": "2026-03-16",
  "classes": [
    {
      "id": "c1",
      "title": "CS 241: Algorithms",
      "dayOfWeek": "Fri",
      "startTime": "12:00",
      "endTime": "13:30",
      "startDateTime": "2026-03-20T12:00:00-04:00",
      "endDateTime": "2026-03-20T13:30:00-04:00",
      "location": "Dunton 301"
    }
  ]
}
```

### `GET /api/profile`

Alias:

- `GET /api/user`

Response:

```json
{
  "id": "u1",
  "name": "Sanvika",
  "program": "Computer Science (BSc)",
  "favoriteClubIds": ["club-ai", "club-data", "club-photography"],
  "attendingEventIds": ["e_minto_now", "e_nicol_now"]
}
```

### `GET /api/buildings`

Response:

```json
[
  {
    "id": "nicol",
    "name": "Nicol Building (Sprott School of Business)",
    "floors": [1, 2, 3, 4]
  }
]
```

## Frontend integration changes

Implemented:

- `src/api/client.ts`
  - `getUser()` now reads `/api/profile`
  - added `setClubFavorite(...)`
  - added `setEventAttendance(...)`
  - added `getFilteredEvents(...)`
- `src/state/appState.ts`
  - favorites and attending state now hydrate from the backend
  - toggles persist to SQL through the new API routes

The screen components stay the same; they still read from `AppStateProvider` and the same API client module.

## Local run steps

1. Install backend packages:

```bash
cd server
pip install -r requirements.txt
```

2. Seed the SQLite database:

```bash
python seed.py
```

3. Start Flask:

```bash
python app.py
```

4. Start the frontend in another terminal:

```bash
cd ..
npm install
npm run dev
```
