import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import {
  createDossierEntry,
  getDossiersByProject,
} from "@/services/dossier.service";
import { summarizeDossierEntry } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

// GET — get all dossier entries for a project
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

    // Recruiter, freelancer, or admin can view
    if (
      project.recruiterId !== user.id &&
      project.freelancerId !== user.id &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dossiers = await getDossiersByProject(id);
    return NextResponse.json({ dossiers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch dossiers" },
      { status: 500 }
    );
  }
}

// POST — freelancer creates a dossier entry
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

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        freelancerId: true,
        recruiterId: true,
        status: true,
        title: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.freelancerId !== user.id) {
      return NextResponse.json(
        { error: "You are not the freelancer on this project" },
        { status: 403 }
      );
    }

    if (project.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Project is not in progress" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      milestoneId,
      completedWork,
      remainingWork,
      technicalNotes,
      knownIssues,
      nextSteps,
      filesAndAccess,
    } = body;

    if (!completedWork || !remainingWork) {
      return NextResponse.json(
        { error: "completedWork and remainingWork are required" },
        { status: 400 }
      );
    }

    // Validate milestone belongs to project if provided
    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        select: { projectId: true },
      });

      if (!milestone || milestone.projectId !== id) {
        return NextResponse.json(
          { error: "Milestone does not belong to this project" },
          { status: 400 }
        );
      }
    }

    // Generate AI summary
    let aiSummary: string | undefined;
    try {
      aiSummary = await summarizeDossierEntry({
        completedWork,
        remainingWork,
        technicalNotes,
        knownIssues,
        nextSteps,
        filesAndAccess,
      });
    } catch {
      // Gemini failed — not critical, skip
    }

    const dossier = await createDossierEntry({
      projectId: id,
      milestoneId: milestoneId || undefined,
      authorId: user.id,
      completedWork,
      remainingWork,
      technicalNotes: technicalNotes || undefined,
      knownIssues: knownIssues || undefined,
      nextSteps: nextSteps || undefined,
      filesAndAccess: filesAndAccess || undefined,
      aiSummary,
    });

    return NextResponse.json({ dossier }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create dossier entry" },
      { status: 500 }
    );
  }
}