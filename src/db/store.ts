import { Interrupt } from '../types';

const db = new Map<string, Interrupt>();

export const store = {
  set(interrupt: Interrupt): void {
    db.set(interrupt.id, interrupt);
  },

  get(id: string): Interrupt | undefined {
    return db.get(id);
  },

  delete(id: string): boolean {
    return db.delete(id);
  },

  listPendingByUser(userId: string): Interrupt[] {
    const results: Interrupt[] = [];
    for (const interrupt of db.values()) {
      if (interrupt.userId === userId && interrupt.status === 'pending') {
        results.push(interrupt);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  listByUser(userId: string): Interrupt[] {
    const results: Interrupt[] = [];
    for (const interrupt of db.values()) {
      if (interrupt.userId === userId) {
        results.push(interrupt);
      }
    }
    return results;
  },

  listExpired(): Interrupt[] {
    const now = new Date();
    const results: Interrupt[] = [];
    for (const interrupt of db.values()) {
      if (interrupt.status === 'pending' && new Date(interrupt.expiresAt) <= now) {
        results.push(interrupt);
      }
    }
    return results;
  },
};
