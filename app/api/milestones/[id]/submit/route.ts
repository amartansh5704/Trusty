import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getMilestoneById, submitMilestone } from "@/services/milestone.service";
import { createNotification } from "@/services/notification.service";

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

    const milestone = await getMilestoneById(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.project.freelancerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (milestone.status !== "PENDING" && milestone.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Milestone cannot be submitted in its current state" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { proofOfWorkUrl, proofNotes } = body;

    if (!proofOfWorkUrl) {
      return NextResponse.json(
        { error: "Proof of work URL is required" },
        { status: 400 }
      );
    }

    const updated = await submitMilestone(id, { proofOfWorkUrl, proofNotes });

    await createNotification({
      userId: milestone.project.recruiterId,
      title: "Milestone Submitted",
      body: `Milestone "${milestone.title}" has been submitted for review.`,
      link: `/projects/${milestone.projectId}`,
    });

    return NextResponse.json({ milestone: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to submit milestone" },
      { status: 500 }
    );
  }
}