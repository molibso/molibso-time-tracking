-- Vacation can be a full day or a morning or afternoon half day.

CREATE TYPE "DayPart" AS ENUM ('FULL', 'MORNING', 'AFTERNOON');

ALTER TABLE "LeaveRequest" ADD COLUMN "dayPart" "DayPart" NOT NULL DEFAULT 'FULL';
