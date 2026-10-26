import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { RoomsBoard } from "@/components/rooms/rooms-board";
import { getLocale } from "@/lib/i18n/get-locale";
import { translate } from "@/lib/i18n/messages";

export default async function RoomsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/dashboard");

  const locale = await getLocale();
  const admin = isAdmin(session.user.role);
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 21);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 70);

  let room = await prisma.meetingRoom.findFirst({ orderBy: { createdAt: "asc" } });
  if (!room) {
    room = await prisma.meetingRoom.create({ data: { name: "Conference room" } });
  }

  const reservations = await prisma.roomReservation.findMany({
    where: { roomId: room.id, endTime: { gte: rangeStart }, startTime: { lte: rangeEnd } },
    include: { employee: { select: { firstName: true, lastName: true } } },
    orderBy: { startTime: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "rooms.title")}</h1>
        <p className="text-base text-muted-foreground">{translate(locale, "rooms.subtitle")}</p>
      </div>
      <RoomsBoard
        roomId={room.id}
        reservations={reservations.map((reservation) => ({
          id: reservation.id,
          title: reservation.title,
          start: reservation.startTime.toISOString(),
          end: reservation.endTime.toISOString(),
          who: `${reservation.employee.firstName} ${reservation.employee.lastName}`,
          canCancel: admin || reservation.employeeId === employeeId,
        }))}
      />
    </div>
  );
}
