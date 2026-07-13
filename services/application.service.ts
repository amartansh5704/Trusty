import { prisma } from "@/lib/prisma";

export async function createApplication(data: {
  projectId: string;
  freelancerId: string;
  coverLetter: string;
  proposedAmount?: number;
}) {
  return prisma.application.create({
    data,
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          creditBalance: true,
          skills: true,
        },
      },
    },
  });
}

export async function getApplicationsByProject(projectId: string) {
  return prisma.application.findMany({
    where: { projectId },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          creditBalance: true,
          earnedCredits: true,
          skills: true,
          totalProjectsCompleted: true,
          reviewsReceived: {
            select: { rating: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApplicationByFreelancerAndProject(
  freelancerId: string,
  projectId: string
) {
  return prisma.application.findUnique({
    where: {
      projectId_freelancerId: { projectId, freelancerId },
    },
  });
}

export async function acceptApplication(applicationId: string) {
  return prisma.application.update({
    where: { id: applicationId },
    data: { status: "ACCEPTED" },
  });
}

export async function rejectOtherApplications(
  projectId: string,
  acceptedApplicationId: string
) {
  return prisma.application.updateMany({
    where: {
      projectId,
      id: { not: acceptedApplicationId },
    },
    data: { status: "REJECTED" },
  });
}