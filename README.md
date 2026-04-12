# LoopIn

**Human-in-the-loop interrupt API for AI agents.**

LoopIn lets AI agents pause at critical decision points, request human review, and resume execution based on the human's decision. No more agents making high-stakes calls alone.

---

## Why LoopIn?

Autonomous agents are powerful — until they hit a decision they shouldn't make without a human. LoopIn gives every agent a safe exit ramp:

1. **Agent hits a decision point** → calls `POST /interrupts`
2. **LoopIn notifies the human** → via webhook or a direct review URL
3. **Human approves or rejects** → via the review page or `POST /interrupts/:id/decide`
4. **Agent polls for the decision** → `GET /interrupts/:id`
5. **Agent resumes** → using the decision (and any modified params the human provided)

---

## Endpoints

### POST /interrupts
Create a new interrupt request.

**Request:**
```json
{
  "agentId": "agent-payments-v2",
  "userId": "user-123",
  "action": "Transfer $4,200 to vendor account ending in 9821",
  "context": {
    "vendor": "Acme Supplies",
    "amount": 4200,
    "currency": "USD",
    "invoiceId": "INV-2024-0892",
    "accountLast4": "9821"
  },
  "urgency": "high",
  "expiresIn": 1800,
  "callbackUrl": "https://my-agent.example.com/webhooks/loopin"
}
```

**Response:**
```json
{
  "interruptId": "3f4e2a1b-...",
  "status": "pending",
  "expiresAt": "2024-04-12T14:30:00Z",
  "reviewUrl": "http://localhost:3002/review/3f4e2a1b-..."
}
```

---

### GET /interrupts/:interruptId
Poll for the current status and decision.

**Response (pending):**
```json
{
  "interruptId": "3f4e2a1b-...",
  "status": "pending",
  "action": "Transfer $4,200 to vendor account ending in 9821",
  "context": { ... },
  "urgency": "high",
  "createdAt": "2024-04-12T13:00:00Z",
  "expiresAt": "2024-04-12T14:30:00Z",
  "reviewUrl": "http://localhost:3002/review/3f4e2a1b-..."
}
```

**Response (resolved):**
```json
{
  "interruptId": "3f4e2a1b-...",
  "status": "approved",
  "decision": "approved",
  "decidedAt": "2024-04-12T13:07:22Z",
  "reason": "Invoice verified, proceed."
}
```

---

### POST /interrupts/:interruptId/decide
Submit a human decision.

**Request:**
```json
{
  "decision": "approved",
  "reason": "Invoice verified, proceed.",
  "modifiedParams": { "amount": 4200 }
}
```

**Response:**
```json
{
  "interruptId": "3f4e2a1b-...",
  "status": "resolved",
  "decision": "approved",
  "decidedAt": "2024-04-12T13:07:22Z"
}
```

---

### GET /interrupts/pending/:userId
List all pending interrupts waiting for a user's review.

**Response:**
```json
[
  {
    "interruptId": "3f4e2a1b-...",
    "action": "Transfer $4,200 to vendor...",
    "urgency": "high",
    "createdAt": "...",
    "expiresAt": "...",
    "reviewUrl": "..."
  }
]
```

---

### DELETE /interrupts/:interruptId
Cancel a pending interrupt (agent no longer needs the decision).

---

### GET /analytics/:userId
Usage statistics.

**Response:**
```json
{
  "userId": "user-123",
  "totalInterrupts": 47,
  "approvalRate": 0.83,
  "avgResponseTimeMs": 142000,
  "byStatus": { "approved": 39, "rejected": 8 },
  "byUrgency": { "high": 12, "medium": 28, "low": 7 },
  "topActionTypes": [
    { "action": "Send payment", "count": 18 },
    { "action": "Delete records", "count": 9 }
  ]
}
```

---

## Review Page

Every interrupt gets a human-readable review URL:

```
GET /review/:interruptId
```

This renders an HTML page showing:
- What the agent wants to do
- All context data (formatted JSON)
- Urgency badge
- **Approve** / **Reject** buttons
- Optional reason text field

Share this URL with whoever needs to review the request. No login required by default.

---

## MCP Tools

The LoopIn MCP server exposes all 6 tools for use with any MCP-compatible AI client (Claude Desktop, Cursor, etc.):

| Tool | Description |
|------|-------------|
| `create_interrupt` | Agent creates a new interrupt request |
| `get_interrupt_status` | Agent polls for a decision |
| `list_pending_interrupts` | Human sees what needs review |
| `decide_interrupt` | Human approves or rejects |
| `cancel_interrupt` | Agent cancels a pending request |
| `get_interrupt_analytics` | Usage stats |

### MCP Server setup (stdio)
```json
{
  "mcpServers": {
    "loopin": {
      "command": "npx",
      "args": ["-y", "@colossal-api/loopin-mcp"],
      "env": {
        "LOOPIN_API_URL": "https://your-loopin-instance.railway.app",
        "LOOPIN_API_KEY": "your-key"
      }
    }
  }
}
```

---

## Agent Usage Pattern

```
1. Agent reaches a decision point
   → POST /interrupts { agentId, userId, action, context, urgency }
   ← { interruptId, reviewUrl }

2. Agent saves interruptId and pauses
   → (optionally: notify human via other channels with reviewUrl)

3. Agent polls until resolved
   → GET /interrupts/:interruptId
   ← { status: "pending" }   ← keep polling
   ← { status: "approved", decision, modifiedParams }  ← resume

4. Agent resumes execution
   → use modifiedParams if provided, otherwise proceed as planned
```

---

## Human Usage Pattern

**Option A — Review URL (simplest)**
1. Receive the `reviewUrl` from the agent (via email, Slack, etc.)
2. Open the URL in any browser
3. Review the context, click Approve or Reject, add optional reason
4. Done — the agent gets the decision on its next poll

**Option B — List pending (dashboard)**
1. `GET /interrupts/pending/:userId` — see all open requests
2. Open individual `reviewUrl`s or call `POST /interrupts/:id/decide` directly

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | API server port |
| `LOOPIN_BASE_URL` | `http://localhost:3002` | Public base URL for review links |
| `API_KEY_SECRET` | _(none)_ | Optional: require `X-API-Key` header on all requests |

---

## Colossal API Portfolio

LoopIn is part of the [Colossal API](https://colossal-api.com) suite of infrastructure APIs for AI agents:

- **SubRadar** — Subscription detection and cancellation
- **MeetSync** — Calendar negotiation and scheduling
- **LoopIn** — Human-in-the-loop interrupt and approval

All products share the same design philosophy: simple REST APIs with MCP server wrappers so agents can use them natively.
