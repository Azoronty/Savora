import Link from "next/link";

/** The SAVORA mark: the orange-slice "O" with its sprout, taken from the wordmark. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small brand mark, same file everywhere
    <img src="/brand/mark.webp" alt="" aria-hidden="true" width={252} height={369} className={`${className} object-contain`} />
  );
}

/** The SAVORA wordmark: a high-contrast serif with an orange slice for the "O". */
export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "paper" }) {
  return (
    <Link href={href} className="group inline-flex flex-col items-start gap-1 rounded-md" aria-label="SAVORA home">
      {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
      <img
        src={tone === "paper" ? "/brand/wordmark-light.webp" : "/brand/wordmark.webp"}
        alt=""
        width={1174}
        height={373}
        className="h-10 w-auto transition-transform duration-500 ease-out group-hover:-translate-y-0.5"
      />
      <span className={`pl-0.5 font-mono text-[0.55rem] uppercase tracking-[0.24em] ${tone === "paper" ? "text-paper/70" : "text-muted"}`}>Save food · Save tomorrow</span>
    </Link>
  );
}
