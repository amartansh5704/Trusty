import { prisma } from "@/lib/prisma";
import { DisputeStatus } from "@prisma/client";

export async function createDispute(data: {
  projectId: string;
  raisedById: string;
  againstId: string;
  reason: string;
  evidence?: string;
}) {
  const dispute = await prisma.dispute.create({ data });

  await prisma.project.update({
    where: { id: data.projectId },
    data: { status: "DISPUTED" },
  });

  return dispute;
}

export async function getDisputeById(id: string) {
  return prisma.dispute.findUnique({
    where: { id },
    include: {
      project: true,
      raisedBy: {
        select: { id: true, name: true, email: true },
      },
      against: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getAllDisputes() {
  return prisma.dispute.findMany({
    include: {
      project: { select: { title: true } },
      raisedBy: { select: { name: true, email: true } },
      against: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveDispute(
  id: string,
  status: DisputeStatus,
  resolution: string,
  adminNotes?: string
) {
  const dispute = await prisma.dispute.update({
    where: { id },
    data: { status, resolution, adminNotes },
    include: { project: true },
  });

  const projectStatus =
    status === "RESOLVED_FREELANCER" || status === "RESOLVED_RECRUITER"
      ? "COMPLETED"
      : "COMPLETED";

  await prisma.project.update({
    where: { id: dispute.projectId },
    data: { status: projectStatus },
  });

  return dispute;
}