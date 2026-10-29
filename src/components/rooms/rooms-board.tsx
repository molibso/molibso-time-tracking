"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/app-toast";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cancelReservation, reserveRoom } from "@/actions/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/layout/locale-provider";
import { intlLocale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export type ReservationRow = {
  id: string;
  title: string;
  start: string;
  end: string;
  who: string;
  canCancel: boolean;
};

function startOfWeek(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function RoomsBoard({
  resources,
}: {
  resources: { id: string; kind: "room" | "car"; reservations: ReservationRow[] }[];
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [bookDate, setBookDate] = useState(() => dateInput(new Date()));
  const [selectedId, setSelectedId] = useState(resources[0]?.id ?? "");
  const selected = resources.find((resource) => resource.id === selectedId) ?? resources[0];
  const reservations = selected?.reservations ?? [];
  const roomId = selected?.id ?? "";
  const tag = intlLocale(locale);
  const now = new Date();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    }),
    [weekStart],
  );

  const current = reservations.find((item) => {
    const start = new Date(item.start);
    const end = new Date(item.end);
    return start <= now && end > now;
  });

  function shiftWeek(delta: number) {
    setWeekStart((currentStart) => {
      const next = new Date(currentStart);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const date = String(formData.get("date") ?? "");
    const startText = String(formData.get("start") ?? "");
    const endText = String(formData.get("end") ?? "");
    const startMs = new Date(`${date}T${startText}`).getTime();
    const endMs = new Date(`${date}T${endText}`).getTime();
    if (Number.isFinite(startMs) && startMs < Date.now() - 60_000) {
      toast.error(t("rooms.past"));
      return;
    }
    const clash = reservations.find((item) => new Date(item.start).getTime() < endMs && new Date(item.end).getTime() > startMs);
    if (clash && Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      toast.error(
        t("rooms.taken", {
          name: clash.who,
          time: new Date(clash.end).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
        }),
      );
      return;
    }
    startTransition(async () => {
      const result = await reserveRoom({
        roomId,
        title: String(formData.get("title") ?? ""),
        date: String(formData.get("date") ?? ""),
        start: String(formData.get("start") ?? ""),
        end: String(formData.get("end") ?? ""),
      });
      if (result.success) {
        toast.success(result.message);
        form.reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      const result = await cancelReservation(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const weekLabel = `${days[0].toLocaleDateString(tag, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(tag, { month: "short", day: "numeric" })}`;

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
        {resources.map((resource) => (
          <button
            key={resource.id}
            type="button"
            onClick={() => setSelectedId(resource.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              resource.id === selected?.id ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(resource.kind === "car" ? "rooms.car" : "rooms.conference")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className={cn("text-sm font-medium", current ? "text-warning" : "text-success")}>
          {current
            ? t("rooms.inUseBy", {
                name: current.who,
                time: new Date(current.end).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
              })
            : t("rooms.freeNow")}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t("rooms.thisWeek")}
          </Button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium tabular-nums">{weekLabel}</span>
          <Button type="button" variant="outline" size="icon" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const slots = reservations
            .filter((item) => sameDay(new Date(item.start), day))
            .sort((a, b) => a.start.localeCompare(b.start));
          const today = sameDay(day, now);
          return (
            <section
              key={dateInput(day)}
              className={cn(
                "flex min-h-[12rem] flex-col rounded-2xl border bg-surface p-3",
                today ? "border-petrol" : "border-border",
              )}
            >
              <button
                type="button"
                className="mb-2 text-left"
                onClick={() => setBookDate(dateInput(day))}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {day.toLocaleDateString(tag, { weekday: "short" })}
                </p>
                <p className={cn("text-lg font-semibold tabular-nums", today && "text-petrol")}>{day.getDate()}</p>
              </button>
              {slots.length === 0 ? (
                <p className="mt-auto text-sm text-muted-foreground">{t("rooms.free")}</p>
              ) : (
                <ul className="space-y-2">
                  {slots.map((slot) => (
                    <li key={slot.id} className="rounded-xl bg-petrol/10 px-2.5 py-2 text-sm">
                      <p className="font-medium leading-snug">{slot.title}</p>
                      <p className="tabular-nums text-muted-foreground">
                        {new Date(slot.start).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(slot.end).toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-muted-foreground">{slot.who}</p>
                      {slot.canCancel && (
                        <button
                          type="button"
                          className="mt-1 text-xs font-medium text-danger hover:underline"
                          disabled={isPending}
                          onClick={() => cancel(slot.id)}
                        >
                          {t("rooms.cancel")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <form onSubmit={book} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_auto_auto_auto_auto] lg:items-end">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="purpose">{t(selected?.kind === "car" ? "rooms.bookCar" : "rooms.bookRoom")}</Label>
          <Input id="purpose" name="title" required placeholder={t("rooms.purpose")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reserve-date">{t("rooms.date")}</Label>
          <Input id="reserve-date" name="date" type="date" required value={bookDate} onChange={(event) => setBookDate(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reserve-start">{t("rooms.start")}</Label>
          <Input id="reserve-start" name="start" type="time" required defaultValue="09:00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reserve-end">{t("rooms.end")}</Label>
          <Input id="reserve-end" name="end" type="time" required defaultValue="10:00" />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("rooms.reserve")}
        </Button>
      </form>
    </div>
  );
}
