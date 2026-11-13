"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The root layout (and its language provider) is gone here, so read the switcher's cookie directly.
  const ru = typeof document !== "undefined" && /(?:^|; )savora-lang=ru/.test(document.cookie);
  return (
    <html lang={ru ? "ru" : "en"}>
      <body style={{ fontFamily: "system-ui", background: "#f5f1e8", color: "#18211c", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontWeight: 400 }}>{ru ? "В Savora произошла непредвиденная ошибка." : "Savora hit an unexpected problem."}</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 8, border: 0, background: "#1e3a2b", color: "#fbf9f4", cursor: "pointer" }}>
            {ru ? "Попробовать снова" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}
