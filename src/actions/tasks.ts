"use server";

import { revalidatePath } from "next/cache";
import { TaskPriority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserNewTask } from "@/lib/notifications";
import { projectSchema, updateProjectSchema, taskSchema, taskStatusSchema } from "@/lib/validations/tasks";
import type { ActionResult } from "./auth";

function refreshWork() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

async function requireEmployee() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("No employee profile linked to this account.");
  return session;
}

async function memberIdsFor(
  currentEmployeeId: string,
  requested: Array<string | undefined> | undefined,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const ids = Array.from(new Set((requested ?? []).filter((id): id is string => Boolean(id))));
  if (!ids.includes(currentEmployeeId)) ids.push(currentEmployeeId);
  const found = await prisma.employee.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    return { ok: false, error: "One of the selected people could not be found." };
  }
  return { ok: true, ids };
}

export async function createProject(input: unknown): Promise<ActionResult & { projectId?: string }> {
  try {
    const session = await requireEmployee();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const employeeId = session.user.employeeId;
    if (!employeeId) return { success: false, error: "No employee profile linked to this account." };
    const members = await memberIdsFor(employeeId, parsed.data.memberIds);
    if (!members.ok) return { success: false, error: members.error };

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: "ACTIVE",
        createdById: employeeId,
        members: { create: members.ids.map((employeeId) => ({ employeeId })) },
      },
    });

    refreshWork();
    return { success: true, projectId: project.id, message: `Project "${project.name}" created.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create project" };
  }
}

export async function updateProject(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireEmployee();
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const existing = await prisma.project.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return { success: false, error: "Project not found." };

    const employeeId = session.user.employeeId;
    if (!employeeId) return { success: false, error: "No employee profile linked to this account." };
    const members = await memberIdsFor(employeeId, parsed.data.memberIds);
    if (!members.ok) return { success: false, error: members.error };

    await prisma.$transaction([
      prisma.project.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
        },
      }),
      prisma.projectMember.deleteMany({ where: { projectId: parsed.data.id } }),
      prisma.projectMember.createMany({
        data: members.ids.map((employeeId) => ({ projectId: parsed.data.id, employeeId })),
      }),
    ]);

    refreshWork();
    return { success: true, message: "Project updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update project" };
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await requireEmployee();
    await prisma.$transaction([
      prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } }),
      prisma.projectMember.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);
    refreshWork();
    return { success: true, message: "Project deleted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete project." };
  }
}

export async function createTask(input: unknown): Promise<ActionResult & { taskId?: string }> {
  try {
    const session = await requireEmployee();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;

    const assigneeIds = Array.from(new Set(data.assigneeIds));
    const assignees = await prisma.employee.findMany({
      where: { id: { in: assigneeIds } },
      include: { user: { select: { id: true } } },
    });
    if (assignees.length !== assigneeIds.length) return { success: false, error: "Assignee not found." };

    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        include: { members: { select: { employeeId: true } } },
      });
      if (!project) return { success: false, error: "Project not found." };
      if (project.members.length > 0) {
        const allowed = new Set(project.members.map((member) => member.employeeId));
        if (assigneeIds.some((id) => !allowed.has(id))) {
          return { success: false, error: "Share the project with every assignee first." };
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId || null,
        assigneeId: assigneeIds[0],
        assignments: { create: assigneeIds.map((employeeId) => ({ employeeId })) },
        createdById: session.user.employeeId!,
        priority: data.priority,
        status: data.status,
        kind: data.kind,
        dueDate: data.dueDate ?? null,
        estimatedHours: data.estimatedHours ?? null,
      },
    });

    for (const assignee of assignees) {
      if (assignee.user && assignee.user.id !== session.user.id) {
        await notifyUserNewTask({
          userId: assignee.user.id,
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate,
        });
      }
    }

    refreshWork();
    const names = assignees.map((person) => person.firstName).join(", ");
    return {
      success: true,
      taskId: task.id,
      message: data.kind === "MEETING" ? `Meeting shared with ${names}.` : `Task assigned to ${names}.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create task" };
  }
}

export async function updateTaskStatus(input: unknown): Promise<ActionResult> {
  try {
    await requireEmployee();
    const parsed = taskStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const task = await prisma.task.findUnique({ where: { id: parsed.data.id } });
    if (!task) return { success: false, error: "Task not found." };

    await prisma.task.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });

    refreshWork();
    return { success: true, message: "Task status updated." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update task" };
  }
}

export async function createSubtask(input: {
  parentId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: Date | null;
  estimatedHours?: number | null;
}): Promise<ActionResult> {
  try {
    const session = await requireEmployee();
    const title = input.title.trim();
    if (!title) return { success: false, error: "Enter a subtask title." };

    const parent = await prisma.task.findUnique({
      where: { id: input.parentId },
      include: { assignments: { select: { employeeId: true } } },
    });
    if (!parent || parent.parentId) return { success: false, error: "Choose a main task." };

    const assigneeIds = Array.from(
      new Set([
        ...parent.assignments.map((assignment) => assignment.employeeId),
        ...(parent.assigneeId ? [parent.assigneeId] : []),
      ]),
    );

    const hours = input.estimatedHours;
    await prisma.task.create({
      data: {
        title: title.slice(0, 200),
        description: input.description?.trim() || null,
        parentId: parent.id,
        projectId: parent.projectId,
        assigneeId: parent.assigneeId,
        assignments: assigneeIds.length > 0 ? { create: assigneeIds.map((employeeId) => ({ employeeId })) } : undefined,
        createdById: session.user.employeeId!,
        priority: input.priority ?? parent.priority,
        status: "TODO",
        kind: parent.kind,
        dueDate: input.dueDate ?? null,
        estimatedHours: hours == null || Number.isNaN(hours) ? null : hours,
      },
    });

    refreshWork();
    return { success: true, message: "Subtask added." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to add subtask" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await requireEmployee();
    await prisma.task.delete({ where: { id } });
    refreshWork();
    return { success: true, message: "Task deleted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete task" };
  }
}
