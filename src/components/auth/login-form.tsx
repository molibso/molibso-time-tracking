"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { beginSignIn } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocale } from "@/components/layout/locale-provider";

type Step =
  | { kind: "password" }
  | { kind: "setup"; email: string; password: string; qrDataUrl: string; secret: string }
  | { kind: "code"; email: string; password: string };

function groupedSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [code, setCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onPassword(data: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await beginSignIn(data);
    setIsSubmitting(false);
    if (!result.ok) {
      setServerError(t("login.error"));
      return;
    }
    if (result.step === "setup") {
      setStep({ kind: "setup", email: data.email, password: data.password, qrDataUrl: result.qrDataUrl, secret: result.secret });
    } else {
      setStep({ kind: "code", email: data.email, password: data.password });
    }
    setCode("");
  }

  async function onCode(event: React.FormEvent) {
    event.preventDefault();
    if (step.kind === "password") return;
    setServerError(null);
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email: step.email,
      password: step.password,
      code,
      redirect: false,
    });
    setIsSubmitting(false);
    if (result?.error) {
      setServerError(t("login.codeError"));
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  function back() {
    setServerError(null);
    setCode("");
    setStep({ kind: "password" });
  }

  if (step.kind !== "password") {
    const setup = step.kind === "setup";
    return (
      <form onSubmit={onCode} className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t(setup ? "login.setupTitle" : "login.codeTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t(setup ? "login.setupSubtitle" : "login.codeSubtitle")}
          </p>
        </div>

        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        {setup && (
          <div className="space-y-3">
            <div className="flex justify-center rounded-xl border border-border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={step.qrDataUrl} alt="" width={196} height={196} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t("login.manualKey")}</p>
              <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-center font-mono text-sm tracking-wide text-foreground">
                {groupedSecret(step.secret)}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="code">{t("login.codeLabel")}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 rounded-xl text-center font-mono text-lg tracking-[0.3em]"
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting || code.length !== 6}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? t("login.verifying") : t(setup ? "login.confirm" : "login.signIn")}
        </Button>

        <button type="button" onClick={back} className="w-full text-center text-xs font-medium text-petrol hover:underline">
          {t("login.back")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onPassword)} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("login.welcome")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("login.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("ph.emailWork")}
            autoComplete="email"
            className="h-11 rounded-xl"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-petrol hover:underline">
              {t("login.forgot")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-11 rounded-xl"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? t("login.submitting") : t("login.signIn")}
      </Button>
    </form>
  );
}
