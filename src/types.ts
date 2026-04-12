export type Urgency = 'low' | 'medium' | 'high';
export type InterruptStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type Decision = 'approved' | 'rejected';

export interface Interrupt {
  id: string;
  agentId: string;
  userId: string;
  action: string;
  context: Record<string, unknown>;
  urgency: Urgency;
  status: InterruptStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
  decision?: Decision;
  reason?: string;
  modifiedParams?: Record<string, unknown>;
  callbackUrl?: string;
  reviewUrl: string;
}

export interface CreateInterruptBody {
  agentId: string;
  userId: string;
  action: string;
  context: Record<string, unknown>;
  urgency?: Urgency;
  expiresIn?: number;
  callbackUrl?: string;
}

export interface DecideBody {
  decision: Decision;
  reason?: string;
  modifiedParams?: Record<string, unknown>;
}
