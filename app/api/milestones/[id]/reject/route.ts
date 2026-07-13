import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { rejectMilestone, getMilestoneById } from "@/services/milestone.service";
import { createNotification } from "@/services/notification.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recruiter = await getUserByEmail(session.user.email);
    if (!recruiter || recruiter.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const milestone = await getMilestoneById(id);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (milestone.project.recruiterId !== recruiter.id) {
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