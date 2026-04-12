import { Router, Request, Response } from 'express';
import { store } from '../db/store';

const router = Router();

router.get('/:interruptId', (req: Request, res: Response) => {
  const interrupt = store.get(req.params['interruptId']!);

  if (!interrupt) {
    res.status(404).send('<h1>Interrupt not found</h1>');
    return;
  }

  const urgencyColor: Record<string, string> = {
    low:    '#22c55e',
    medium: '#f59e0b',
    high:   '#ef4444',
  };

  const color = urgencyColor[interrupt.urgency] ?? '#6b7280';
  const contextJson = JSON.stringify(interrupt.context, null, 2);
  const isResolved = interrupt.status !== 'pending';

  const resolvedBanner = isResolved ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
      <strong style="font-size:18px;color:#16a34a;">
        This interrupt has been ${interrupt.status.toUpperCase()}
        ${interrupt.decidedAt ? `on ${new Date(interrupt.decidedAt).toLocaleString()}` : ''}
      </strong>
      ${interrupt.reason ? `<p style="margin:8px 0 0;color:#166534;">Reason: ${escapeHtml(interrupt.reason)}</p>` : ''}
    </div>` : '';

  const actionButtons = isResolved ? '' : `
    <form id="decideForm" style="margin-top:32px;">
      <div style="margin-bottom:16px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;color:#374151;">
          Reason (optional)
        </label>
        <textarea id="reason" rows="3" placeholder="Explain your decision..."
          style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <button type="button" onclick="decide('approved')"
          style="flex:1;padding:14px;background:#16a34a;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">
          ✓ Approve
        </button>
        <button type="button" onclick="decide('rejected')"
          style="flex:1;padding:14px;background:#dc2626;color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">
          ✗ Reject
        </button>
      </div>
    </form>
    <div id="result" style="display:none;margin-top:16px;padding:16px;border-radius:8px;text-align:center;font-weight:600;font-size:16px;"></div>
    <script>
      async function decide(decision) {
        const reason = document.getElementById('reason').value.trim();
        const body = { decision };
        if (reason) body.reason = reason;
        try {
          const r = await fetch('/interrupts/${interrupt.id}/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await r.json();
          const result = document.getElementById('result');
          result.style.display = 'block';
          if (r.ok) {
            result.style.background = decision === 'approved' ? '#f0fdf4' : '#fef2f2';
            result.style.color = decision === 'approved' ? '#16a34a' : '#dc2626';
            result.style.border = decision === 'approved' ? '1px solid #86efac' : '1px solid #fca5a5';
            result.textContent = 'Decision recorded: ' + decision.toUpperCase();
            document.getElementById('decideForm').style.display = 'none';
          } else {
            result.style.background = '#fef2f2';
            result.style.color = '#dc2626';
            result.style.border = '1px solid #fca5a5';
            result.textContent = 'Error: ' + (data.error || 'Unknown error');
          }
        } catch (e) {
          alert('Failed to submit decision. Please try again.');
        }
      }
    </script>`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LoopIn Review — ${escapeHtml(interrupt.action)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; padding: 24px; }
    .card { max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    pre { background: #f3f4f6; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .meta { color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:between;margin-bottom:24px;gap:12px;">
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:4px;">LoopIn — Human Review Required</div>
        <h1 style="font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${escapeHtml(interrupt.action)}</h1>
      </div>
      <span class="badge" style="background:${color}22;color:${color};">${interrupt.urgency}</span>
    </div>

    ${resolvedBanner}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:#f9fafb;border-radius:8px;padding:12px;">
        <div class="meta">Agent ID</div>
        <div style="font-weight:600;margin-top:2px;font-size:14px;">${escapeHtml(interrupt.agentId)}</div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:12px;">
        <div class="meta">Requested by</div>
        <div style="font-weight:600;margin-top:2px;font-size:14px;">${escapeHtml(interrupt.userId)}</div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:12px;">
        <div class="meta">Created</div>
        <div style="font-weight:600;margin-top:2px;font-size:14px;">${new Date(interrupt.createdAt).toLocaleString()}</div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:12px;">
        <div class="meta">Expires</div>
        <div style="font-weight:600;margin-top:2px;font-size:14px;">${new Date(interrupt.expiresAt).toLocaleString()}</div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <h2 style="font-size:15px;font-weight:700;margin-bottom:10px;color:#374151;">Context</h2>
      <pre>${escapeHtml(contextJson)}</pre>
    </div>

    ${actionButtons}
  </div>
</body>
</html>`);
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default router;
