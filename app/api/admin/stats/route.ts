import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      pendingTopUps,
      pendingReleases,
      pendingHires,
      ghostAlerts,
      escrowHolds,
      totalUsers,
      totalProjects,
      openDisputes,
    ] = await Promise.all([
      prisma.walletTopUp.count({ where: { status: "SUBMITTED" } }),
      prisma.milestoneReleaseRequest.count({ where: { status: "PENDING" } }),
      prisma.pendingHire.count({ where: { status: "PAYMENT_SUBMITTED" } }),
      prisma.ghostAlert.count({ where: { status: "RAISED" } }),
      prisma.escrowHold.aggregate({
        _sum: { heldAmount: true },
        where: {
          status: { in: ["HOLDING", "PARTIALLY_RELEASED"] },
        },
      }),
      prisma.user.count(),
      prisma.project.count(),
      prisma.dispute.count({ where: { status: "OPEN" } }),
    ]);

    return NextResponse.json({
      pendingTopUps,
      pendingReleases,
      pendingHires,
      ghostAlerts,
      totalEscrowHeld: escrowHolds._sum.heldAmount ?? 0,
      totalUsers,
      totalProjects,
      openDisputes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}