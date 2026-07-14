import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import {
  approveFullRelease,
  approvePartialRelease,
} from "@/services/escrow.service";
import { createNotification } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await getUserByEmail(session.user.email);
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, approvedAmount, adminNote } = body;

    if (!action || !["full", "partial", "refund"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be full, partial, or refund." },
        { status: 400 }
      );
    }

    // Fetch release request for notification data
    const releaseRequest =
      await prisma.milestoneReleaseRequest.findUnique({
        where: { id },
        include: {
          milestone: { select: { title: true } },
          project: {
            select: {
              title: true,
              recruiterId: true,
            },
          },
        },
      });

    if (!releaseRequest) {
      return NextResponse.json(
        { error: "Release request not found" },
        { status: 404 }
      );
    }

    if (releaseRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This release request has already been processed" },
        { status: 400 }
      );
    }

    if (action === "full") {
      await approveFullRelease(id);

      await createNotification({
        userId: releaseRequest.freelancerId,
        title: "Payment Released",
        body: `₹${releaseRequest.amount} has been released to your wallet for milestone "${releaseRequest.milestone.title}".`,
        link: `/wallet`,
      });

      await createNotification({
        userId: releaseRequest.project.recruiterId,
        title: "Milestone Payment Released",
        body: `Payment for milestone "${releaseRequest.milestone.title}" has been released to the freelancer.`,
        link: `/projects/${releaseRequest.projectId}`,
      });

      return NextResponse.json({ success: true, action: "full" });
    }

    if (action === "partial") {
      if (!approvedAmount || approvedAmount <= 0) {
        return NextResponse.json(
          { error: "approvedAmount is required for partial release" },
          { status: 400 }
        );
      }

      if (approvedAmount > releaseRequest.amount) {
        return NextResponse.json(
          {
            error: `Approved amount cannot exceed milestone amount of ₹${releaseRequest.amount}`,
          },
          { status: 400 }
        );
      }

      await approvePartialRelease(id, approvedAmount, adminNote);

      const remainder = releaseRequest.amount - approvedAmount;

      await createNotification({
        userId: releaseRequest.freelancerId,
        title: "Partial Payment Released",
        body: `₹${approvedAmount} has been released for milestone "${releaseRequest.milestone.title}". ₹${remainder} remains in escrow.`,
        link: `/wallet`,
      });

      await createNotification({
        userId: releaseRequest.project.recruiterId,
        title: "Partial Milestone Payment",
        body: `₹${approvedAmount} of ₹${releaseRequest.amount} released for milestone "${releaseRequest.milestone.title}".`,
        link: `/projects/${releaseRequest.projectId}`,
      });

      return NextResponse.json({ success: true, action: "partial" });
    }

    if (action === "refund") {
      // Refund just this milestone's amount back to recruiter
      await prisma.milestoneReleaseRequest.update({
        where: { id },
        data: {
          status: "REFUNDED",
          adminNote: adminNote ?? "Refunded by admin",
        },
      });

      // Credit recruiter wallet
      await prisma.user.update({
        where: { id: releaseRequest.project.recruiterId },
        data: {
          walletBalance: { increment: releaseRequest.amount },
        },
      });

      // Log transaction
      await prisma.transaction.create({
        data: {
          userId: releaseRequest.project.recruiterId,
          type: "REFUND",
          amount: releaseRequest.amount,
          description: `Refund for milestone: ${releaseRequest.milestone.title}`,
        },
      });

      // Update escrow hold
      await prisma.escrowHold.update({
        where: { projectId: releaseRequest.projectId },
        data: {
          heldAmount: { decrement: releaseRequest.amount },
          refundedAmount: { increment: releaseRequest.amount },
        },
      });

      // Update project escrow
      await prisma.project.update({
        where: { id: releaseRequest.projectId },
        data: {
          escrowAmount: { decrement: releaseRequest.amount },
        },
      });

      await createNotification({
        userId: releaseRequest.project.recruiterId,
        title: "Milestone Refunded",
        body: `₹${releaseRequest.amount} refunded to your wallet for milestone "${releaseRequest.milestone.title}".`,
        link: `/wallet`,
      });

      await createNotification({
        userId: releaseRequest.freelancerId,
        title: "Milestone Payment Declined",
        body: `Payment for milestone "${releaseRequest.milestone.title}" was not released. Contact support if you have questions.`,
        link: `/projects/${releaseRequest.projectId}`,
      });

      return NextResponse.json({ success: true, action: "refund" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to process release" },
      { status: 500 }
    );
  }
}