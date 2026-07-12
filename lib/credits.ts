import { prisma } from "./prisma";

export const CREDIT_EVENTS = {
  PROJECT_COMPLETED: 50,
  REVIEW_5_STAR: 30,
  REVIEW_4_STAR: 15,
  REVIEW_3_STAR: 0,
  REVIEW_2_STAR: -20,
  REVIEW_1_STAR: -20,
  MILESTONE_COMPLETED: 10,
  EARLY_DELIVERY: 20,
  SKILL_VERIFIED: 40,
  ACCOUNT_VERIFIED: 25,
  GHOSTING: -150,
  MISSED_DEADLINE: -30,
  DISPUTE_LOST: -75,
  REPEATED_LATE: -15,
} as const;

export async function adjustCredits(
  userId: string,
  change: number,
  reason: string,
  isPurchased: boolean = false
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const newBalance = user.creditBalance + change;

  await prisma.user.update({
    where: { id: userId },
    data: {
      creditBalance: newBalance,
      earnedCredits: isPurchased
        ? user.earnedCredits
        : user.earnedCredits + (change > 0 ? change : 0),
      purchasedCredits: isPurchased
        ? user.purchasedCredits + change
        : user.purchasedCredits,
    },
  });

  await prisma.creditLog.create({
    data: {
      userId,
      change,
      reason,
      balanceAfter: newBalance,
    },
  });

  return newBalance;
}

export async function purchaseCredits(userId: string, amountInRupees: number) {
  const creditsToAdd = amountInRupees;
  return adjustCredits(
    userId,
    creditsToAdd,
    `Purchased ${creditsToAdd} credits for ₹${amountInRupees}`,
    true
  );
}