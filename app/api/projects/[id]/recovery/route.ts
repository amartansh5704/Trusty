import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getRecoveryEvent } from "@/services/recovery.service";
import { getDossiersByProject } from "@/services/dossier.service";
import { getRelayQueue } from "@/services/relay.service";
import { prisma } from "@/lib/prisma";

// GET — get recovery brief and context
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        totalAmount: true,
        recruiterId: true,
        freelancerId: true,
        status: true,
        requiredSkills: true,
        deadline: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is in the relay queue, or is recruiter/admin
    const relayQueue = await getRelayQueue(id);
    const isInRelay = relayQueue.some(
      (slot) => slot.freelancerId === user.id
    );
    const isRecruiter = project.recruiterId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isInRelay && !isRecruiter && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recoveryEvent = await getRecoveryEvent(id);
    const dossiers = await getDossiersByProject(id);

    // Get milestones with status
    const milestones = await prisma.milestone.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        order: true,
        status: true,
        deadline: true,
      },
    });

    return NextResponse.json({
      project,
      recoveryEvent,
      dossiers,
      milestones,
      relayQueue,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch recovery data" },
      { status: 500 }
    );
  }
}