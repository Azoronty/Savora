"use client";

import { Mic, MicOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createProducts, getUsualItems } from "@/lib/actions/products";
import { STORAGE_LABEL, UNIT_LABEL } from "@/lib/domain/constants";
import { parseQuickAdd } from "@/lib/domain/quick-add";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";
import { useSavi } from "@/components/savi/savi-companion";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function speechCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/\.?0+$/, ""));

export function QuickAddForm({ today, onDone }: { today: string; onDone: () => void }) {
  const { run, pending } = useAction();
  const savi = useSavi();
  const [text, setText] = useState("");
  const [dates, setDates] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [usuals, setUsuals] = useState<string[]>([]);
  const [lang, setLang] = useState<"en-US" | "ru-RU">("ru-RU");
  const [heard, setHeard] = useState("");
  const [speech, setSpeech] = useState<"unsupported" | "idle" | "listening">("unsupported");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capabilities are only known after mount
    if (speechCtor()) setSpeech("idle");
    // Russian by default (the audience); English only for English-language browsers.
    if (navigator.language.toLowerCase().startsWith("en")) setLang("en-US");
    getUsualItems().then((r) => r.ok && setUsuals(r.data));
    return () => recognition.current?.stop();
  }, []);

  const items = useMemo(() => parseQuickAdd(text, today).map((item, i) => ({ ...item, id: `${i}:${item.name}` })), [text, today]);
  const kept = items.filter((i) => !removed.has(i.id)).map((i) => ({ ...i, expires_on: dates[i.id] ?? i.expires_on }));

  const listen = () => {
    if (speech === "listening") return recognition.current?.stop();
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true; // show words as they are heard
    r.continuous = true;
    r.onresult = (e) => {
      let said = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) said += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setHeard(interim);
      if (said.trim()) setText((t) => (t.trim() ? `${t.trim()}, ${said.trim()}` : said.trim()));
    };
    r.onerror = (e) => setVoiceError(e.error === "not-allowed" ? "Microphone access is blocked for this site." : "Didn't catch that. Try again or type the list.");
    r.onend = () => {
      setSpeech("idle");
      setHeard("");
    };
    recognition.current = r;
    setVoiceError(null);
    setSpeech("listening");
    r.start();
  };

  const save = async () => {
    const r = await run(() =>
      createProducts(
        kept.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          storage: i.storage,
          purchased_on: today,
          expires_on: i.expires_on,
          price_cents: null,
          notes: null,
        })),
      ),
    );
    if (r.ok) {
      savi({ type: "product_added", name: kept.length === 1 ? kept[0].name : `${kept.length} products` });
      onDone();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="quick-list" className="mb-1.5 block text-sm font-medium">
          Say or type everything you bought
        </label>
        <div className="relative">
          <textarea
            id="quick-list"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="milk 2 l, eggs 10, spinach, 500 g chicken"
            className={cx(controlClass, "!h-auto min-h-24 resize-y py-2.5 pr-14")}
            aria-describedby="quick-hint"
          />
          {speech !== "unsupported" && (
            <button
              type="button"
              onClick={listen}
              aria-pressed={speech === "listening"}
              aria-label={speech === "listening" ? "Stop listening" : "Speak your list"}
              className={cx(
                "absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-full transition-colors",
                speech === "listening" ? "animate-pulse bg-expired text-card" : "bg-forest text-card hover:bg-forest-deep",
              )}
            >
              {speech === "listening" ? <MicOff className="size-5" aria-hidden="true" /> : <Mic className="size-5" aria-hidden="true" />}
            </button>
          )}
        </div>
        <div id="quick-hint" className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{speech === "listening" ? "Listening… e.g. «молоко 2 литра, яйца 10 штук, шпинат». Pauses are fine." : "Commas or “and” separate items. Russian works too: «молоко 2 л, яйца 10»."}</span>
          {speech !== "unsupported" && (
            <span className="inline-flex overflow-hidden rounded-full border border-line" role="group" aria-label="Voice language">
              {(["en-US", "ru-RU"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={cx("px-2 py-0.5", lang === l ? "bg-forest text-card" : "hover:bg-paper-deep")}>
                  {l === "en-US" ? "EN" : "RU"}
                </button>
              ))}
            </span>
          )}
        </div>
        {heard && <p className="mt-1 text-sm italic text-muted" aria-live="polite">{heard}…</p>}
        {voiceError && <p className="mt-1 text-xs text-expired">{voiceError}</p>}
      </div>

      {usuals.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted">Your usuals</p>
          <div className="flex flex-wrap gap-2">
            {usuals.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${u}` : u))}
                className="h-8 rounded-full border border-line bg-card px-3 text-sm hover:border-forest-mid"
              >
                + {u}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card" aria-label="Items to add">
          {items.map((item) => {
            const off = removed.has(item.id);
            return (
              <li key={item.id} className={cx("flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm", off && "opacity-40")}>
                <div className="min-w-0 flex-1">
                  <p className={cx("truncate font-medium", off && "line-through")}>{item.name}</p>
                  <p className="text-xs text-muted">
                    {fmtQty(item.quantity)} {UNIT_LABEL[item.unit]} · {STORAGE_LABEL[item.storage].replace("Refrigerator", "Fridge")}
                    {!item.recognised && <span className="text-soon"> · check the date</span>}
                  </p>
                </div>
                <input
                  type="date"
                  aria-label={`Date for ${item.name}`}
                  value={dates[item.id] ?? item.expires_on}
                  min={today}
                  disabled={off}
                  onChange={(e) => setDates((d) => ({ ...d, [item.id]: e.target.value }))}
                  className={cx(controlClass, "!h-9 !w-auto px-2 text-sm")}
                />
                <button
                  type="button"
                  onClick={() => setRemoved((s) => { const n = new Set(s); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
                  aria-label={off ? `Keep ${item.name}` : `Remove ${item.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-paper-deep hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && <p className="text-xs text-muted">Dates are typical shelf lives. Use the date on the package when it differs.</p>}

      <Button pending={pending} disabled={kept.length === 0} onClick={save}>
        {kept.length ? `Add ${kept.length} ${kept.length === 1 ? "product" : "products"}` : "Add products"}
      </Button>
    </div>
  );
}
