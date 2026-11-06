# CareHub AI — Multi-agent assistant

Status: **All planned phases implemented** — core chat API, intent router, conversation memory, confirmation framework, **Patient, Doctor and Admin agents**, the Angular chat UI, and **RAG** (health & CareHub-policy knowledge). Not yet verified against the live OpenAI API (see [Testing](#8-testing)). The health articles are a **starter set that needs medical review before launch** (see [RAG](#4d-rag--knowledge-retrieval)).

## 1. Architecture

```
POST /api/v1/ai/chat   (authenticate → per-user rate limit → strict Zod validation)
   │
   ├─ agent.router      role (from verified JWT) ──► PATIENT | DOCTOR | ADMIN agent
   │                    (client cannot choose or override; extra body fields are rejected)
   ├─ intent.router     emergency detection + domain tagging (doctors / appointments / labs /
   │                    medicines / surgery / health) → narrows the tool set
   ├─ ai.service        model ⇄ tools loop (max 5 steps), sanitises input, persists the turn
   │     └─ tool-executor   allow-list → role check → Zod validation → confirmation gate | execute
   │            └─ tools    thin wrappers over EXISTING services (no DB access, no new business logic)
   └─ memory            AiConversation · AiMessage · AiPendingAction · AiAuditLog (MongoDB)
```

Code lives in `src/modules/ai/`:

| Path | Responsibility |
|---|---|
| `ai.routes.js`, `ai.controller.js` | HTTP layer (response envelope `{success,message,data}`) |
| `validators/chat.validator.js` | `chatSchema` is `.strict()` — unknown keys such as `role`/`agent` → 422 |
| `router/agent.router.js` | Resolves the agent from `req.user.role` |
| `router/intent.router.js` | Deterministic, per-agent intent tagging (+ emergency detection for patients only); no extra LLM call |
| `agents/` | Agent definitions (prompt builder, suggestions, tagline): `PATIENT`, `DOCTOR`, `ADMIN` |
| `prompts/` | `common.prompt.js` (rules shared by all agents + patient safety rules), `patient/doctor/admin.prompt.js` |
| `tools/` | Tool definitions per domain + `tool.registry.js` (schemas → JSON Schema) |
| `services/ai.service.js` | Orchestration |
| `services/tool-executor.service.js` | Safe execution of one model-requested call |
| `services/pending-action.service.js` | Confirm / cancel flow (atomic, replay-safe) |
| `services/permission.service.js` | Role → agent and tool authorisation |
| `services/audit.service.js` | PII-redacted audit log |
| `memory/*` | Mongoose models + `conversation.service.js` |
| `providers/` | `openai.provider.js` (plain HTTPS, no SDK) + `index.js` (swap/inject) |

### Provider modularity
`providers/index.js` returns an object with `isConfigured()` and `chat({messages, tools})` → `{message, usage}`. Any OpenAI-compatible endpoint works by setting `OPENAI_BASE_URL` / `AI_MODEL`; a different API shape needs one new provider file implementing the same two functions.

## 2. Security model

| Concern | Control |
|---|---|
| Role/identity | Taken only from the verified JWT (`req.user`). Request schema rejects extra keys. Model-visible prompt states role claims in messages must be ignored. |
| Tool access | Model only sees tools of its own agent and, per message, only the matching domains. The executor re-checks `allowedToolNames` **and** `canUseTool(role)`; unknown/other-agent tools are rejected and logged. |
| Arguments | Every tool has a Zod schema (also published to the model). Cities are restricted to letters because some existing list services build a RegExp from them. Consequential tools re-validate with the **existing** request schemas (`createAppointmentSchema`, `createBookingSchema`, `createOrderSchema`, `createConsultationRequestSchema`). |
| No direct data access | Tools call services only; the AI layer never touches Mongoose models for business data. Ownership (e.g. cancel own appointment) is enforced by the existing services using the verified user. |
| Confirmation | `bookAppointment`, `cancelAppointment`, `createLabBooking`, `createMedicineOrder`, `submitSurgeryConsultation` can only **propose**. A `AiPendingAction` (10-min TTL, bound to user + conversation) is created and the model gets no further tools that turn. Only `POST /ai/actions/:id/confirm` by the same user executes it, atomically (`pending → executing`), so double-clicks/replays do nothing. |
| Prompt injection | Tool results are passed as JSON data with an explicit "data, not instructions" rule; control and bidi/zero-width characters are stripped from input; length-capped; tool calls per step capped. |
| Isolation | Conversations are looked up by `{_id, userId}`; other users get `404`. Pending actions likewise. |
| Data minimisation | Conversation context stores only structured filters/ids (no free-text medical content); tool payloads aren't replayed to the model; TTL indexes delete conversations/messages after `AI_RETENTION_DAYS`. Audit args exclude name/phone/email/address/notes. |
| Medical safety | System prompt forbids diagnosis/prescribing; emergency phrases deterministically prepend 1122 guidance even if the model fails; prescription-only medicines cannot be ordered through chat. |
| Abuse | Per-user rate limits (`AI_CHAT_RATE_PER_MINUTE`, default 20/min; confirm/cancel 30/min) plus the app-wide limiters. |
| Secrets | `OPENAI_API_KEY` exists only in backend env; never sent to Angular. Provider error bodies are logged, never returned to clients. |

## 3. API

All routes require `Authorization: Bearer <accessToken>` and return the standard envelope.

| Method & path | Purpose |
|---|---|
| `GET /ai/capabilities` | `{available, configured, agent, label, suggestions[], tools[]}` for the signed-in user. `available:false` + `reason` when the role has no assistant yet. |
| `POST /ai/chat` | Body `{ message (≤2000 chars), conversationId?: string\|null }` → `{ conversationId, agent, title, messageId, message, actions[], createdAt }` |
| `GET /ai/conversations?page&limit` | The user's conversations, newest first |
| `GET /ai/conversations/:id` | `{ conversation, messages[] }` |
| `DELETE /ai/conversations/:id` | Deletes conversation, messages and pending actions |
| `POST /ai/actions/:id/confirm` | Executes a proposed action → `{ conversationId, status:'executed', message }` |
| `POST /ai/actions/:id/cancel` | Discards it → `{ status:'cancelled', message }` |

Errors: `401` no/invalid token · `422` validation (incl. forged `role`) · `404` not your conversation/action · `400` expired/already-used action · `501` role has no agent yet · `503` AI not configured or provider busy · `502/504` provider failure/timeout.

### `actions[]` types returned by `/ai/chat`
`DOCTOR_RESULTS`, `AVAILABILITY`, `APPOINTMENTS`, `LAB_RESULTS`, `LAB_TESTS`, `LAB_PRICE_COMPARISON`, `MEDICINE_RESULTS`, `PHARMACY_RESULTS`, `SURGERY_RESULTS`, `HOSPITAL_RESULTS`, `CONSULTATION_REQUESTS`, `HEALTH_ANSWERS`, `CONFIRMATION` (`{actionId, tool, summary, expiresAt}`), `ACTION_RESULT`. Payload shapes are typed in `CareHub-frontend/src/app/features/ai-chat/models/chat.models.ts`.

### Related endpoint added
`GET /api/v1/schedules/availability/:doctorId?date=YYYY-MM-DD` (public). The previously dead availability code now works: uses the doctor's schedules, falls back to the platform default slots, marks booked/past slots unavailable (times interpreted in `CLINIC_UTC_OFFSET`, default `+05:00`). Also added `medicinesService.listPublicPharmacies`.

## 4. Patient Agent tools

| Tool | Reuses | Confirm |
|---|---|---|
| `searchDoctors` | `doctorsService.searchPublicDoctors` (+ specialty catalog) | – |
| `getDoctorProfile` | `doctorsService.getPublicDoctorById` | – |
| `getDoctorReviews` | `reviewsService.listDoctorReviews` | – |
| `checkAvailability` | `schedulesService.getAvailability` | – |
| `listMyAppointments` | `appointmentsService.listPatientAppointments` | – |
| `bookAppointment` | `appointmentsService.createAppointment` | ✔ |
| `cancelAppointment` | `appointmentsService.cancelAppointment` | ✔ |
| `searchLabs`, `getLabTests`, `compareTestPrices` | `labsService.listPublicLabs / listPublicLabTests` | – |
| `createLabBooking` | `labsService.createBooking` | ✔ |
| `searchMedicines`, `findPharmacies` | `medicinesService.listPublicMedicines / listPublicPharmacies` | – |
| `createMedicineOrder` | `medicinesService.createOrder` (prices from catalog; Rx items blocked) | ✔ |
| `searchSurgeryProcedures`, `searchHospitals`, `getMyConsultationRequests` | surgeries / hospitals services | – |
| `submitSurgeryConsultation` | `surgeriesService.createConsultationRequest` | ✔ |
| `searchKnowledge` | RAG retriever over `knowledge/*.md` + doctor-answered questions (falls back to `healthQuestionsService.listPublicAnswered`) — see [RAG](#4d-rag--knowledge-retrieval) | – |

## 4b. Doctor Agent tools (role `DOCTOR`)

Every tool acts for the signed-in doctor only (profile resolved from the verified user). Patients are visible **only through this doctor's own appointments**; unknown ids and other doctors' patients both return "not found".

| Tool | Reuses | Confirm |
|---|---|---|
| `listAppointments` (today / upcoming / past / date / status) | `appointmentsService.listDoctorAppointments` | – |
| `confirmAppointment`, `rejectAppointment` (optional reason), `completeAppointment` | `appointmentsService.confirm/reject/completeAppointment` | ✔ |
| `getSchedule` | `schedulesService.listMySchedules` | – |
| `addScheduleSlot`, `removeScheduleSlot` | `schedulesService.createSchedule / deactivateSchedule` (+ `createScheduleSchema`, clinics service) | ✔ |
| `listMyPatients`, `getPatientHistory` | derived from the doctor's appointments + `prescriptionsService.listForDoctor` | – |
| `listPrescriptions` | `prescriptionsService.listForDoctor` | – |
| `draftPrescription` | `prescriptionsService.createForDoctor` (+ `createPrescriptionSchema`) | ✔ (shows the full draft to review) |
| `getAppointmentAnalytics`, `getEarnings`, `getFollowUps` | new read-only `reports.service` | – |

Prescription safety: the model may only structure what the doctor states (diagnosis, drugs, doses); the patient's name is taken from the record, the patient must have a confirmed/completed appointment with the doctor, and nothing is saved until the doctor confirms.

**Definitions** — *Earnings* = completed appointments × the doctor's current consultation fee (same rule as the portal). *Follow-up candidates* = patients whose latest completed visit was ≥ N days ago (default 7, within 90 days) and who have no pending/confirmed appointment with the doctor.

## 4c. Admin Agent tools (roles `ADMIN`, `SUPER_ADMIN`)

| Area | Tools | Reuses | Confirm |
|---|---|---|---|
| Users | `searchUsers` · `setUserActive` | `adminService.listUsers / getUserById / updateUserStatus` | read · ✔ |
| Doctors | `listDoctorApplications`, `getDoctorApplication`, `listDoctors` · `approveApplication`, `rejectApplication` (reason required), `setDoctorVerification` | doctor-applications & doctors services | read · ✔ |
| Labs | `listLabs`, `listLabTests` · `createLab`, `createLabTest`, `updateLabTest` | labs service (+ existing validators) | read · ✔ |
| Medicines | `listPharmacies`, `listMedicines` · `createMedicine`, `updateMedicine`, `setPharmacyActive` | medicines service | read · ✔ |
| Orders | `searchOrders`, `getOrder` · `updateOrderStatus` (valid transitions only) | `medicinesService.listAdminOrders / getOrderById / updateOrderStatus` | read · ✔ |
| Reports | `getDashboardSummary`, `getUsersReport`, `getAppointmentsReport`, `getOrdersReport`, `getRevenueReport` | `adminService.getDashboardStats`, `reports.service` | – |

Admin-only safety rules added at tool level (the raw endpoint has none): an admin cannot change their own status; only a `SUPER_ADMIN` may change another administrator's status; rules are re-checked when the confirmed action executes. **Revenue** is *gross booking value* (non-cancelled medicine orders + non-cancelled lab bookings + completed consultation fees estimated from doctors' current fees) — CareHub has no commission model, and the assistant says so. Report ranges default to the last 30 days and are capped at 366 days.

Supporting code added: `modules/reports` (read-only aggregations, no HTTP routes), `medicinesService.listAdminOrders`, `adminService.getUserById`.

### Generic UI blocks
Doctor/admin tools return three generic blocks the frontend renders without per-tool components: `STATS`, `TABLE`, `LIST` (rows can carry buttons). Buttons only send a chat message such as "Confirm appointment … (appointment id …)"; that goes through the normal tool → confirmation card flow, so UI buttons cannot bypass confirmation. `CONFIRMATION.details` carries extra review lines (e.g. a prescription draft).

Conversation context example: after a doctor search the filters/fees are stored (`context.lastDoctorSearch`) and injected into the next turn, so "show me cheaper ones" resolves.

## 4d. RAG — knowledge retrieval

Used **only** for health information and "how does CareHub work / what is the policy" questions (`searchKnowledge`). It is deliberately *not* used for bookings, orders, availability or anything personal — those always go through the dedicated tools and existing services.

```
knowledge/*.md ──┐                               ┌─ semantic: cosine similarity (≥ AI_RAG_MIN_SCORE)
doctor-answered ─┼─► chunk ─► embed ─► Mongo ─►  │
questions        ┘  (per      (OpenAI,  aiknowledge-   ├─ keyword fallback: weighted term overlap
                  heading)  512 dims) chunks             (no key yet / embeddings down)
                                                       └─ none ingested: doctor-answered Q&A search
```

- **Sources:** Markdown files in `CareHub-Backend/knowledge/` (frontmatter `title`, `category: health|policy`, `source`) and every doctor-*answered* health question already on the platform (one chunk each).
- **Chunking:** by heading, ≤ 900 characters, sentence-aware; each chunk is cited as "title › section".
- **Ingestion:** `npm run ai:ingest` (add `-- --force`, `--dir=…`, `--no-questions`). Incremental — a content hash (including the embedding model) skips unchanged sources, re-embeds changed ones and deletes removed ones. **Without an API key it still indexes for keyword search**; running it again with a key upgrades everything to vectors. Re-run it whenever you edit `knowledge/` or want newly answered questions indexed.
- **Retrieval:** vectors are L2-normalised at ingest (similarity = dot product); the corpus is cached in memory (5-min TTL, invalidated by ingestion) and query embeddings are cached. At most 2 chunks per source are returned. Below the similarity floor the tool returns *no source*, so unrelated questions are not answered from loosely related text.
- **Answers:** the tool returns the passages plus an instruction to answer **only** from them, name the source titles, present the content as general information (never a diagnosis) and say when no source exists. The UI shows the same passages as a **Sources** card with a "general information only" note.
- **Provider modularity:** `embed(texts)` is part of the provider contract (`providers/openai.provider.js`); the retriever is a single `search()` function and can be replaced by Atlas Vector Search without touching the tool.

> **Content review required.** `knowledge/*.md` health articles are *starter content* written as conservative general information (no drug doses — enforced by a test). They have **not** been clinically reviewed. CareHub's medical team must review/replace them before real patients use the assistant. Policy articles describe current app behaviour and must be updated when product rules change. See `knowledge/README.md`.

## 5. MongoDB collections added

| Collection | Notes |
|---|---|
| `aiconversations` | `userId, agent, title, context, lastMessageAt`; index `{userId, lastMessageAt}`; TTL on `lastMessageAt` |
| `aimessages` | `conversationId, userId, role, content, actions[], toolsUsed[]`; TTL on `createdAt` |
| `aipendingactions` | `userId, conversationId, tool, args, summary, status, expiresAt`; TTL cleanup 24 h after expiry |
| `aiauditlogs` | `userId, role, agent, tool, args (redacted), outcome, error` |
| `aiknowledgechunks` | `sourceKey (doc:<file> \| hq:<id>), sourceType, category, title, section, sourceLabel, text, contentHash, embedding (normalised, select:false), embeddingModel` |

Also: `Appointment` gained `slotKey`/`pairKey` earlier (see APP_FLOW.md); no existing collection was altered for the AI module.

## 6. Environment variables (backend `.env`)

| Variable | Default | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | – | **Required** for replies. Without it `/ai/chat` → 503 and the UI shows a setup notice |
| `AI_MODEL` | `gpt-4o-mini` | Chat model (must support tool calling) |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model for RAG |
| `AI_EMBEDDING_DIMENSIONS` | 512 | Vector size (smaller = cheaper/faster; `text-embedding-3-*` only) |
| `AI_RAG_TOP_K` | 4 | Passages returned per search |
| `AI_RAG_MIN_SCORE` | 0.3 | Cosine-similarity floor for semantic retrieval |
| `AI_KNOWLEDGE_DIR` | `./knowledge` | Folder ingested by `npm run ai:ingest` |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| `AI_TIMEOUT_MS` | 45000 | Per model call |
| `AI_MAX_TOOL_ITERATIONS` | 5 | Model⇄tool steps per message |
| `AI_HISTORY_MESSAGES` | 12 | Past user/assistant messages sent as context |
| `AI_MAX_MESSAGE_CHARS` | 2000 | Input cap |
| `AI_RETENTION_DAYS` | 90 | TTL for conversations/messages |
| `AI_CONFIRMATION_TTL_MS` | 600000 | Confirmation expiry |
| `AI_CHAT_RATE_PER_MINUTE` | 20 | Per-user limit |
| `CLINIC_UTC_OFFSET` | `+05:00` | Timezone for slot labels |

## 7. Frontend (`CareHub-frontend/src/app/features/ai-chat/`)

Floating widget (`<app-chat-widget>`), mounted from `app.html` inside `@defer (on idle)` so it is a separate lazy chunk (~12 kB gzipped) and never touches SSR or first paint. Visible only when signed in **and** `capabilities.available`. Components: widget, window, header, message, input, typing indicator, conversation sidebar, tool-result (switch), doctor / appointment / confirmation cards. `AiChatService` (signals) owns state; chat requests skip the global progress bar/toast and show inline states instead. State is cleared on sign-out. Assistant text is rendered by a small escape-first markdown renderer (no dependencies).

Result-card buttons send ordinary chat messages (e.g. "Book Dr X (doctor id …) on 2026-11-10 at 10:00 AM"); the model then calls the proper tool and the user sees a confirmation card.

## 8. Testing

- `npm test` in the backend — includes `src/modules/ai/__tests__`:
  - routing/validation/registry unit tests;
  - an **integration test against a real throwaway MongoDB** (`AI_TEST_MONGODB_URI`, default `mongodb://127.0.0.1:27017/carehub_ai_test`; auto-skips when unreachable) that drives the real services with a *scripted LLM*: search, follow-up memory, propose → confirm → appointment created, replay blocked, cross-user confirm blocked, taken-slot refusal, tool-not-offered rejection, malformed-args rejection, emergency prefix, conversation privacy, role isolation, cleanup on model failure.
  - `ai.agents.integration.test.js` — Doctor/Admin agents on real services: doctor data scoping, confirmation + audit, prescription relationship checks, analytics/earnings/follow-up numbers, role isolation, admin safety rules, application approve/reject, order transitions and report totals;
  - `rag.test.js` (chunker, loader, keyword search, a lint that fails if health articles contain drug doses) and `rag.integration.test.js` (incremental ingest, semantic and keyword retrieval, thresholds, topic filter, provider-outage fallback, upgrade from keyword-only to vectors, the `searchKnowledge` tool in the chat loop). RAG tests use a deterministic test embedder instead of OpenAI.
- `npm test` in the frontend — markdown XSS safety and `AiChatService` behaviour.
- Verified manually end-to-end (HTTP provider → route → tools → DB) against an OpenAI-compatible stub; **not yet verified against the real OpenAI API** (no key available during development).

## 9. Known limitations

- Pharmacy, Lab and Clinic-manager roles have no assistant (`403`/hidden widget).
- The admin agent cannot manage surgery consultation requests yet, and cannot re-activate inactive lab tests/pharmacies it cannot list (public listings only show active records).
- Appointment fees aren't stored per booking, so earnings/revenue use each doctor's *current* fee.
- No streaming: replies appear when complete (typing indicator meanwhile).
- The health knowledge base is a small starter set pending medical review; coverage is limited to common topics (fever, blood pressure, diabetes, cold/flu, headache, diarrhoea, emergencies) and CareHub help topics.
- Retrieval thresholds (`AI_RAG_MIN_SCORE`) are tuned conservatively but not yet calibrated against the real embedding model — adjust after trying real questions.
- RAG is available to the patient assistant only; doctors/admins don't have a policy-lookup tool yet.
- Slot availability uses default slots unless a doctor has configured schedules; booking modals elsewhere in the app still offer the default list.
- Intent routing is keyword-based; unusual phrasing falls back to the full tool set (still correct, slightly costlier).
- Rate limiting is in-memory per instance.

## Roadmap
1. Clinical review of `knowledge/` health content; grow the corpus (hospital and medicine information) — keep using existing tools for live data.
2. Atlas Vector Search behind the same `search()` interface when the corpus outgrows in-memory search; policy lookup for doctor/admin agents.
3. Streaming responses, schedule-aware booking modals, and per-tool analytics.
