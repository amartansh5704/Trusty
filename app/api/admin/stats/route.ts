import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      pendingTopUps,
      pendingReleases,
      pendingHires,
      escrowHolds,
      totalUsers,
      totalProjects,
      openDisputes,
    ] = await Promise.all([
      prisma.walletTopUp.count({ where: { status: "SUBMITTED" } }),
      prisma.milestoneReleaseRequest.count({ where: { status: "PENDING" } }),
      prisma.pendingHire.count({ where: { status: "PAYMENT_SUBMITTED" } }),
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