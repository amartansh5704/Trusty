import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const relaySlots = await prisma.backupRelaySlot.findMany({
      where: {
        freelancerId: user.id,
        status: "NOTIFIED",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { notifiedAt: "desc" },
    });

    return NextResponse.json({ relaySlots });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch relay slots" },
      { status: 500 }
    );
  }
}