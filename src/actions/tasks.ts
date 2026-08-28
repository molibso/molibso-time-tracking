"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { notifyUserNewTask } from "@/lib/notifications";
import { projectSchema, taskSchema, taskStatusSchema } from "@/lib/validations/tasks";
import type { ActionResult } from "./auth";

async function requireBoss() {
  const session = await auth();
  if (!session?.user.employeeId || !hasPermission(session.user.role, "EMPLOYEE_MANAGE")) {
    throw new Error("You don't have permission to manage tasks.");
  }
  return session;
}

async function requireEmployee() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("No employee profile linked to this account.");
  return session;
}

export async function createProject(input: unknown): Promise<ActionResult & { projectId?: string }> {
  try {
    await requireBoss();
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

export async function createTask(input: unknown): Promise<ActionResult & { taskId?: string }> {
  try {
    const session = await requireBoss();
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
    const session = await requireEmployee();
    const parsed = taskStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const task = await prisma.task.findUnique({ where: { id: parsed.data.id } });
    if (!task) return { success: false, error: "Task not found." };

    const isBoss = hasPermission(session.user.role, "EMPLOYEE_MANAGE");
    if (!isBoss && task.assigneeId !== session.user.employeeId) {
      return { success: false, error: "You can only update your own tasks." };
    }

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

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await requireBoss();
    await prisma.task.delete({ where: { id } });
    revalidatePath("/tasks");
    return { success: true, message: "Task deleted." };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to delete task" };
  }
}
