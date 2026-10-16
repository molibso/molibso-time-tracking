"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ProjectEditButton } from "@/components/tasks/project-form-dialog";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskTable, type TaskRow } from "@/components/tasks/task-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/layout/locale-provider";

type ViewMode = "list" | "board";

const STORAGE_KEY = "tasks-view-mode";

export type ProjectChip = {
  id: string;
  name: string;
  description: string | null;
  taskCount: number;
};

export function TasksView({
  rows,
  projects,
}: {
  rows: TaskRow[];
  projects: ProjectChip[];
}) {
  const { t } = useLocale();
  const [view, setView] = useState<ViewMode>("list");
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "list" || saved === "board") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (projectId && !projects.some((project) => project.id === projectId)) {
      setProjectId(null);
    }
  }, [projects, projectId]);

  function select(next: ViewMode) {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function toggleProject(id: string) {
    setProjectId((current) => (current === id ? null : id));
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projects, projectId],
  );

  return (
    <div className="space-y-6">
      {projects.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("tasks.projects")}</h2>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const selected = projectId === project.id;
              return (
                <div
                  key={project.id}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs font-semibold transition",
                    selected
                      ? "border-petrol bg-petrol text-petrol-foreground"
                      : "border-border bg-surface text-foreground",
                  )}
                >
                  <button
                    type="button"
                    title={project.description || project.name}
                    aria-pressed={selected}
                    onClick={() => toggleProject(project.id)}
                    className="inline-flex min-w-0 items-center gap-1.5 py-0.5 text-left"
                  >
                    <span className="truncate">{project.name}</span>
                    <span className={cn("tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>
                      ·{" "}
                      {t(project.taskCount === 1 ? "tasks.count" : "tasks.countPlural", {
                        count: project.taskCount,
                      })}
                    </span>
                  </button>
                  <ProjectEditButton
                    project={project}
                    onDeleted={(id) => {
                      if (projectId === id) setProjectId(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
          {selectedProject && (
            <p className="text-xs text-muted-foreground">
              {t("tasks.filteredByProject", { name: selectedProject.name })}
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("tasks.all")}</h2>
          <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 gap-1.5 rounded-full px-3",
                view === "list" && "bg-petrol text-petrol-foreground hover:bg-petrol/90 hover:text-petrol-foreground",
              )}
              aria-pressed={view === "list"}
              onClick={() => select("list")}
            >
              <List className="h-3.5 w-3.5" />
              {t("tasks.viewList")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-8 gap-1.5 rounded-full px-3",
                view === "board" && "bg-petrol text-petrol-foreground hover:bg-petrol/90 hover:text-petrol-foreground",
              )}
              aria-pressed={view === "board"}
              onClick={() => select("board")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("tasks.viewBoard")}
            </Button>
          </div>
        </div>

        {view === "list" ? (
          <TaskTable rows={rows} projectFilterId={projectId} />
        ) : (
          <TaskBoard rows={rows} projectFilterId={projectId} />
        )}
      </section>
    </div>
  );
}
