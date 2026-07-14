import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { rejectMilestone, getMilestoneById } from "@/services/milestone.service";
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
    if (user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const milestone = await getMilestoneById(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.project.recruiterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await rejectMilestone(id);

    if (milestone.project.freelancerId) {
      await createNotification({
        userId: milestone.project.freelancerId,
        title: "Milestone Rejected",
        body: `Your milestone "${milestone.title}" was rejected. Please revise and resubmit.`,
        link: `/projects/${milestone.projectId}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to reject milestone" },
      { status: 500 }
    );
  }
}