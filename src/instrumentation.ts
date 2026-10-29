export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalState = globalThis as typeof globalThis & { __workforceSweep?: ReturnType<typeof setInterval> };
  if (globalState.__workforceSweep) return;

  const { runWorkforceSweep } = await import("@/lib/workforce-sweep");
  const tick = () => {
    void runWorkforceSweep().catch((error) => {
      console.error("[workforce] sweep failed", error);
    });
  };

  tick();
  globalState.__workforceSweep = setInterval(tick, 60_000);
}
