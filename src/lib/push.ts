import { api } from "./api";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type PushState = "unsupported" | "denied" | "off" | "on";

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Ask permission, subscribe this device, and register it with the API. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) {
    throw new Error(
      "Notifications aren't available here. On iPhone, install the app to your Home Screen first (Share → Add to Home Screen) and open it from there.",
    );
  }
  const { key } = await api<{ key: string | null }>("/api/push/vapid-key");
  if (!key) throw new Error("Push isn't configured on the server yet");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was declined");
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  const label = /iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : "Computer";
  await api("/api/push/subscriptions", {
    method: "POST",
    body: JSON.stringify({ subscription: sub.toJSON(), label }),
  });
}

/** Unsubscribe this device and remove it from the API. */
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/push/subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe();
}
