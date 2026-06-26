# carehub-backend

Node.js + Express + MongoDB API skeleton for the CareHub frontend.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |

## Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/v1/health` | `{ "success": true, "message": "ok" }` |

## Structure

```
src/
├── app.js
├── server.js
├── config/
├── shared/
│   ├── middleware/
│   ├── utils/
│   ├── errors/
│   └── validators/
├── modules/
├── jobs/
└── sockets/
```

Business modules will be added under `src/modules/` incrementally.
