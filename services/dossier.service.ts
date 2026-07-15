import { prisma } from "@/lib/prisma";

export async function createDossierEntry(data: {
  projectId: string;
  milestoneId?: string;
  authorId: string;
  completedWork: string;
  remainingWork: string;
  technicalNotes?: string;
  knownIssues?: string;
  nextSteps?: string;
  filesAndAccess?: string;
  aiSummary?: string;
}) {
  return prisma.dossierEntry.create({
    data,
    include: {
      author: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true, order: true } },
    },
  });
}

export async function getDossiersByProject(projectId: string) {
  return prisma.dossierEntry.findMany({
    where: { projectId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      milestone: { select: { id: true, title: true, order: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestDossier(projectId: string) {
  return prisma.dossierEntry.findFirst({
    where: { projectId },
    include: {
      author: { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true, order: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDossiersByMilestone(milestoneId: string) {
  return prisma.dossierEntry.findMany({
    where: { milestoneId },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateDossierAiSummary(
  id: string,
  aiSummary: string
) {
  return prisma.dossierEntry.update({
    where: { id },
    data: { aiSummary },
  });
}

// Get full project context for AI (all dossier entries combined)
export async function getProjectDossierContext(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: {
        orderBy: { order: "asc" },
        include: {
          dossierEntries: {
            include: {
              author: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      dossierEntries: {
        include: {
          author: { select: { name: true } },
          milestone: { select: { title: true, order: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      recruiter: { select: { name: true } },
      freelancer: { select: { name: true } },
    },
  });

  return project;
}