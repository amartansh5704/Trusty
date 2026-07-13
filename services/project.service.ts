import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

export async function createProject(data: {
  title: string;
  description: string;
  totalAmount: number;
  requiredSkills: string[];
  deadline: Date;
  recruiterId: string;
  milestones: Array<{
    title: string;
    description: string;
    amount: number;
    deadline: Date;
    order: number;
  }>;
}) {
  const { milestones, ...projectData } = data;

  return prisma.project.create({
    data: {
      ...projectData,
      milestones: {
        create: milestones,
      },
    },
    include: { milestones: true },
  });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      recruiter: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
        },
      },
      freelancer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          creditBalance: true,
          earnedCredits: true,
        },
      },
      milestones: {
        orderBy: { order: "asc" },
        include: {
          stateDoc: true,
          payment: true,
        },
      },
      applications: {
        include: {
          freelancer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              creditBalance: true,
              skills: true,
              totalProjectsCompleted: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      disputes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getProjectsByRecruiter(recruiterId: string) {
  return prisma.project.findMany({
    where: { recruiterId },
    include: {
      freelancer: {
        select: { id: true, name: true, avatarUrl: true },
      },
      milestones: {
        select: { id: true, status: true, amount: true },
      },
      applications: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectsByFreelancer(freelancerId: string) {
  return prisma.project.findMany({
    where: { freelancerId },
    include: {
      recruiter: {
        select: { id: true, name: true, avatarUrl: true },
      },
      milestones: {
        select: { id: true, status: true, amount: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOpenProjects(search?: string, skill?: string) {
  return prisma.project.findMany({
    where: {
      status: "OPEN",
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(skill && {
        requiredSkills: { has: skill },
      }),
    },
    include: {
      recruiter: {
        select: { id: true, name: true, avatarUrl: true },
      },
      milestones: {
        select: { amount: true },
      },
      applications: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
) {
  return prisma.project.update({
    where: { id },
    data: { status },
  });
}

export async function assignFreelancer(
  projectId: string,
  freelancerId: string,
  stakeAmount: number
) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      freelancerId,
      stakeAmount,
      status: "IN_PROGRESS",
    },
  });
}

export async function getProjectForAuth(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      recruiterId: true,
      freelancerId: true,
      status: true,
      totalAmount: true,
      stakeAmount: true,
    },
  });
}