# Next App: C.O.R.E. Inventory Brain

**Separate GitHub repository** (you are creating it). This is the scaffold checklist aligned with [CORE-MASTER-SPEC.md](./CORE-MASTER-SPEC.md) and `local-inventory-ai-system.md`.

---
[text](https://github.com/jerichog0731-spec/CoreCount)
## Suggested repo name

`ProjectDignity-CORE-Brain` or `pdh-supply-hub`

---

## Minimal scaffold

```
pdh-supply-hub/
├── package.json
├── src/
│   ├── server.ts          # Express
│   ├── db/
│   │   ├── schema.sql
│   │   └── index.ts       # better-sqlite3
│   ├── ai/
│   │   ├── ollama.ts      # chat + JSON extract
│   │   └── decanting.ts   # deterministic yield math
│   ├── routes/
│   │   ├── supplies.ts
│   │   ├── batches.ts
│   │   ├── donors.ts
│   │   └── drafts.ts      # review hub
│   └── jobs/
│       └── low-stock.ts   # node-cron
├── public/                # simple dashboard HTML
├── data/                  # .gitignore core.db
└── docs/
    └── AI-LOCAL-BACKEND.md  # copy from ProjectDignityApp
```

---

## SQLite schema (from inventory doc)

- **supplies** — item, unit, bulk_oz, bottle_oz, quantity, min_threshold
- **kits** — kit_name, components JSON
- **donors** — name, email, alert_enabled
- **batches** — decant log, date, kits_yielded, supply_id

---

## API endpoints (v1)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/intake/parse` | Raw text → structured + yield |
| GET | `/api/v1/supplies` | Stock levels |
| PATCH | `/api/v1/supplies/:id` | Adjust qty |
| POST | `/api/v1/drafts/generate` | Low-stock social/email draft |
| GET | `/api/v1/drafts` | Review hub queue |

---

## First commands after repo exists

```bash
npm init -y
npm install express better-sqlite3 nodemailer cors node-cron
npm install -D typescript @types/node @types/express tsx
ollama pull phi4-mini
ollama pull qwen2.5:3b
```

---

## Link to distribution PWA

When both repos exist:

1. Share `ResourceCategoryId` enum (Hygiene, Laundry, Cleaning, Special).
2. Brain exposes `GET /api/v1/stock/eligibility-gates` (optional).
3. PWA `dispense` route checks stock before commit (Phase C).

---

## Cursor setup

Copy from `ProjectDignityApp`:

- `.cursor/rules/pdh-project.mdc` → adapt to `core-brain.mdc`
- Reference `docs/CORE-MASTER-SPEC.md` in `AGENTS.md`

Ask the agent to **open the new repo root** with `move_agent_to_root` before scaffolding.
