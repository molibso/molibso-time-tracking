import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { isLocalDevLoginEnabled } from "@/lib/dev-login";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm showDevLogin={isLocalDevLoginEnabled()} />
    </Suspense>
  );
}
