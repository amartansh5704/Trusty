import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { approveMilestone, getMilestoneById } from "@/services/milestone.service";
import { createReleaseRequest } from "@/services/escrow.service";
import { adjustCredits, CREDIT_EVENTS } from "@/services/credit.service";
import { createNotification } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";

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

    if (milestone.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Milestone is not submitted yet" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { freelancerId } = body;

    if (!freelancerId) {
      return NextResponse.json(
        { error: "freelancerId is required" },
        { status: 400 }
      );
    }

    await approveMilestone(id);

    await createReleaseRequest({
      milestoneId: id,
      projectId: milestone.projectId,
      freelancerId,
      amount: milestone.amount,
    });

    await adjustCredits(
      freelancerId,
      CREDIT_EVENTS.MILESTONE_COMPLETED,
      `Milestone completed: ${milestone.title}`
    );

    await createNotification({
      userId: freelancerId,
      title: "Milestone Approved",
      body: `Your milestone "${milestone.title}" was approved. Payment is pending admin release.`,
      link: `/projects/${milestone.projectId}`,
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        title: "Release Request",
        body: `Milestone "${milestone.title}" approved. Payment ₹${milestone.amount} awaiting your release.`,
        link: `/admin/escrow/${milestone.projectId}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to approve milestone" },
      { status: 500 }
    );
  }
}