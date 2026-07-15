import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { removeBackupSlot } from "@/services/relay.service";
import { prisma } from "@/lib/prisma";

// DELETE — remove a backup slot
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const { id, slotId } = await params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { recruiterId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.recruiterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify slot belongs to this project
    const slot = await prisma.backupRelaySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot || slot.projectId !== id) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    if (slot.status !== "STANDBY") {
      return NextResponse.json(
        { error: "Cannot remove a backup that has been activated" },
        { status: 400 }
      );
    }

    await removeBackupSlot(slotId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to remove backup" },
      { status: 500 }
    );
  }
}