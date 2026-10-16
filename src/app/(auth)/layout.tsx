import { LanguageToggle } from "@/components/layout/language-toggle";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — guidelines: Deep Petrol → Petrol gradient, cyan accents */}
      <div className="relative hidden flex-col justify-between overflow-hidden brand-gradient p-12 text-white lg:flex lg:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #40c0f0 0%, transparent 40%), radial-gradient(circle at 80% 80%, #0498af 0%, transparent 35%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10">
          <p className="text-2xl font-bold lowercase tracking-tight text-white">molibso</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#40c0f0]">
            {translate(locale, "common.internal")}
          </p>
        </div>

        <div className="relative z-10 max-w-md animate-slide-up">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            {translate(locale, "auth.moving")}{" "}
            <span className="text-[#40c0f0]">{translate(locale, "auth.better")}</span>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-white/70">
            {translate(locale, "auth.blurb")}
          </p>
          <div className="mt-10 flex gap-2">
            <span className="h-1.5 w-10 rounded-full bg-[#40c0f0]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} molibso Entwicklungs- und Vertriebs GmbH · Langenfeld
        </p>
      </div>

      {/* Form side — Personio-like calm canvas */}
      <div className="relative flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <LanguageToggle />
        </div>
        <div className="absolute inset-0 lg:hidden brand-gradient opacity-95" />
        <div className="relative z-10 w-full max-w-[400px] animate-slide-up rounded-3xl border border-border/60 bg-surface p-8 shadow-elevated lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-8 lg:hidden">
            <p className="text-xl font-bold lowercase tracking-tight text-petrol">molibso</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">{translate(locale, "common.internal")}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
