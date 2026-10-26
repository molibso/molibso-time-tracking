import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(120),
  description: z.string().max(2000).optional(),
  memberIds: z.array(z.string()).default([]),
});

export type ProjectInput = z.infer<typeof projectSchema>;

export const updateProjectSchema = projectSchema.extend({
  id: z.string().min(1),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const taskSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(4000).optional(),
    projectId: z.string().optional().nullable(),
    assigneeIds: z.array(z.string().min(1)).min(1, "Assign at least one teammate"),
    priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
    kind: z.enum(["TASK", "MEETING"]).default("TASK"),
    dueDate: z.coerce.date().optional().nullable(),
    estimatedHours: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.coerce.number().min(0.25).max(500).nullable().optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "MEETING" && !data.projectId) {
      ctx.addIssue({ code: "custom", path: ["projectId"], message: "Link the meeting to a project." });
    }
  });

export type TaskInput = z.infer<typeof taskSchema>;

export const taskStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(TaskStatus),
});

export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
