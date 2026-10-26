"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cancelReservation, createMeetingRoom, reserveRoom } from "@/actions/rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useLocale } from "@/components/layout/locale-provider";

type Option = { id: string; label: string };

export type ReservationRow = {
  id: string;
  title: string;
  roomName: string;
  start: string;
  end: string;
  who: string;
  projectName: string | null;
  canCancel: boolean;
};

export function RoomsBoard({
  rooms,
  projects,
  reservations,
}: {
  rooms: Option[];
  projects: Option[];
  reservations: ReservationRow[];
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!rooms.some((room) => room.id === roomId)) setRoomId(rooms[0]?.id ?? "");
  }, [rooms, roomId]);

  function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const capacityRaw = String(formData.get("capacity") ?? "").trim();
    startTransition(async () => {
      const result = await createMeetingRoom({
        name: String(formData.get("name") ?? ""),
        location: String(formData.get("location") ?? ""),
        capacity: capacityRaw ? Number(capacityRaw) : null,
      });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await reserveRoom({
        roomId,
        title: String(formData.get("title") ?? ""),
        date: String(formData.get("date") ?? ""),
        start: String(formData.get("start") ?? ""),
        end: String(formData.get("end") ?? ""),
        projectId: projectId || null,
        note: String(formData.get("note") ?? ""),
      });
      if (result.success) {
        toast.success(result.message);
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

  const dateFormatter = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-6">
        <form onSubmit={addRoom} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">{t("rooms.addRoom")}</h2>
          <div className="space-y-1.5">
            <Label htmlFor="room-name">{t("rooms.roomName")}</Label>
            <Input id="room-name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="room-location">{t("rooms.location")}</Label>
              <Input id="room-location" name="location" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">{t("rooms.capacity")}</Label>
              <Input id="room-capacity" name="capacity" type="number" min={1} max={500} />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("rooms.addRoom")}
          </Button>
        </form>

        <form onSubmit={book} className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">{t("rooms.reserveTitle")}</h2>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rooms.emptyRooms")}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>{t("rooms.roomName")}</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purpose">{t("rooms.purpose")}</Label>
                <Input id="purpose" name="title" required placeholder={t("meetings.placeholder")} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reserve-date">{t("rooms.date")}</Label>
                  <Input id="reserve-date" name="date" type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reserve-start">{t("rooms.start")}</Label>
                  <Input id="reserve-start" name="start" type="time" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reserve-end">{t("rooms.end")}</Label>
                  <Input id="reserve-end" name="end" type="time" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("tasks.field.project")}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("ph.optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("tasks.field.noProject")}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reserve-note">{t("rooms.note")}</Label>
                <Input id="reserve-note" name="note" />
              </div>
              <Button type="submit" disabled={isPending || !roomId}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("rooms.reserve")}
              </Button>
            </>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-base font-semibold">{t("rooms.upcoming")}</h2>
        {reservations.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("rooms.none")}</p>
        ) : (
          <ul className="space-y-2">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{reservation.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {reservation.roomName}
                    {reservation.projectName ? ` · ${reservation.projectName}` : ""}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {dateFormatter.format(new Date(reservation.start))} – {dateFormatter.format(new Date(reservation.end))}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("rooms.bookedBy", { name: reservation.who })}</p>
                </div>
                {reservation.canCancel && (
                  <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => cancel(reservation.id)}>
                    {t("rooms.cancel")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
