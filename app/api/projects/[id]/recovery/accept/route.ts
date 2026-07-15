import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { executeRelayAcceptance } from "@/services/recovery.service";
import { prisma } from "@/lib/prisma";

// POST — backup freelancer accepts relay
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "FREELANCER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify user is in relay queue and NOTIFIED
    const slot = await prisma.backupRelaySlot.findUnique({
      where: {
        projectId_freelancerId: {
          projectId: id,
          freelancerId: user.id,
        },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "You are not in the relay queue for this project" },
        { status: 403 }
      );
    }

    if (slot.status !== "NOTIFIED") {
      return NextResponse.json(
        { error: "You have not been notified for relay yet" },
        { status: 400 }
      );
    }

    const result = await executeRelayAcceptance(id, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to accept relay" },
      { status: 500 }
    );
  }
}