# CareHub Modules

Domain modules live here. Each folder represents a bounded context aligned with the CareHub frontend.

## Structure per module

```
modules/{name}/
  {name}.routes.js
  {name}.controller.js
  {name}.service.js
  {name}.repository.js
  {name}.model.js
  {name}.validator.js
```

## Planned modules

| Module | Frontend feature | Priority |
|--------|------------------|----------|
| `auth` | `/auth/*`, JWT session | P0 |
| `specialties` | Find doctors, home | P0 |
| `languages` | Doctor profiles | P0 |
| `doctors` | Listing, detail, portal | P0 |
| `appointments` | Booking modals | P1 |
| `hospitals` | Hospital pages | P2 |
| `labs` | Lab pages & booking | P2 |
| `surgeries` | Surgery pages | P2 |
| `medicines` | Pharmacy & checkout | P2 |
| `reviews` | Doctor reviews | P1 |
| `admin` | Verification, CRUD | P2 |
| `uploads` | Documents, prescriptions | P2 |
| `users` | Profile management | P1 |

Mount each module router in `src/routes/index.js` when ready.
