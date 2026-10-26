-- Task kind, multiple assignees, project creator, and meeting rooms.

CREATE TYPE "TaskKind" AS ENUM ('TASK', 'MEETING');

ALTER TABLE "Task" ADD COLUMN "kind" "TaskKind" NOT NULL DEFAULT 'TASK';
CREATE INDEX "Task_kind_idx" ON "Task"("kind");

ALTER TABLE "Project" ADD COLUMN "createdById" TEXT;
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TaskAssignment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskAssignment_taskId_employeeId_key" ON "TaskAssignment"("taskId", "employeeId");
CREATE INDEX "TaskAssignment_employeeId_idx" ON "TaskAssignment"("employeeId");

ALTER TABLE "TaskAssignment"
  ADD CONSTRAINT "TaskAssignment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskAssignment"
  ADD CONSTRAINT "TaskAssignment_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TaskAssignment" ("id", "taskId", "employeeId", "createdAt")
SELECT gen_random_uuid()::text, "id", "assigneeId", CURRENT_TIMESTAMP
FROM "Task"
WHERE "assigneeId" IS NOT NULL;

CREATE TABLE "MeetingRoom" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "capacity" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeetingRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoomReservation" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "projectId" TEXT,
  "title" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoomReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoomReservation_roomId_startTime_idx" ON "RoomReservation"("roomId", "startTime");
CREATE INDEX "RoomReservation_employeeId_idx" ON "RoomReservation"("employeeId");
CREATE INDEX "RoomReservation_startTime_endTime_idx" ON "RoomReservation"("startTime", "endTime");

ALTER TABLE "RoomReservation"
  ADD CONSTRAINT "RoomReservation_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "MeetingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomReservation"
  ADD CONSTRAINT "RoomReservation_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomReservation"
  ADD CONSTRAINT "RoomReservation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
