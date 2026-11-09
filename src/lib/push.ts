import "server-only";
import webpush from "web-push";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };
export type PushOutcome = { endpoint: string; ok: boolean; gone: boolean };

let configured = false;

/** True when the server has the keys needed to sign push messages. */
export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://savora-mauve.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Send one notification to each device. 404/410 mean the subscription is gone and can be removed. */
export async function sendPush(targets: PushTarget[], payload: PushPayload): Promise<PushOutcome[]> {
  configure();
  const body = JSON.stringify({ url: "/app/plan", tag: "savora-daily", ...payload });
  return Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, { TTL: 6 * 3600, urgency: "normal" });
        return { endpoint: t.endpoint, ok: true, gone: false };
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        console.error("[savora] push failed", status);
        return { endpoint: t.endpoint, ok: false, gone: status === 404 || status === 410 };
      }
    }),
  );
}
