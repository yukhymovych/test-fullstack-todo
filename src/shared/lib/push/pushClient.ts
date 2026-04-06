import { WEB_PUSH_VAPID_PUBLIC_KEY } from '@/shared/config/env';
const SERVICE_WORKER_READY_TIMEOUT_MS = 8000;

function base64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function supportsWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  let existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  try {
    const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
    await navigator.serviceWorker.register(swUrl, {
      type: import.meta.env.DEV ? 'module' : 'classic',
    });
  } catch {
    // Continue to ready timeout path below.
  }

  const timeoutPromise = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS);
  });
  const readyPromise = (async () => {
    const started = Date.now();
    while (Date.now() - started < SERVICE_WORKER_READY_TIMEOUT_MS) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) return registration;
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 300);
      });
    }
    return navigator.serviceWorker.ready;
  })();

  const ready = await Promise.race([readyPromise, timeoutPromise]);
  return ready;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function createPushSubscription(): Promise<PushSubscription> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service worker is not ready');
  }
  if (!WEB_PUSH_VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key is not configured');
  }
  const keyBytes = base64ToUint8Array(WEB_PUSH_VAPID_PUBLIC_KEY);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes as unknown as BufferSource,
  });
}
