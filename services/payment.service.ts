import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";

export async function createEscrowPayment(data: {
  projectId: string;
  amount: number;
  upiQrReference?: string;
}) {
  return prisma.payment.create({
    data: {
      ...data,
      status: "PENDING",
    },
  });
}

export async function submitUTR(paymentId: string, utrNumber: string) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      utrNumber,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
}

export async function verifyPayment(paymentId: string) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
    include: { project: true },
  });

  await prisma.project.update({
    where: { id: payment.projectId },
    data: { escrowAmount: payment.amount },
  });

  await prisma.transaction.create({
    data: {
      userId: payment.project.recruiterId,
      type: "ESCROW_DEPOSIT",
      amount: payment.amount,
      description: `Escrow deposit for project: ${payment.project.title}`,
    },
  });

  return payment;
}

export async function releaseMilestonePayment(
  milestoneId: string,
  freelancerId: string
) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: true },
  });

  if (!milestone) throw new Error("Milestone not found");

  const payment = await prisma.payment.upsert({
    where: { milestoneId },
    update: {
      status: "RELEASED",
      releasedAt: new Date(),
    },
    create: {
      projectId: milestone.projectId,
      milestoneId,
      amount: milestone.amount,
      status: "RELEASED",
      releasedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: freelancerId },
    data: {
      walletBalance: { increment: milestone.amount },
    },
  });

  await prisma.project.update({
    where: { id: milestone.projectId },
    data: {
      escrowAmount: { decrement: milestone.amount },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: freelancerId,
      type: "MILESTONE_RELEASE",
      amount: milestone.amount,
      description: `Payment for milestone: ${milestone.title}`,
    },
  });

  return payment;
}

export async function getPaymentsByProject(projectId: string) {
  return prisma.payment.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingPayments() {
  return prisma.payment.findMany({
    where: { status: "SUBMITTED" },
    include: {
      project: {
        select: {
          title: true,
          recruiter: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
}