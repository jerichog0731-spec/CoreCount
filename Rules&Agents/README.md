# Agentic IDE Rules System
### For local 7B models on resource-constrained hardware

---

## What's in This Folder

| File | Purpose | Load in |
|---|---|---|
| `.clinerules` | Master IDE behaviour rules | Cline (auto-detected), Copilot instructions |
| `agent-planner.md` | Planner subagent system prompt | New chat / agent invocation |
| `agent-implementer.md` | Implementer subagent system prompt | New chat / agent invocation |
| `agent-critic.md` | Critic subagent system prompt | New chat / agent invocation |

---

## Why 3 Subagents (Not More)

7B models degrade with coordination complexity. 3 agents is the maximum before orchestration overhead exceeds the benefit:

- **Planner** — thinks, never acts
- **Implementer** — acts, never thinks
- **Critic** — verifies, never creates

Each agent has a single, non-overlapping job. This prevents the model from confusing its role mid-task, which is the primary failure mode for small models in agentic contexts.

A 4th agent (Documenter) can be added for projects that require heavy inline documentation, but should only activate post-approval, never mid-implementation.

---

## How They Work Together

```
User task
    │
    ▼
┌─────────────┐
│   PLANNER   │  Produces: numbered step plan + affected files
└──────┬──────┘
       │ Hands off plan
       ▼
┌─────────────────┐
│  IMPLEMENTER    │  Executes: one step at a time, read → edit → verify
└────────┬────────┘
         │ Hands off completed implementation
         ▼
┌─────────────┐
│   CRITIC    │  Reviews: checklist pass/fail → approve or return to Implementer
└──────┬──────┘
       │ Approved
       ▼
   User delivery
```

**On rejection:** Critic returns precise fix requests → Implementer makes targeted edits → Critic re-reviews.  
**Maximum 2 cycles** before escalating to user.

---

## How to Use These Files

### With Cline (Recommended)
Place `.clinerules` in your project root. Cline reads it automatically at the start of every session. For subagents, paste the relevant `.md` file contents as the system prompt when creating a new agent task.

### With VS Code Copilot Agent Mode
Copy `.clinerules` content into `.github/copilot-instructions.md`. Copilot agent mode picks this up as workspace-level instructions.

### With Continue.dev
Add each agent file as a custom prompt under `.continue/prompts/`. Reference them with `/planner`, `/implementer`, `/critic` slash commands.

### With Aider
Pass agent files via `--system-prompt agent-planner.md` at invocation. Chain manually between agents.

---

## Key Behaviours These Rules Enforce

1. **Plan before act** — eliminates speculative code writing
2. **Read before edit** — prevents file content assumptions
3. **One step at a time** — stops cascading failures
4. **Structured handoffs** — gives each agent full context without relying on memory
5. **Hard failure conditions** — stops the agent from silently recovering from errors

---

## Tuning for Your Hardware (16GB / Snapdragon X Elite)

- Keep context window at **8k** — these structured formats are verbose but efficient
- The Planner call is cheap (no tool use) — run it fresh each task
- The Critic call is the most token-intensive — if slow, reduce checklist to the top 5 items
- If running Implementer steps serially (one call per step), total task latency scales linearly — acceptable for focused coding sessions
