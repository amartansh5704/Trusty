import { prisma } from "@/lib/prisma";
import { adjustCredits, CREDIT_EVENTS } from "./credit.service";
import { createNotification } from "./notification.service";

// Add a backup freelancer to relay queue
export async function addBackupSlot(data: {
  projectId: string;
  freelancerId: string;
  order: number;
}) {
  // Check if freelancer is already in relay for this project
  const existing = await prisma.backupRelaySlot.findUnique({
    where: {
      projectId_freelancerId: {
        projectId: data.projectId,
        freelancerId: data.freelancerId,
      },
    },
  });

  if (existing) throw new Error("Freelancer is already in relay queue");

  // Check if order slot is taken
  const orderTaken = await prisma.backupRelaySlot.findUnique({
    where: {
      projectId_order: {
        projectId: data.projectId,
        order: data.order,
      },
    },
  });

  if (orderTaken) throw new Error(`Backup slot ${data.order} is already taken`);

  const slot = await prisma.backupRelaySlot.create({
    data: {
      projectId: data.projectId,
      freelancerId: data.freelancerId,
      order: data.order,
      status: "STANDBY",
    },
    include: {
      freelancer: { select: { id: true, name: true } },
      project: { select: { title: true } },
    },
  });

  // Notify backup freelancer
  await createNotification({
    userId: data.freelancerId,
    title: "You're a Backup Freelancer",
    body: `You have been added as Backup #${data.order} for "${slot.project.title}". You will be notified if the primary freelancer cannot complete the project.`,
    link: `/projects/${data.projectId}`,
  });

  return slot;
}

// Remove a backup slot
export async function removeBackupSlot(slotId: string) {
  return prisma.backupRelaySlot.delete({
    where: { id: slotId },
  });
}

// Get relay queue for a project
export async function getRelayQueue(projectId: string) {
  return prisma.backupRelaySlot.findMany({
    where: { projectId },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          creditBalance: true,
          earnedCredits: true,
          totalProjectsCompleted: true,
          skills: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });
}

// Get next available backup in queue
export async function getNextBackup(projectId: string) {
  return prisma.backupRelaySlot.findFirst({
    where: {
      projectId,
      status: { in: ["STANDBY", "NOTIFIED"] },
    },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          creditBalance: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });
}

// Notify next backup freelancer
export async function notifyNextBackup(
  projectId: string,
  recoveryEventId: string
) {
  const next = await getNextBackup(projectId);

  if (!next) return null;

  await prisma.backupRelaySlot.update({
    where: { id: next.id },
    data: {
      status: "NOTIFIED",
      notifiedAt: new Date(),
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true },
  });

  await createNotification({
    userId: next.freelancerId,
    title: "🚨 Project Relay — You're Up!",
    body: `The project "${project?.title ?? "Unknown"}" needs a new freelancer. You are Backup #${next.order}. Review the recovery brief and accept or decline.`,
    link: `/projects/${projectId}/recovery`,
  });

  return next;
}

// Backup freelancer accepts relay
export async function acceptRelay(
  projectId: string,
  freelancerId: string
) {
  const slot = await prisma.backupRelaySlot.findUnique({
    where: {
      projectId_freelancerId: {
        projectId,
        freelancerId,
      },
    },
  });

  if (!slot) throw new Error("Relay slot not found");
  if (slot.status !== "NOTIFIED") {
    throw new Error("You have not been notified for this relay");
  }

  return prisma.backupRelaySlot.update({
    where: { id: slot.id },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });
}

// Backup freelancer declines relay
export async function declineRelay(
  projectId: string,
  freelancerId: string
) {
  const slot = await prisma.backupRelaySlot.findUnique({
    where: {
      projectId_freelancerId: {
        projectId,
        freelancerId,
      },
    },
  });

  if (!slot) throw new Error("Relay slot not found");

  await prisma.backupRelaySlot.update({
    where: { id: slot.id },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
    },
  });

  // Notify next in queue
  await notifyNextBackup(projectId, "");

  return slot;
}

// Check if freelancer is backup for project
export async function isBackupFreelancer(
  projectId: string,
  freelancerId: string
) {
  const slot = await prisma.backupRelaySlot.findUnique({
    where: {
      projectId_freelancerId: {
        projectId,
        freelancerId,
      },
    },
  });

  return !!slot;
}