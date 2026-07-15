import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { declineRelay } from "@/services/relay.service";
import { prisma } from "@/lib/prisma";

// POST — backup freelancer declines relay
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

    // Verify user is in relay queue
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
        { error: "You are not in the relay queue" },
        { status: 403 }
      );
    }

    if (slot.status !== "NOTIFIED") {
      return NextResponse.json(
        { error: "You have not been notified for relay" },
        { status: 400 }
      );
    }

    await declineRelay(id, user.id);

    return NextResponse.json({
      success: true,
      message: "Relay declined. Next backup has been notified.",
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to decline relay" },
      { status: 500 }
    );
  }
}