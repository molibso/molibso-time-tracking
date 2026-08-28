import { redirect } from "next/navigation";

/** Auth routing is handled by middleware — send `/` straight to the dashboard. */
export default function RootPage() {
  redirect("/dashboard");
}
