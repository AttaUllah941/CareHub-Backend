# CareHub Integration Guide — Phase 0 Baseline

This document records the backend prerequisites completed for frontend integration.

## Environments

| Environment | Frontend URL | Backend API | Notes |
|-------------|--------------|-------------|-------|
| Local dev | `http://localhost:4200` | `http://localhost:5800/api/v1` | Default setup |
| Production | Your domain | `/api/v1` (proxied) | Set `CORS_ORIGIN` and `FRONTEND_URL` on backend |

## Seed credentials (`npm run seed`)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@carehub.test` | `Password123!` |
| Doctor | `dr.ayesha@carehub.test` | `Password123!` |
| Doctor | `dr.bilal@carehub.test` | `Password123!` |
| Doctor | `dr.sana@carehub.test` | `Password123!` |

Register new patients via `POST /auth/register` with role `PATIENT`.

## API response contract

**Success**
```json
{ "success": true, "message": "...", "data": { } }
```

**Error**
```json
{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }
```

**Auth login/register/refresh data shape (frontend-aligned)**
```json
{
  "user": { "id", "firstName", "lastName", "email", "role", "isActive", "isEmailVerified" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

## Phase 0 endpoints checklist

### Health & meta
- [ ] `GET /health`
- [ ] `GET /api/v1/`

### Auth
- [ ] `POST /api/v1/auth/register`
- [ ] `POST /api/v1/auth/login`
- [ ] `GET /api/v1/auth/me` (Bearer)
- [ ] `POST /api/v1/auth/refresh` — body: `{ "refreshToken": "..." }`
- [ ] `POST /api/v1/auth/logout` (Bearer)
- [ ] `POST /api/v1/auth/forgot-password`
- [ ] `POST /api/v1/auth/reset-password`
- [ ] `POST /api/v1/auth/change-password` (Bearer)

### Doctors
- [ ] `GET /api/v1/doctors/public/search?search=&city=&name=` (accepts `search` or `name`)
- [ ] `GET /api/v1/doctors/public/:id`

### Catalogs
- [ ] `GET /api/v1/specialties/public`
- [ ] `GET /api/v1/medical-specialties/public` (alias)
- [ ] `GET /api/v1/languages/public`

### Appointments
- [ ] `POST /api/v1/appointments` (optional Bearer; guest requires `patientName` + `patientEmail`)
- [ ] `GET /api/v1/appointments/me` (PATIENT)
- [ ] `PATCH /api/v1/appointments/:id/cancel` (PATIENT)
- [ ] `GET /api/v1/doctor/appointments` (DOCTOR)
- [ ] `PATCH /api/v1/doctor/appointments/:id/confirm` (DOCTOR)
- [ ] `PATCH /api/v1/doctor/appointments/:id/complete` (DOCTOR)
- [ ] `PATCH /api/v1/doctor/appointments/:id/reject` (DOCTOR)

### Uploads
- [ ] `POST /api/v1/uploads` (Bearer, multipart field `file`)

## Query param alignment (frontend)

| Frontend sends | Backend accepts |
|----------------|-----------------|
| `name` (doctor search) | `name` or `search` |
| `/medical-specialties/public` | Mounted alias of `/specialties/public` |

## Manual smoke test order

1. Start MongoDB, Redis (optional), backend (`npm run dev`)
2. Run `npm run seed` if database is empty
3. `GET /health` → 200
4. `POST /auth/login` with admin credentials
5. `GET /doctors/public/search` → seeded doctors
6. `GET /medical-specialties/public` → seeded specialties
7. `POST /appointments` as patient with `doctorId` + `scheduledAt`
8. `POST /auth/refresh` with refresh token from login

## Known follow-ups (Phase 1+)

- Frontend `environment.production.ts` file replacements in `angular.json`
- Replace dummy data services with API services per domain
- Unify doctor portal with JWT auth
- Admin UI for `/admin/*` routes
