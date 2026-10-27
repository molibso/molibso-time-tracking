"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLocale } from "@/components/layout/locale-provider";
import { intlLocale, type MessageKey } from "@/lib/i18n/messages";
import { leaveStatusKey } from "@/lib/i18n/labels";
import { formatDate, formatDateRange } from "@/lib/utils";
import { formatEuros } from "@/lib/expenses";
import {
  addExpenseLine,
  createTravelRequest,
  deleteExpenseLine,
  reviewExpenseClaim,
  submitExpenseClaim,
} from "@/actions/expenses";

export type TripRow = {
  id: string;
  employeeName?: string | null;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
  reviewComment: string | null;
  claim: {
    id: string;
    status: string;
    reviewComment: string | null;
    lines: { id: string; kind: string; spentOn: string; description: string; amountCents: number; hasReceipt: boolean }[];
  } | null;
};

export type ClaimQueueRow = {
  id: string;
  employeeName: string;
  destination: string;
  purpose: string;
  totalCents: number;
  lines: { id: string; kind: string; description: string; amountCents: number; hasReceipt: boolean }[];
};

const KIND_KEY: Record<string, MessageKey> = {
  RECEIPT: "expenses.kind.RECEIPT",
  MILEAGE: "expenses.kind.MILEAGE",
  MEAL: "expenses.kind.MEAL",
};

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  if (status === "APPROVED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "muted";
}

