import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getAllEscrowHolds } from "@/services/escrow.service";
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

    const escrows = await getAllEscrowHolds();

    const escrowsWithPending = await Promise.all(
      escrows.map(async (escrow) => {
        const pendingReleases =
          await prisma.milestoneReleaseRequest.count({
            where: {
              projectId: escrow.projectId,
              status: "PENDING",
            },
          });
        return { ...escrow, pendingReleases };
      })
    );

    return NextResponse.json({ escrows: escrowsWithPending });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch escrow holds" },
      { status: 500 }
    );
  }
}