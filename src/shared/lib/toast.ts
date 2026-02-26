/**
 * Minimal toast: call showToast(msg) from anywhere. Toaster component must be mounted.
 */
type Listener = (message: string) => void;
const listeners: Listener[] = [];

export function showToast(message: string): void {
  listeners.forEach((l) => l(message));
}

export function addToastListener(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}
