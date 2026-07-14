import { prisma } from "@/lib/prisma";
import { createEscrowHold } from "./escrow.service";
import { deductWalletForEscrow } from "./wallet.service";
import { acceptApplication, rejectOtherApplications } from "./application.service";
import { assignFreelancer } from "./project.service";
import { stakeCreditsForProject } from "./credit.service";
import { createNotification } from "./notification.service";
import { calculateStakeAmount } from "@/lib/utils";

// Create a pending hire with UPI payment
export async function createPendingHire(data: {
  projectId: string;
  applicationId: string;
  recruiterId: string;
  freelancerId: string;
  amount: number;
  paymentMethod: "WALLET" | "UPI";
  utrNumber?: string;
  screenshotUrl?: string;
}) {
  const status =
    data.paymentMethod === "UPI" ? "PAYMENT_SUBMITTED" : "PENDING_PAYMENT";

  return prisma.pendingHire.create({
    data: {
      projectId: data.projectId,
      applicationId: data.applicationId,
      recruiterId: data.recruiterId,
      freelancerId: data.freelancerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      utrNumber: data.utrNumber,
      screenshotUrl: data.screenshotUrl,
      status,
    },
  });
}

// Execute the full hire process (called after wallet pay or admin verify)
export async function executeHire(pendingHireId: string) {
  const hire = await prisma.pendingHire.findUnique({
    where: { id: pendingHireId },
    include: {
      project: true,
      freelancer: true,
      application: true,
    },
  });

  if (!hire) throw new Error("Pending hire not found");

  // 1. Accept application + reject others
  await acceptApplication(hire.applicationId);
  await rejectOtherApplications(hire.projectId, hire.applicationId);

  // 2. Calculate and stake credits
  const stakeAmount = calculateStakeAmount(
    hire.project.totalAmount,
    hire.freelancer.creditBalance
  );

  // 3. Assign freelancer to project
  await assignFreelancer(hire.projectId, hire.freelancerId, stakeAmount);

  // 4. Stake freelancer credits
  if (stakeAmount > 0 && hire.freelancer.creditBalance >= stakeAmount) {
    await stakeCreditsForProject(
      hire.freelancerId,
      stakeAmount,
      hire.project.title
    );
  }

  // 5. Create escrow hold
  await createEscrowHold(hire.projectId, hire.amount);

  // 6. Set project escrow amount
  await prisma.project.update({
    where: { id: hire.projectId },
    data: { escrowAmount: hire.amount },
  });

  // 7. Update pending hire status
  await prisma.pendingHire.update({
    where: { id: pendingHireId },
    data: { status: "ESCROW_ACTIVE" },
  });

  // 8. Notify freelancer
  await createNotification({
    userId: hire.freelancerId,
    title: "You've Been Hired!",
    body: `You have been hired for: ${hire.project.title}. Payment is in escrow.`,
    link: `/projects/${hire.projectId}`,
  });

  return hire;
}

// Get all pending hires for admin
export async function getPendingHires() {
  return prisma.pendingHire.findMany({
    where: {
      status: { in: ["PAYMENT_SUBMITTED", "ADMIN_VERIFIED"] },
    },
    include: {
      project: { select: { id: true, title: true, totalAmount: true } },
      recruiter: { select: { id: true, name: true, email: true } },
      freelancer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Get pending hire by application
export async function getPendingHireByApplication(applicationId: string) {
  return prisma.pendingHire.findUnique({
    where: { applicationId },
  });
}