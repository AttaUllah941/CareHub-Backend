# CareHub knowledge base

Markdown files here are chunked, embedded and searched by the CareHub AI assistant (`searchKnowledge` tool). Run `npm run ai:ingest` after adding or editing a file — unchanged files are skipped, so re-running is cheap.

## File format

```
---
title: Managing a fever at home
category: health        # health | policy
source: CareHub patient education
---

## Section heading
Short paragraphs…
```

- Use `##` headings; every chunk stays inside one section and is cited as "title – section".
- Keep paragraphs short and factual. One topic per file.
- `README.md` is ignored.

## ⚠️ Review status — read before launch

- **Health articles are a starter set** written as general, conservative patient information (no diagnoses, no drug doses). They have **not been clinically reviewed**. CareHub's medical team must review and approve every `category: health` file before the assistant is used by real patients, and should edit/replace them as needed.
- **Policy/FAQ articles** describe how the app behaves today (booking, cancellation, lab tests, orders, privacy). They must be updated whenever the product rules change.
- The assistant is instructed to answer only from retrieved passages, to cite them, and to present health content as general information — but the quality of the answers can never exceed the quality of these files.
