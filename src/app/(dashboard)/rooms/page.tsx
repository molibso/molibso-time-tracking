import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { visibleProjectWhere } from "@/lib/project-access";
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

  const [rooms, reservations, projects] = await Promise.all([
    prisma.meetingRoom.findMany({ orderBy: { name: "asc" } }),
    prisma.roomReservation.findMany({
      where: { endTime: { gte: now } },
      include: {
        room: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.project.findMany({
      where: { status: { in: ["PLANNING", "ACTIVE"] }, ...visibleProjectWhere(employeeId, admin) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, "rooms.title")}</h1>
        <p className="text-base text-muted-foreground">{translate(locale, "rooms.subtitle")}</p>
      </div>
      <RoomsBoard
        rooms={rooms.map((room) => ({
          id: room.id,
          label: room.capacity ? `${room.name} · ${room.capacity}` : room.location ? `${room.name} · ${room.location}` : room.name,
        }))}
        projects={projects.map((project) => ({ id: project.id, label: project.name }))}
        reservations={reservations.map((reservation) => ({
          id: reservation.id,
          title: reservation.title,
          roomName: reservation.room.name,
          start: reservation.startTime.toISOString(),
          end: reservation.endTime.toISOString(),
          who: `${reservation.employee.firstName} ${reservation.employee.lastName}`,
          projectName: reservation.project?.name ?? null,
          canCancel: admin || reservation.employeeId === employeeId,
        }))}
      />
    </div>
  );
}
