import { prisma } from "@/lib/prisma";

// Create a top-up request (recruiter submits UTR)
export async function createTopUpRequest(data: {
  userId: string;
  amount: number;
  utrNumber: string;
  screenshotUrl?: string;
  paymentNote?: string;
}) {
  return prisma.walletTopUp.create({
    data: {
      userId: data.userId,
      amount: data.amount,
      status: "SUBMITTED",
      utrNumber: data.utrNumber,
      screenshotUrl: data.screenshotUrl,
      paymentNote: data.paymentNote,
      submittedAt: new Date(),
    },
  });
}

// Admin verifies a top-up — credits wallet
export async function verifyTopUp(topUpId: string) {
  const topUp = await prisma.walletTopUp.findUnique({
    where: { id: topUpId },
  });

  if (!topUp) throw new Error("Top-up not found");
  if (topUp.status !== "SUBMITTED") throw new Error("Already processed");

  // Update top-up status
  await prisma.walletTopUp.update({
    where: { id: topUpId },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });

  // Credit wallet
  await prisma.user.update({
    where: { id: topUp.userId },
    data: {
      walletBalance: { increment: topUp.amount },
    },
  });

  // Log transaction
  await prisma.transaction.create({
    data: {
      userId: topUp.userId,
      type: "ESCROW_DEPOSIT",
      amount: topUp.amount,
      description: `Wallet top-up: ₹${topUp.amount} (UTR: ${topUp.utrNumber})`,
    },
  });

  return topUp;
}

// Reject a top-up
export async function rejectTopUp(topUpId: string) {
  return prisma.walletTopUp.update({
    where: { id: topUpId },
    data: { status: "REFUNDED" },
  });
}

// Get top-ups for a user
export async function getTopUpsByUser(userId: string) {
  return prisma.walletTopUp.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// Get all pending top-ups (admin)
export async function getPendingTopUps() {
  return prisma.walletTopUp.findMany({
    where: { status: "SUBMITTED" },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
}

// Get wallet transactions
export async function getWalletTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// Deduct wallet for escrow when hiring
export async function deductWalletForEscrow(
  userId: string,
  amount: number,
  projectTitle: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });

  if (!user || user.walletBalance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      walletBalance: { decrement: amount },
    },
  });

  await prisma.transaction.create({
    data: {
      userId,
      type: "ESCROW_DEPOSIT",
      amount: -amount,
      description: `Escrow for project: ${projectTitle}`,
    },
  });
}