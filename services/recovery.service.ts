import { prisma } from "@/lib/prisma";
import { adjustCredits, CREDIT_EVENTS } from "./credit.service";
import { createNotification } from "./notification.service";
import { notifyNextBackup, acceptRelay } from "./relay.service";
import { getProjectDossierContext } from "./dossier.service";
import { confirmGhost } from "./ghost.service";
import { generateRecoveryBrief } from "@/lib/gemini";

export async function triggerRecovery(
  projectId: string,
  adminId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { order: "asc" } },
      freelancer: { select: { id: true, name: true, creditBalance: true } },
      escrowHold: true,
    },
  });

  if (!project) throw new Error("Project not found");
  if (!project.freelancerId) throw new Error("No freelancer on this project");

  const previousFreelancerId = project.freelancerId;

  // 1. Confirm ghost alert
  await confirmGhost(projectId);

  // 2. Penalise ghosting freelancer
  await adjustCredits(
    previousFreelancerId,
    CREDIT_EVENTS.GHOSTING,
    `Ghosted project: ${project.title}`
  );

  // 3. Forfeit stake
  if (project.stakeAmount > 0) {
    await adjustCredits(
      previousFreelancerId,
      -project.stakeAmount,
      `Stake forfeited: ${project.title}`
    );
  }

  // 4. Calculate completion
  const approvedMilestones = project.milestones.filter(
    (m) => m.status === "APPROVED"
  ).length;
  const completionPercent =
    project.milestones.length > 0
      ? Math.round((approvedMilestones / project.milestones.length) * 100)
      : 0;

  // 5. Remaining budget
  const remainingBudget = project.escrowHold?.heldAmount ?? project.escrowAmount;

  // 6. Generate AI Recovery Brief
  const projectContext = await getProjectDossierContext(projectId);
  let aiGeneratedBrief = "";

  try {
    aiGeneratedBrief = await generateRecoveryBrief({
      projectTitle: project.title,
      projectDescription: project.description,
      completionPercent,
      milestones: project.milestones,
      dossierEntries: projectContext?.dossierEntries ?? [],
      remainingBudget,
    });
  } catch (err) {
    console.error("Gemini failed, using fallback brief:", err);
    aiGeneratedBrief = buildFallbackBrief(project, completionPercent, remainingBudget);
  }

  // 7. Create recovery event
  const recoveryEvent = await prisma.recoveryEvent.create({
    data: {
      projectId,
      triggeredById: adminId,
      previousFreelancerId,
      completionPercent,
      aiGeneratedBrief,
      remainingBudget,
      status: "BRIEF_GENERATED",
    },
  });

  // 8. Set project to RELAY_PENDING — keep freelancerId as null
  await prisma.project.update({
    where: { id: projectId },
    data: {
      freelancerId: null,
      status: "RELAY_PENDING",
    },
  });

  // 9. Notify ghosted freelancer
  await createNotification({
    userId: previousFreelancerId,
    title: "Project Removed",
    body: `You have been removed from "${project.title}" due to inactivity. Your stake has been forfeited and credits deducted.`,
    link: `/dashboard/freelancer`,
  });

  // 10. Notify next backup
  const nextBackup = await notifyNextBackup(projectId, recoveryEvent.id);

  if (nextBackup) {
    await prisma.recoveryEvent.update({
      where: { id: recoveryEvent.id },
      data: { status: "RELAY_NOTIFIED" },
    });
  } else {
    await handleNoBackupsLeft(projectId, project.title);
  }

  return recoveryEvent;
}

