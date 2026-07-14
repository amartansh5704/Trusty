import { prisma } from "@/lib/prisma";

// Create escrow hold when recruiter hires a freelancer
export async function createEscrowHold(
  projectId: string,
  totalAmount: number
) {
  // Use upsert so if it already exists it updates instead of throwing
  return prisma.escrowHold.upsert({
    where: { projectId },
    update: {
      totalAmount,
      heldAmount: totalAmount,
      status: "HOLDING",
    },
    create: {
      projectId,
      totalAmount,
      heldAmount: totalAmount,
      status: "HOLDING",
    },
  });
}

// Create release request when recruiter approves a milestone
export async function createReleaseRequest(data: {
  milestoneId: string;
  projectId: string;
  freelancerId: string;
  amount: number;
}) {
  return prisma.milestoneReleaseRequest.create({
    data: {
      milestoneId: data.milestoneId,
      projectId: data.projectId,
      freelancerId: data.freelancerId,
      amount: data.amount,
      status: "PENDING",
    },
  });
}

// Admin approves full release
export async function approveFullRelease(requestId: string) {
  const request = await prisma.milestoneReleaseRequest.findUnique({
    where: { id: requestId },
    include: { milestone: true, project: true },
  });

  if (!request) throw new Error("Release request not found");
  if (request.status !== "PENDING") throw new Error("Already processed");

  // Update request
  await prisma.milestoneReleaseRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      approvedAmount: request.amount,
    },
  });

  // Credit freelancer wallet
  await prisma.user.update({
    where: { id: request.freelancerId },
    data: {
      walletBalance: { increment: request.amount },
    },
  });

  // Log transaction for freelancer
  await prisma.transaction.create({
    data: {
      userId: request.freelancerId,
      type: "MILESTONE_RELEASE",
      amount: request.amount,
      description: `Payment for milestone: ${request.milestone.title}`,
    },
  });

  // Update escrow hold
  const escrow = await prisma.escrowHold.findUnique({
    where: { projectId: request.projectId },
  });

  if (escrow) {
    const newHeld = escrow.heldAmount - request.amount;
    const newReleased = escrow.releasedAmount + request.amount;

    await prisma.escrowHold.update({
      where: { projectId: request.projectId },
      data: {
        heldAmount: Math.max(0, newHeld),
        releasedAmount: newReleased,
        status: newHeld <= 0 ? "FULLY_RELEASED" : "PARTIALLY_RELEASED",
      },
    });
  }

  // Update project escrow
  await prisma.project.update({
    where: { id: request.projectId },
    data: {
      escrowAmount: { decrement: request.amount },
    },
  });

  return request;
}

// Admin approves partial release
export async function approvePartialRelease(
  requestId: string,
  approvedAmount: number,
  adminNote?: string
) {
  const request = await prisma.milestoneReleaseRequest.findUnique({
    where: { id: requestId },
    include: { milestone: true },
  });

  if (!request) throw new Error("Release request not found");
  if (request.status !== "PENDING") throw new Error("Already processed");
  if (approvedAmount <= 0 || approvedAmount > request.amount) {
    throw new Error("Invalid amount");
  }

  // Update request
  await prisma.milestoneReleaseRequest.update({
    where: { id: requestId },
    data: {
      status: "PARTIALLY_APPROVED",
      approvedAmount,
      adminNote,
    },
  });

  // Credit freelancer wallet with partial amount
  await prisma.user.update({
    where: { id: request.freelancerId },
    data: {
      walletBalance: { increment: approvedAmount },
    },
  });

  // Log transaction
  await prisma.transaction.create({
    data: {
      userId: request.freelancerId,
      type: "MILESTONE_RELEASE",
      amount: approvedAmount,
      description: `Partial payment for milestone: ${request.milestone.title} (₹${approvedAmount} of ₹${request.amount})`,
    },
  });

  // Update escrow hold — only deduct what was released
  const escrow = await prisma.escrowHold.findUnique({
    where: { projectId: request.projectId },
  });

  if (escrow) {
    await prisma.escrowHold.update({
      where: { projectId: request.projectId },
      data: {
        heldAmount: { decrement: approvedAmount },
        releasedAmount: { increment: approvedAmount },
        status: "PARTIALLY_RELEASED",
      },
    });
  }

  // Update project escrow
  await prisma.project.update({
    where: { id: request.projectId },
    data: {
      escrowAmount: { decrement: approvedAmount },
    },
  });

  return request;
}

// Admin refunds entire project escrow to recruiter
export async function refundEscrow(
  projectId: string,
  adminNote?: string
) {
  const escrow = await prisma.escrowHold.findUnique({
    where: { projectId },
    include: {
      project: {
        select: { recruiterId: true, title: true },
      },
    },
  });

  if (!escrow) throw new Error("Escrow hold not found");
  if (escrow.heldAmount <= 0) throw new Error("Nothing to refund");

  const refundAmount = escrow.heldAmount;

  // Credit recruiter wallet
  await prisma.user.update({
    where: { id: escrow.project.recruiterId },
    data: {
      walletBalance: { increment: refundAmount },
    },
  });

  // Log transaction
  await prisma.transaction.create({
    data: {
      userId: escrow.project.recruiterId,
      type: "REFUND",
      amount: refundAmount,
      description: `Escrow refund for project: ${escrow.project.title}`,
    },
  });

  // Update escrow
  await prisma.escrowHold.update({
    where: { projectId },
    data: {
      heldAmount: 0,
      refundedAmount: { increment: refundAmount },
      status: "REFUNDED",
    },
  });

  // Update project
  await prisma.project.update({
    where: { id: projectId },
    data: { escrowAmount: 0 },
  });

  // Mark pending release requests as refunded
  await prisma.milestoneReleaseRequest.updateMany({
    where: { projectId, status: "PENDING" },
    data: { status: "REFUNDED", adminNote },
  });

  return { refundAmount };
}

// Get all escrow holds (admin view)
export async function getAllEscrowHolds() {
  return prisma.escrowHold.findMany({
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          totalAmount: true,
          recruiter: {
            select: { id: true, name: true, email: true },
          },
          freelancer: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get escrow for a specific project (admin view)
export async function getProjectEscrowDetail(projectId: string) {
  const escrow = await prisma.escrowHold.findUnique({
    where: { projectId },
    include: {
      project: {
        include: {
          recruiter: {
            select: { id: true, name: true, email: true },
          },
          freelancer: {
            select: { id: true, name: true, email: true },
          },
          milestones: {
            orderBy: { order: "asc" },
            include: {
              releaseRequest: {
                include: {
                  freelancer: {
                    select: { id: true, name: true, email: true },
                  },
                  milestone: {
                    select: {
                      title: true,
                      order: true,
                      description: true,
                      proofOfWorkUrl: true,
                      proofNotes: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return escrow;
}


// Get pending release requests count
export async function getPendingReleaseCount() {
  return prisma.milestoneReleaseRequest.count({
    where: { status: "PENDING" },
  });
}

// Get all pending release requests (admin)
export async function getPendingReleaseRequests() {
  return prisma.milestoneReleaseRequest.findMany({
    where: { status: "PENDING" },
    include: {
      milestone: { select: { title: true, order: true } },
      project: { select: { title: true } },
      freelancer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}