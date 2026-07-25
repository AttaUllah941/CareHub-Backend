# CareHub production deploy

Stack: **Netlify** (frontend) · **Render** (API) · **MongoDB Atlas** (database)

## 0. Atlas (already done if you migrated)

1. Database Access: DB user with read/write
2. Network Access: allow `0.0.0.0/0` (required for Render) or Render’s IPs
3. Connection string form:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/carehub?retryWrites=true&w=majority`

## 1. Deploy backend on Render

1. Push `CareHub-Backend` to GitHub
2. [Render](https://dashboard.render.com) → **New** → **Web Service** (or Blueprint with `render.yaml`)
3. Settings:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Health check:** `/health`
4. Environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas URI (with `/carehub`) |
| `JWT_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | different long random string |
| `CORS_ALLOW_NETLIFY` | `true` |
| `FRONTEND_URL` | `https://placeholder.netlify.app` (update after Netlify deploy) |
| `CORS_ORIGIN` | same as `FRONTEND_URL` (update later) |
| `REDIS_ENABLED` | `false` |
| `STORAGE_PROVIDER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `CLOUDINARY_FOLDER` | `carehub` |

5. Deploy → copy URL, e.g. `https://carehub-api.onrender.com`
6. Open `https://carehub-api.onrender.com/health` — should return success

> Free Render services sleep after idle; first request can take ~30–60s.

## 2. Deploy frontend on Netlify

1. Push `CareHub-frontend` to GitHub
2. [Netlify](https://app.netlify.com) → **Add new site** → import repo
3. Build settings (also in `netlify.toml`):
   - **Build command:** `npm run build:netlify`
   - **Publish directory:** `dist/CareHub-frontend/browser`
   - **Node version:** `22`
4. Environment variables:

| Key | Value |
|-----|--------|
| `API_URL` | `https://carehub-api.onrender.com/api/v1` |
| `SOCKET_URL` | `https://carehub-api.onrender.com` |

5. Deploy → copy site URL, e.g. `https://your-app.netlify.app`

## 3. Connect the two

On **Render**, update:

| Key | Value |
|-----|--------|
| `FRONTEND_URL` | `https://your-app.netlify.app` |
| `CORS_ORIGIN` | `https://your-app.netlify.app` |

Redeploy API (or restart). Keep `CORS_ALLOW_NETLIFY=true` if you use deploy previews.

## 4. Smoke test

- [ ] `https://YOUR_API.onrender.com/health`
- [ ] Netlify home page loads
- [ ] Login / register works
- [ ] Hospitals / labs / pharmacies show phone, email, images
- [ ] Medicines order flow (patient)
- [ ] Doctor / admin / pharmacy portals

## Local development

Keep using `.env` with Atlas or local Mongo. Frontend `environment.ts` still points at `http://localhost:5800`.
