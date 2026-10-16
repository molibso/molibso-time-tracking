"use server";

import { revalidatePath } from "next/cache";
import { TaskPriority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserNewTask } from "@/lib/notifications";
import { projectSchema, updateProjectSchema, taskSchema, taskStatusSchema } from "@/lib/validations/tasks";
import type { ActionResult } from "./auth";

async function requireEmployee() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("No employee profile linked to this account.");
  return session;
}

export async function createProject(input: unknown): Promise<ActionResult & { projectId?: string }> {
  try {
    await requireEmployee();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: "ACTIVE",
      },
    });

    revalidatePath("/tasks");
    return { success: true, projectId: project.id, message: `Project "${project.name}" created.` };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to create project" };
  }
}

export async function updateProject(input: unknown): Promise<ActionResult> {
  try {
    await requireEmployee();
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const existing = await prisma.project.findUnique({ where: { id: parsed.data.id } });
    if (!existing) return { success: false, error: "Project not found." };

    await prisma.project.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    revalidatePath("/tasks");
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
    revalidatePath("/tasks");
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

    const assignee = await prisma.employee.findUnique({
      where: { id: data.assigneeId },
      include: { user: { select: { id: true } } },
    });
    if (!assignee) return { success: false, error: "Assignee not found." };

    if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      if (!project) return { success: false, error: "Project not found." };
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId || null,
        assigneeId: data.assigneeId,
        createdById: session.user.employeeId!,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ?? null,
        estimatedHours: data.estimatedHours ?? null,
      },
    });

    if (assignee.user && assignee.user.id !== session.user.id) {
      await notifyUserNewTask({
        userId: assignee.user.id,
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate,
      });
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true, taskId: task.id, message: `Task assigned to ${assignee.firstName}.` };
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

    revalidatePath("/tasks");
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

    const parent = await prisma.task.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.parentId) return { success: false, error: "Choose a main task." };

    const hours = input.estimatedHours;
    await prisma.task.create({
      data: {
        title: title.slice(0, 200),
        description: input.description?.trim() || null,
        parentId: parent.id,
        projectId: parent.projectId,
        assigneeId: parent.assigneeId,
        createdById: session.user.employeeId!,
        priority: input.priority ?? parent.priority,
        status: "TODO",
        dueDate: input.dueDate ?? null,
        estimatedHours: hours == null || Number.isNaN(hours) ? null : hours,
      },
    });

    revalidatePath("/tasks");
    return { success: true, message: "Subtask added." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to add subtask" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await requireEmployee();
    await prisma.task.delete({ where: { id } });
    revalidatePath("/tasks");
    return { success: true, message: "Task deleted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete task" };
  }
}
