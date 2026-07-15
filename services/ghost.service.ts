import { prisma } from "@/lib/prisma";
import { createNotification } from "./notification.service";

// Recruiter raises ghost alert
export async function raiseGhostAlert(data: {
  projectId: string;
  raisedById: string;
  freelancerId: string;
  note?: string;
}) {
  // Check if alert already exists
  const existing = await prisma.ghostAlert.findUnique({
    where: { projectId: data.projectId },
  });

  if (existing) {
    throw new Error("A ghost alert has already been raised for this project");
  }

  const alert = await prisma.ghostAlert.create({
    data: {
      projectId: data.projectId,
      raisedById: data.raisedById,
      freelancerId: data.freelancerId,
      note: data.note,
      status: "RAISED",
    },
    include: {
      project: { select: { title: true } },
      raisedBy: { select: { name: true } },
      freelancer: { select: { name: true } },
    },
  });

  // Notify all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: "Ghost Alert Raised",
      body: `${alert.raisedBy.name} has raised a ghost alert for "${alert.project.title}". Freelancer: ${alert.freelancer.name}.`,
      link: `/admin/relay/${data.projectId}`,
    });
  }

  return alert;
}

// Get ghost alert for project
export async function getGhostAlert(projectId: string) {
  return prisma.ghostAlert.findUnique({
    where: { projectId },
    include: {
      raisedBy: { select: { id: true, name: true, email: true } },
      freelancer: { select: { id: true, name: true, email: true } },
    },
  });
}

// Get all raised ghost alerts (admin)
export async function getAllGhostAlerts(status?: string) {
  return prisma.ghostAlert.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      project: {
        select: {
          id: true,
          title: true,
          totalAmount: true,
          escrowAmount: true,
        },
      },
      raisedBy: { select: { id: true, name: true, email: true } },
      freelancer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { raisedAt: "desc" },
  });
}

// Admin confirms ghost
export async function confirmGhost(projectId: string) {
  return prisma.ghostAlert.update({
    where: { projectId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });
}

// Admin dismisses ghost alert
export async function dismissGhostAlert(projectId: string) {
  return prisma.ghostAlert.update({
    where: { projectId },
    data: { status: "DISMISSED" },
  });
}