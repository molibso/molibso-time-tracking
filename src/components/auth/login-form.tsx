"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocale } from "@/components/layout/locale-provider";
import { DEV_ACCOUNTS } from "@/lib/dev-login";

export function LoginForm({ showDevLogin = false }: { showDevLogin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function finishSignIn(result: { error?: string } | undefined, devShortcut: boolean) {
    setIsSubmitting(false);
    if (result?.error) {
      setServerError(
        devShortcut
          ? "Dummy sign-in failed. Start the local database and apply migrations, then try again."
          : t("login.error"),
      );
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    await finishSignIn(result ?? undefined, false);
  }

  async function signInAsDummy(email: string) {
    setServerError(null);
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      email,
      password: "local-dev",
      devShortcut: "1",
      redirect: false,
    });
    await finishSignIn(result ?? undefined, true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

      {showDevLogin && (
        <div className="space-y-3 border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium">Local development</p>
            <p className="text-sm text-muted-foreground">Open the app with dummy data. This block is not shown in production.</p>
          </div>
          <div className="grid gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start whitespace-normal px-3 py-2.5"
                disabled={isSubmitting}
                onClick={() => signInAsDummy(account.email)}
              >
                <span className="text-left">
                  <span className="block font-medium">Continue as {account.label}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{account.hint}</span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
