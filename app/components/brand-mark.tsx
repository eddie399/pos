export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/70 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-2xl font-black leading-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_3px_6px_rgba(15,23,42,0.25)] ${className}`}
    >
      <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_2px_1px_rgba(15,23,42,0.65)]">
        D
      </span>
    </span>
  );
}
