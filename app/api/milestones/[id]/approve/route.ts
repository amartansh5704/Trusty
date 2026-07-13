import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { approveMilestone, getMilestoneById } from "@/services/milestone.service";
import { releaseMilestonePayment } from "@/services/payment.service";
import { adjustCredits, CREDIT_EVENTS } from "@/services/credit.service";
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

    if (milestone.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Milestone is not submitted yet" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { freelancerId } = body;

    await approveMilestone(id);
    await releaseMilestonePayment(id, freelancerId);
    await adjustCredits(
      freelancerId,
      CREDIT_EVENTS.MILESTONE_COMPLETED,
      `Milestone completed: ${milestone.title}`
    );

    await createNotification({
      userId: freelancerId,
      title: "Milestone Approved",
      body: `Your milestone "${milestone.title}" was approved. Payment released.`,
      link: `/projects/${milestone.projectId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to approve milestone" },
      { status: 500 }
    );
  }
}