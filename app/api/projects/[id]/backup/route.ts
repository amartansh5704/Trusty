import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { addBackupSlot, getRelayQueue } from "@/services/relay.service";
import { prisma } from "@/lib/prisma";

// GET — get relay queue for a project
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
      select: { recruiterId: true, freelancerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only recruiter, assigned freelancer, or admin can see relay queue
    if (
      project.recruiterId !== user.id &&
      project.freelancerId !== user.id &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const queue = await getRelayQueue(id);
    return NextResponse.json({ queue });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch relay queue" },
      { status: 500 }
    );
  }
}

// POST — add backup freelancer
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
    if (user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { recruiterId: true, freelancerId: true, status: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.recruiterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { freelancerId } = body;

    if (!freelancerId) {
      return NextResponse.json(
        { error: "freelancerId is required" },
        { status: 400 }
      );
    }

    // Cannot add primary freelancer as backup
    if (freelancerId === project.freelancerId) {
      return NextResponse.json(
        { error: "Cannot add the primary freelancer as backup" },
        { status: 400 }
      );
    }

    // Get current queue to determine order
    const currentQueue = await getRelayQueue(id);
    const nextOrder = currentQueue.length + 1;

    if (nextOrder > 5) {
      return NextResponse.json(
        { error: "Maximum 5 backup freelancers allowed" },
        { status: 400 }
      );
    }

    const slot = await addBackupSlot({
      projectId: id,
      freelancerId,
      order: nextOrder,
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to add backup" },
      { status: 500 }
    );
  }
}