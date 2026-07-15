import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { raiseGhostAlert, getGhostAlert } from "@/services/ghost.service";
import { prisma } from "@/lib/prisma";

// GET — check if ghost alert exists for project
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

    const alert = await getGhostAlert(id);
    return NextResponse.json({ alert: alert ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch ghost alert" },
      { status: 500 }
    );
  }
}

// POST — recruiter raises ghost alert
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
      select: {
        recruiterId: true,
        freelancerId: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.recruiterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (project.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Ghost alerts can only be raised on active projects" },
        { status: 400 }
      );
    }

    if (!project.freelancerId) {
      return NextResponse.json(
        { error: "No freelancer assigned to this project" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { note } = body;

    const alert = await raiseGhostAlert({
      projectId: id,
      raisedById: user.id,
      freelancerId: project.freelancerId,
      note: note?.trim() || undefined,
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to raise ghost alert" },
      { status: 500 }
    );
  }
}