export async function executeRelayAcceptance(
  projectId: string,
  freelancerId: string
) {
  const freelancer = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: { id: true, name: true, creditBalance: true },
  });

  if (!freelancer) throw new Error("Freelancer not found");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      totalAmount: true,
      stakeAmount: true,
      recruiterId: true,
      status: true,
      freelancerId: true,
    },
  });

  if (!project) throw new Error("Project not found");

  // Allow acceptance if RELAY_PENDING or OPEN (fallback for edge cases)
  const acceptableStatuses = ["RELAY_PENDING", "OPEN"];
  if (!acceptableStatuses.includes(project.status)) {
    throw new Error(
      `Project cannot accept relay. Current status: ${project.status}`
    );
  }

  // If project already has a freelancer assigned, block
  if (project.freelancerId) {
    throw new Error("Project already has a freelancer assigned");
  }

  // Accept the relay slot
  await acceptRelay(projectId, freelancerId);

  // Calculate and stake credits
  const { calculateStakeAmount } = await import("@/lib/utils");
  const stakeAmount = calculateStakeAmount(
    project.totalAmount,
    freelancer.creditBalance
  );

  if (freelancer.creditBalance < stakeAmount) {
    throw new Error(
      `Insufficient credits. Need ${stakeAmount}, have ${freelancer.creditBalance}`
    );
  }

  await adjustCredits(
    freelancerId,
    -stakeAmount,
    `Stake for relay project: ${project.title}`
  );

  // Assign freelancer and set IN_PROGRESS
  await prisma.project.update({
    where: { id: projectId },
    data: {
      freelancerId,
      stakeAmount,
      status: "IN_PROGRESS",
    },
  });

  // Update recovery event
  await prisma.recoveryEvent.updateMany({
    where: { projectId },
    data: { status: "ACCEPTED" },
  });

  // Mark all other backup slots as SKIPPED
  await prisma.backupRelaySlot.updateMany({
    where: {
      projectId,
      freelancerId: { not: freelancerId },
      status: { in: ["STANDBY", "NOTIFIED"] },
    },
    data: { status: "SKIPPED" },
  });

  // Update the accepting freelancer's slot to ACCEPTED
  await prisma.backupRelaySlot.updateMany({
    where: {
      projectId,
      freelancerId,
    },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });

  // Notify recruiter
  await createNotification({
    userId: project.recruiterId,
    title: "Backup Freelancer Accepted",
    body: `${freelancer.name} has accepted the relay for "${project.title}". Work continues.`,
    link: `/projects/${projectId}`,
  });

  // Notify the freelancer
  await createNotification({
    userId: freelancerId,
    title: "Project Accepted",
    body: `You are now the freelancer on "${project.title}". Check the dossier and start working on remaining milestones.`,
    link: `/projects/${projectId}`,
  });

  return { success: true };
}

async function handleNoBackupsLeft(projectId: string, projectTitle: string) {
  const escrow = await prisma.escrowHold.findUnique({
    where: { projectId },
    include: {
      project: { select: { recruiterId: true } },
    },
  });

  if (escrow && escrow.heldAmount > 0) {
    await prisma.user.update({
      where: { id: escrow.project.recruiterId },
      data: { walletBalance: { increment: escrow.heldAmount } },
    });

    await prisma.transaction.create({
      data: {
        userId: escrow.project.recruiterId,
        type: "REFUND",
        amount: escrow.heldAmount,
        description: `Refund — no backup freelancers available for: ${projectTitle}`,
      },
    });

    await prisma.escrowHold.update({
      where: { projectId },
      data: {
        heldAmount: 0,
        refundedAmount: { increment: escrow.heldAmount },
        status: "REFUNDED",
      },
    });

    await createNotification({
      userId: escrow.project.recruiterId,
      title: "Project Cancelled — Full Refund",
      body: `No backup freelancers were available for "${projectTitle}". Your full escrow has been refunded.`,
      link: `/wallet`,
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "CANCELLED" },
  });

  await prisma.recoveryEvent.update({
    where: { projectId },
    data: { status: "CANCELLED" },
  });
}

export async function getRecoveryEvent(projectId: string) {
  return prisma.recoveryEvent.findUnique({
    where: { projectId },
    include: {
      previousFreelancer: {
        select: { id: true, name: true },
      },
      triggeredBy: {
        select: { id: true, name: true },
      },
    },
  });
}

function buildFallbackBrief(
  project: any,
  completionPercent: number,
  remainingBudget: number
): string {
  const approved = project.milestones.filter(
    (m: any) => m.status === "APPROVED"
  );
  const remaining = project.milestones.filter(
    (m: any) => m.status !== "APPROVED"
  );

  return `
# Recovery Brief — ${project.title}

## Project Overview
${project.description}

## Completion Status
${completionPercent}% complete (${approved.length} of ${project.milestones.length} milestones done)

## Completed Milestones
${approved.map((m: any) => `- ${m.title}`).join("\n") || "None"}

## Remaining Milestones
${remaining.map((m: any) => `- ${m.title} (₹${m.amount})`).join("\n") || "None"}

## Remaining Budget
₹${remainingBudget}

## Notes
No dossier entries were available from the previous freelancer.
Please review the project description and milestone details carefully before accepting.
  `.trim();
}