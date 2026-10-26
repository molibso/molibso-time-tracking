"use client";

import { TaskTimerButton } from "@/components/tasks/task-timer-button";
import { useLocale } from "@/components/layout/locale-provider";

export type MeetingRow = {
  id: string;
  title: string;
  projectName: string | null;
  assigneeName: string | null;
  loggedSeconds: number;
  isTimerActive: boolean;
  timerStartedAt: string | null;
  canTrackTime: boolean;
};

export function MeetingsList({ rows }: { rows: MeetingRow[] }) {
  const { t } = useLocale();

  if (rows.length === 0) {
    return <p className="py-10 text-center text-base text-muted-foreground">{t("meetings.empty")}</p>;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {rows.map((meeting) => (
        <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{meeting.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {meeting.projectName ?? t("tasks.field.noProject")}
              {meeting.assigneeName ? ` · ${meeting.assigneeName}` : ""}
            </p>
          </div>
          <TaskTimerButton
            taskId={meeting.id}
            isActive={meeting.isTimerActive}
            startedAt={meeting.timerStartedAt}
            loggedSeconds={meeting.loggedSeconds}
            canTrack={meeting.canTrackTime}
          />
        </li>
      ))}
    </ul>
  );
}
