import { store } from '../db/store';

async function fireCallback(callbackUrl: string, interruptId: string): Promise<void> {
  try {
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interruptId, status: 'expired' }),
    });
  } catch {
    // callback failures are non-fatal
  }
}

export function startExpiryChecker(): NodeJS.Timeout {
  return setInterval(() => {
    const expired = store.listExpired();
    for (const interrupt of expired) {
      interrupt.status = 'expired';
      store.set(interrupt);

      if (interrupt.callbackUrl) {
        void fireCallback(interrupt.callbackUrl, interrupt.id);
      }
    }
    if (expired.length > 0) {
      process.stderr.write(`Expired ${expired.length} interrupt(s)\n`);
    }
  }, 60_000);
}
