# CareHub Backend

Node.js + Express + MongoDB API for the [CareHub](../CareHub-frontend) Angular frontend.

All planned modules are implemented (auth, doctors, appointments, hospitals, labs, surgeries, medicines, reviews, prescriptions, notifications, admin, uploads).

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

| Endpoint | URL |
|----------|-----|
| Health | `http://localhost:5800/health` |
| API root | `http://localhost:5800/api/v1` |
| Swagger | `http://localhost:5800/api/v1/docs` |

The frontend expects `apiUrl: http://localhost:5800/api/v1` in development.

## Architecture

```
src/
├── app.js                 # Express app setup
├── server.js              # Entry point
├── config/                # Environment, database, swagger
├── routes/
│   └── index.js           # Mounts all module routers
├── modules/               # One folder per domain (to be built)
│   ├── auth/
│   ├── doctors/
│   ├── appointments/
│   └── ...
├── core/
│   ├── errors/            # AppError classes + global handler
│   ├── middleware/        # auth, validate, rate limit
│   └── utils/             # logger, asyncHandler, apiResponse, JWT
└── shared/
    ├── constants/
    └── enums/
```

## Module convention

Each module under `src/modules/{name}/` should follow:

```
{name}.routes.js       → Express router (HTTP layer)
{name}.controller.js   → Request/response handling
{name}.service.js       → Business logic
{name}.repository.js    → Database queries
{name}.model.js         → Mongoose schema
{name}.validator.js     → express-validator rules
```

Register new routers in `src/routes/index.js`:

```js
router.use('/auth', require('../modules/auth/auth.routes'));
```

## API response contract

Matches the Angular frontend envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }
```

## Security notes

- Access tokens are short-lived (15m); `authenticate` also verifies the account is still active (30s cache), so deactivating a user takes effect almost immediately.
- Refresh tokens carry a `tv` (token version). Logout and password reset bump `User.tokenVersion`, revoking all outstanding refresh tokens.
- Appointments use sparse unique `slotKey` / `pairKey` indexes (set only while pending/confirmed) to prevent double-booking under concurrency.
- Doctors register through `POST /doctor-applications`; `/auth/register` rejects the DOCTOR role.
- Anonymous `POST /uploads/application` is rate-limited to 15 uploads/hour/IP.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Production start |
| `npm test` | Run Jest tests |

## Environment

See `.env.example` for all variables. In production, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `MONGODB_URI` are required.
