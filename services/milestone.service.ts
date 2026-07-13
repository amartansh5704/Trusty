import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";

export async function getMilestoneById(id: string) {
  return prisma.milestone.findUnique({
    where: { id },
    include: {
      project: true,
      stateDoc: true,
      payment: true,
    },
  });
}

export async function submitMilestone(
  id: string,
  data: {
    proofOfWorkUrl: string;
    proofNotes?: string;
  }
) {
  return prisma.milestone.update({
    where: { id },
    data: {
      ...data,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
}

export async function approveMilestone(id: string) {
  return prisma.milestone.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
}

export async function rejectMilestone(id: string) {
  return prisma.milestone.update({
    where: { id },
    data: { status: "REJECTED" },
  });
}

export async function getMilestonesByProject(projectId: string) {
  return prisma.milestone.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: {
      stateDoc: true,
      payment: true,
    },
  });
}

export async function createStateDocument(
  milestoneId: string,
  projectId: string,
  data: {
    completedWork: string;
    remainingWork: string;
    technicalNotes?: string;
    knownIssues?: string;
    nextSteps?: string;
    filesAndAccess?: string;
    aiSummary?: string;
  }
) {
  return prisma.stateDocument.upsert({
    where: { milestoneId },
    update: data,
    create: {
      milestoneId,
      projectId,
      ...data,
    },
  });
}