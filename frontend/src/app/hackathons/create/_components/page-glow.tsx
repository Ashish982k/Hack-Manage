export function PageGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-blue-500/20 blur-3xl opacity-70" />
      <div className="absolute left-[-180px] top-[440px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-pink-500/15 blur-3xl opacity-70" />
      <div className="absolute right-[-100px] bottom-[-200px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 blur-3xl opacity-70" />
    </div>
  );
}
