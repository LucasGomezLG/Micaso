export default function Loading() {
  return (
    <div
      className="flex h-[50vh] w-full animate-pulse items-center justify-center rounded-2xl border text-sm"
      style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}
    >
      Cargando...
    </div>
  );
}
