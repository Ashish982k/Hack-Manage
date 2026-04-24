export function PageGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/24 via-pink-500/16 to-blue-500/16 blur-3xl opacity-65" />
      <div className="absolute left-[-180px] top-[440px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/12 via-purple-500/12 to-pink-500/12 blur-3xl opacity-65" />
      <div className="absolute right-[-100px] bottom-[-200px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-pink-500/8 via-purple-500/8 to-blue-500/8 blur-3xl opacity-65" />
    </div>
  );
}
