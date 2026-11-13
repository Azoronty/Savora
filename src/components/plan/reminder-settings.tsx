"use client";

import { Bell, BellOff, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, sendTestReminder, setReminderHour } from "@/lib/actions/reminders";
import type { ReminderState } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";
import { useLang, useT } from "@/components/i18n/lang-provider";

type Support = "checking" | "ok" | "ios-install" | "unsupported" | "denied";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const timeFormat = (lang: string) => new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ReminderSettings({ vapidKey, hour, devices, lastSent }: { vapidKey: string } & ReminderState) {
  const { run, pending } = useAction();
  const t = useT();
  const lang = useLang();
  const [support, setSupport] = useState<Support>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [busy, setBusy] = useState<"on" | "off" | "test" | null>(null);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capabilities are only known after mount
      setSupport(ios && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") setSupport("denied");
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscription(sub);
        if (Notification.permission !== "denied") setSupport("ok");
      })
      .catch(() => setSupport("unsupported"));
  }, []);

  const turnOn = async () => {
    setBusy("on");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupport(permission === "denied" ? "denied" : "ok");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) });
      const json = sub.toJSON();
      const r = await run(() =>
        savePushSubscription({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", userAgent: navigator.userAgent.slice(0, 300) }),
      );
      if (r.ok) setSubscription(sub);
      else await sub.unsubscribe();
    } finally {
      setBusy(null);
    }
  };

  const turnOff = async () => {
    if (!subscription) return;
    setBusy("off");
    try {
      await run(() => removePushSubscription(subscription.endpoint));
      await subscription.unsubscribe();
      setSubscription(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-card p-5" aria-labelledby="reminders-heading">
      <p className="eyebrow mb-2">{t("Morning reminder")}</p>
      <h2 id="reminders-heading" className="text-lg font-medium leading-snug">
        {t("A push notification when food is about to reach its date")}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {t("Every morning Savora checks your kitchen and sends what reaches its date by tomorrow, plus today's rescue meal. Sent by the server even when the site is closed.")}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {!vapidKey ? (
          <p className="text-sm text-muted">{t("Reminders are being set up on the server.")}</p>
        ) : support === "checking" ? null : support === "ios-install" ? (
          <p className="rounded-lg bg-paper-deep p-3 text-sm text-ink-2">
            {t("On iPhone, notifications work for apps on the Home Screen: tap")} <b>{t("Share → Add to Home Screen")}</b>{t(", open Savora from there and turn reminders on.")}
          </p>
        ) : support === "unsupported" ? (
          <p className="text-sm text-muted">{t("This browser can't receive push notifications. Try Chrome, Edge, Firefox or Safari 16.4+.")}</p>
        ) : support === "denied" ? (
          <p className="text-sm text-muted">{t("Notifications are blocked for this site. Allow them in your browser's site settings, then reload.")}</p>
        ) : subscription ? (
          <>
            <Button pending={busy === "test" && pending} onClick={async () => { setBusy("test"); await run(sendTestReminder); setBusy(null); }}>
              {busy !== "test" && <Send className="size-4" aria-hidden="true" />} {t("Send a test reminder now")}
            </Button>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-2">{t("Daily at")}</span>
              <select
                className={`${controlClass} !h-9 !w-28`}
                defaultValue={hour}
                onChange={(e) => run(() => setReminderHour(Number(e.target.value)))}
                aria-label={t("Reminder time")}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <Button variant="secondary" size="sm" pending={busy === "off" && pending} onClick={turnOff}>
              {busy !== "off" && <BellOff className="size-4" aria-hidden="true" />} {t("Turn off on this device")}
            </Button>
          </>
        ) : (
          <Button pending={busy === "on"} onClick={turnOn}>
            {busy !== "on" && <Bell className="size-4" aria-hidden="true" />} {t("Turn on reminders")}
          </Button>
        )}
      </div>

      <dl className="mt-4 border-t border-line pt-3 text-xs text-muted">
        <div className="flex justify-between gap-3">
          <dt>{t("Devices registered")}</dt>
          <dd className="tabular text-ink-2">{devices}</dd>
        </div>
        <div className="mt-1.5">
          <dt>{t("Last reminder sent")}</dt>
          <dd className="mt-0.5 text-ink-2">
            {lastSent
              ? `${timeFormat(lang).format(new Date(lastSent.sentAt))} · ${t(lastSent.kind === "daily" ? "daily" : "test")} · ${t("delivered to {a} of {b}", { a: lastSent.delivered, b: lastSent.devices })} · “${t(lastSent.title)}”`
              : t("None yet")}
          </dd>
        </div>
      </dl>
    </section>
  );
}
