import { Router, Request, Response } from 'express';
import { store } from '../db/store';

const router = Router();

// GET /analytics/:userId
router.get('/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const all = store.listByUser(userId);

  if (all.length === 0) {
    res.json({
      userId,
      totalInterrupts:     0,
      approvalRate:        null,
      avgResponseTimeMs:   null,
      byStatus:            {},
      byUrgency:           {},
      topActionTypes:      [],
    });
    return;
  }

  const resolved = all.filter(i => i.decision !== undefined && i.decidedAt !== undefined);
  const approved = resolved.filter(i => i.decision === 'approved');

  const approvalRate = resolved.length > 0 ? approved.length / resolved.length : null;

  let totalResponseMs = 0;
  for (const i of resolved) {
    totalResponseMs += new Date(i.decidedAt!).getTime() - new Date(i.createdAt).getTime();
  }
  const avgResponseTimeMs = resolved.length > 0 ? Math.round(totalResponseMs / resolved.length) : null;

  const byStatus: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};

  for (const i of all) {
    byStatus[i.status]   = (byStatus[i.status]   ?? 0) + 1;
    byUrgency[i.urgency] = (byUrgency[i.urgency] ?? 0) + 1;
    actionCounts[i.action] = (actionCounts[i.action] ?? 0) + 1;
  }

  const topActionTypes = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  res.json({
    userId,
    totalInterrupts:   all.length,
    approvalRate,
    avgResponseTimeMs,
    byStatus,
    byUrgency,
    topActionTypes,
  });
});

export default router;
