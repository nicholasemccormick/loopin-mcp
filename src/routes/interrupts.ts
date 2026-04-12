import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { store } from '../db/store';
import { CreateInterruptBody, DecideBody, Interrupt } from '../types';

const router = Router();

const BASE_URL = (process.env['LOOPIN_BASE_URL'] ?? 'http://localhost:3002').replace(/\/$/, '');

// POST /interrupts — create a new interrupt request
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateInterruptBody;

  if (!body.agentId || !body.userId || !body.action || !body.context) {
    res.status(400).json({ error: 'agentId, userId, action, and context are required' });
    return;
  }

  const urgencyValues = ['low', 'medium', 'high'];
  if (body.urgency && !urgencyValues.includes(body.urgency)) {
    res.status(400).json({ error: 'urgency must be low, medium, or high' });
    return;
  }

  const id = randomUUID();
  const now = new Date();
  const expiresIn = body.expiresIn ?? 3600;
  const expiresAt = new Date(now.getTime() + expiresIn * 1000);

  const interrupt: Interrupt = {
    id,
    agentId:    body.agentId,
    userId:     body.userId,
    action:     body.action,
    context:    body.context,
    urgency:    body.urgency ?? 'medium',
    status:     'pending',
    createdAt:  now.toISOString(),
    expiresAt:  expiresAt.toISOString(),
    callbackUrl: body.callbackUrl,
    reviewUrl:  `${BASE_URL}/review/${id}`,
  };

  store.set(interrupt);

  res.status(201).json({
    interruptId: id,
    status:      'pending',
    expiresAt:   interrupt.expiresAt,
    reviewUrl:   interrupt.reviewUrl,
  });
});

// GET /interrupts/pending/:userId — list pending interrupts for a user
router.get('/pending/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const pending = store.listPendingByUser(userId);
  res.json(pending);
});

// GET /interrupts/:interruptId — get interrupt status
router.get('/:interruptId', (req: Request, res: Response) => {
  const interrupt = store.get(req.params['interruptId']!);
  if (!interrupt) {
    res.status(404).json({ error: 'Interrupt not found' });
    return;
  }

  const { id: interruptId, status, action, context, decision, decidedAt, reason, modifiedParams, urgency, createdAt, expiresAt, reviewUrl } = interrupt;
  res.json({ interruptId, status, action, context, urgency, createdAt, expiresAt, reviewUrl, decision, decidedAt, reason, modifiedParams });
});

// POST /interrupts/:interruptId/decide — submit a decision
router.post('/:interruptId/decide', async (req: Request, res: Response) => {
  const interrupt = store.get(req.params['interruptId']!);
  if (!interrupt) {
    res.status(404).json({ error: 'Interrupt not found' });
    return;
  }

  if (interrupt.status !== 'pending') {
    res.status(409).json({ error: `Interrupt is already ${interrupt.status}` });
    return;
  }

  const body = req.body as DecideBody;
  if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
    res.status(400).json({ error: 'decision must be approved or rejected' });
    return;
  }

  const now = new Date().toISOString();
  interrupt.status     = body.decision;
  interrupt.decision   = body.decision;
  interrupt.decidedAt  = now;
  interrupt.reason     = body.reason;
  interrupt.modifiedParams = body.modifiedParams;
  store.set(interrupt);

  if (interrupt.callbackUrl) {
    fetch(interrupt.callbackUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        interruptId: interrupt.id,
        status:      interrupt.status,
        decision:    interrupt.decision,
        decidedAt:   interrupt.decidedAt,
        reason:      interrupt.reason,
        modifiedParams: interrupt.modifiedParams,
      }),
    }).catch(() => { /* non-fatal */ });
  }

  res.json({
    interruptId: interrupt.id,
    status:      'resolved',
    decision:    interrupt.decision,
    decidedAt:   interrupt.decidedAt,
  });
});

// DELETE /interrupts/:interruptId — cancel a pending interrupt
router.delete('/:interruptId', (req: Request, res: Response) => {
  const interrupt = store.get(req.params['interruptId']!);
  if (!interrupt) {
    res.status(404).json({ error: 'Interrupt not found' });
    return;
  }

  if (interrupt.status !== 'pending') {
    res.status(409).json({ error: `Cannot cancel an interrupt with status: ${interrupt.status}` });
    return;
  }

  interrupt.status = 'cancelled';
  store.set(interrupt);

  res.status(200).json({ interruptId: interrupt.id, status: 'cancelled' });
});

export default router;
