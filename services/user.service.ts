import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function getPublicFreelancerProfile(id: string) {
  return prisma.user.findUnique({
    where: { id, role: "FREELANCER" },
    select: {
      id: true,
      name: true,
      bio: true,
      skills: true,
      portfolioUrl: true,
      avatarUrl: true,
      creditBalance: true,
      earnedCredits: true,
      purchasedCredits: true,
      totalProjectsCompleted: true,
      onTimeDeliveryCount: true,
      createdAt: true,
      reviewsReceived: {
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          giver: {
            select: { name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      creditLogs: {
        select: { change: true, reason: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getAllFreelancers(search?: string, skill?: string) {
  return prisma.user.findMany({
    where: {
      role: "FREELANCER",
      ...(search && {
        name: { contains: search, mode: "insensitive" },
      }),
      ...(skill && {
        skills: { has: skill },
      }),
    },
    select: {
      id: true,
      name: true,
      bio: true,
      skills: true,
      avatarUrl: true,
      creditBalance: true,
      earnedCredits: true,
      totalProjectsCompleted: true,
      reviewsReceived: {
        select: { rating: true },
      },
    },
    orderBy: { creditBalance: "desc" },
  });
}

export async function createUser(data: {
  email: string;
  name: string;
  role: Role;
  bio?: string;
  skills?: string[];
  portfolioUrl?: string;
}) {
  return prisma.user.create({
    data: {
      ...data,
      creditBalance: 25,
      earnedCredits: 25,
    },
  });
}

export async function updateUserProfile(
  id: string,
  data: {
    name?: string;
    bio?: string;
    skills?: string[];
    portfolioUrl?: string;
    avatarUrl?: string;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

export async function getFreelancerStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projectsWorked: {
        select: { status: true, totalAmount: true },
      },
      reviewsReceived: {
        select: { rating: true },
      },
      applications: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });

  if (!user) return null;

  const avgRating =
    user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) /
        user.reviewsReceived.length
      : 0;

  return {
    activeProjects: user.projectsWorked.filter(
      (p) => p.status === "IN_PROGRESS"
    ).length,
    completedProjects: user.projectsWorked.filter(
      (p) => p.status === "COMPLETED"
    ).length,
    totalEarned: user.projectsWorked
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.totalAmount, 0),
    pendingApplications: user.applications.length,
    avgRating,
    walletBalance: user.walletBalance,
    creditBalance: user.creditBalance,
  };
}

export async function getRecruiterStats(userId: string) {
  const projects = await prisma.project.findMany({
    where: { recruiterId: userId },
    select: { status: true },
  });

  return {
    total: projects.length,
    open: projects.filter((p) => p.status === "OPEN").length,
    inProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    disputed: projects.filter((p) => p.status === "DISPUTED").length,
  };
}