export function ExpensesView({
  canApprove,
  trips,
  history,
  claimQueue,
}: {
  canApprove: boolean;
  trips: TripRow[];
  history: TripRow[];
  claimQueue: ClaimQueueRow[];
}) {
  const { locale, t } = useLocale();
  const money = (cents: number) => formatEuros(cents, intlLocale(locale));

  function statusLabel(status: string) {
    if (status === "DRAFT") return t("expenses.status.DRAFT");
    const key = leaveStatusKey(status);
    return key ? t(key) : status;
  }

  const tripsList = (items: TripRow[], readOnly: boolean) => (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <TravelDialog />
        </div>
      )}
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("expenses.empty")}</p>
      ) : (
        items.map((trip) => (
          <TripCard key={trip.id} trip={trip} money={money} statusLabel={statusLabel} readOnly={readOnly} />
        ))
      )}
    </div>
  );

  if (!canApprove) return <Card><CardContent className="pt-5">{tripsList(trips, false)}</CardContent></Card>;

  return (
    <Tabs defaultValue="history">
      <TabsList>
        <TabsTrigger value="history">{t("expenses.history")}</TabsTrigger>
        <TabsTrigger value="approvals">
          {t("expenses.approvals")} {claimQueue.length > 0 && `(${claimQueue.length})`}
        </TabsTrigger>
        <TabsTrigger value="mine">{t("expenses.myTrips")}</TabsTrigger>
      </TabsList>
      <TabsContent value="history">
        <Card><CardContent className="pt-5">{tripsList(history, true)}</CardContent></Card>
      </TabsContent>
      <TabsContent value="approvals">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <h2 className="text-sm font-semibold">{t("expenses.claimQueue")}</h2>
            {claimQueue.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("expenses.nonePending")}</p>
            ) : (
              claimQueue.map((claim) => (
                <ReviewRow
                  key={claim.id}
                  title={`${claim.employeeName} · ${money(claim.totalCents)}`}
                  detail={claim.destination}
                  note={claim.lines.map((line) => `${t(KIND_KEY[line.kind] ?? "expenses.kind.RECEIPT")}: ${line.description} (${money(line.amountCents)})`).join(" · ")}
                  receiptIds={claim.lines.filter((line) => line.hasReceipt).map((line) => line.id)}
                  onReview={(status, reviewComment) => reviewExpenseClaim({ id: claim.id, status, reviewComment })}
                />
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="mine">
        <Card><CardContent className="pt-5">{tripsList(trips, false)}</CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

function ReviewRow({
  title,
  detail,
  note,
  receiptIds = [],
  onReview,
}: {
  title: string;
  detail: string;
  note: string;
  receiptIds?: string[];
  onReview: (status: "APPROVED" | "REJECTED", reviewComment?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();

  function review(status: "APPROVED" | "REJECTED") {
    start(async () => {
      const result = await onReview(status, comment);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
          <p className="mt-1 text-sm">{note}</p>
          {receiptIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {receiptIds.map((id) => (
                <a key={id} href={`/api/receipts/${id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-petrol hover:underline">
                  {t("expenses.receiptPhoto")}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("ph.optionalComment")} className="h-9 w-40" />
          <Button size="sm" variant="success" disabled={pending} onClick={() => review("APPROVED")}>{t("leave.status.APPROVED")}</Button>
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => review("REJECTED")}>{t("leave.status.REJECTED")}</Button>
        </div>
      </div>
    </div>
  );
}

function TripCard({
  trip,
  money,
  statusLabel,
  readOnly,
}: {
  trip: TripRow;
  money: (cents: number) => string;
  statusLabel: (status: string) => string;
  readOnly: boolean;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const editable = !readOnly && trip.claim && (trip.claim.status === "DRAFT" || trip.claim.status === "REJECTED");
  const total = trip.claim?.lines.reduce((sum, line) => sum + line.amountCents, 0) ?? 0;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {trip.employeeName && <p className="text-sm font-medium text-petrol">{trip.employeeName}</p>}
          <p className="font-medium">{trip.destination}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateRange(trip.startDate, trip.endDate, locale)} · {trip.purpose}
          </p>
        </div>
      </div>

      {trip.claim && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {t("expenses.total")}: {money(total)}
            </p>
            <Badge variant={statusVariant(trip.claim.status)}>{statusLabel(trip.claim.status)}</Badge>
          </div>
          {trip.claim.reviewComment && <p className="text-sm text-muted-foreground">{trip.claim.reviewComment}</p>}
          <ul className="space-y-2">
            {trip.claim.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{formatDate(line.spentOn, locale)} · </span>
                  {t(KIND_KEY[line.kind] ?? "expenses.kind.RECEIPT")} — {line.description}
                  {line.hasReceipt && (
                    <>
                      {" · "}
                      <a href={`/api/receipts/${line.id}`} target="_blank" rel="noreferrer" className="font-medium text-petrol hover:underline">
                        {t("expenses.receiptPhoto")}
                      </a>
                    </>
                  )}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {money(line.amountCents)}
                  {editable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("common.cancel")}
                      onClick={() =>
                        start(async () => {
                          const result = await deleteExpenseLine(line.id);
                          if (result.success) router.refresh();
                          else toast.error(result.error);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {editable && <LineForm claimId={trip.claim.id} />}
          {editable && trip.claim.lines.length > 0 && (
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await submitExpenseClaim(trip.claim!.id);
                  if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                  } else toast.error(result.error);
                })
              }
            >
              {t("expenses.submitClaim")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LineForm({ claimId }: { claimId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [kind, setKind] = useState<"RECEIPT" | "MILEAGE" | "MEAL">("RECEIPT");
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("claimId", claimId);
    data.set("kind", kind);
    if (kind === "MEAL") {
      data.set("fullDay", (form.elements.namedItem("fullDay") as HTMLInputElement).checked ? "1" : "0");
      data.set("breakfast", (form.elements.namedItem("breakfast") as HTMLInputElement).checked ? "1" : "0");
      data.set("lunch", (form.elements.namedItem("lunch") as HTMLInputElement).checked ? "1" : "0");
      data.set("dinner", (form.elements.namedItem("dinner") as HTMLInputElement).checked ? "1" : "0");
    }
    start(async () => {
      const result = await addExpenseLine(data);
      if (result.success) {
        toast.success(result.message);
        form.reset();
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl bg-muted/40 p-3">
      <div className="flex flex-wrap gap-2">
        {(["RECEIPT", "MILEAGE", "MEAL"] as const).map((item) => (
          <Button key={item} type="button" size="sm" variant={kind === item ? "default" : "outline"} onClick={() => setKind(item)}>
            {t(item === "RECEIPT" ? "expenses.addReceipt" : item === "MILEAGE" ? "expenses.addMileage" : "expenses.addMeal")}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`date-${claimId}`}>{t("expenses.lineDate")}</Label>
          <Input id={`date-${claimId}`} name="spentOn" type="date" required />
        </div>
        {kind === "RECEIPT" && (
          <div className="space-y-1.5">
            <Label htmlFor={`amount-${claimId}`}>{t("expenses.amount")}</Label>
            <Input id={`amount-${claimId}`} name="amount" inputMode="decimal" required placeholder="0.00" />
          </div>
        )}
        {kind === "MILEAGE" && (
          <div className="space-y-1.5">
            <Label htmlFor={`km-${claimId}`}>{t("expenses.km")}</Label>
            <Input id={`km-${claimId}`} name="kilometers" inputMode="decimal" required placeholder="0" />
          </div>
        )}
      </div>
      {kind === "RECEIPT" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`desc-${claimId}`}>{t("expenses.description")}</Label>
            <Input id={`desc-${claimId}`} name="description" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`photo-${claimId}`}>{t("expenses.receiptPhoto")}</Label>
            <Input id={`photo-${claimId}`} name="receipt" type="file" accept="image/*" capture="environment" required />
          </div>
        </>
      )}
      {kind === "MILEAGE" && <p className="text-xs text-muted-foreground">{t("expenses.mileageHint")}</p>}
      {kind === "MEAL" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("expenses.mealHint")}</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fullDay" /> {t("expenses.fullDay")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="breakfast" /> {t("expenses.breakfast")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lunch" /> {t("expenses.lunch")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="dinner" /> {t("expenses.dinner")}</label>
          <p className="text-xs text-muted-foreground">{t("expenses.partialDay")}</p>
        </div>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("expenses.addLine")}
      </Button>
    </form>
  );
}

function TravelDialog() {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    start(async () => {
      const result = await createTravelRequest({
        destination: String(data.get("destination") ?? ""),
        purpose: String(data.get("purpose") ?? ""),
        startDate: String(data.get("startDate") ?? ""),
        endDate: String(data.get("endDate") ?? ""),
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> {t("expenses.request")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("expenses.requestTitle")}</DialogTitle>
          <DialogDescription>{t("expenses.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="destination">{t("expenses.destination")}</Label>
            <Input id="destination" name="destination" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purpose">{t("expenses.purpose")}</Label>
            <Textarea id="purpose" name="purpose" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">{t("leave.startDate")}</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">{t("leave.endDate")}</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("expenses.request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
