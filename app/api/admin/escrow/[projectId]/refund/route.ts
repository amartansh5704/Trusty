import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { refundEscrow } from "@/services/escrow.service";
import { createNotification } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

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
    const { adminNote } = body;

    const escrow = await prisma.escrowHold.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            title: true,
            recruiterId: true,
            freelancerId: true,
          },
        },
      },
    });

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow hold not found" },
        { status: 404 }
      );
    }

    if (escrow.heldAmount <= 0) {
      return NextResponse.json(
        { error: "No funds remaining in escrow to refund" },
        { status: 400 }
      );
    }

    const { refundAmount } = await refundEscrow(projectId, adminNote);

    await createNotification({
      userId: escrow.project.recruiterId,
      title: "Escrow Refunded",
      body: `₹${refundAmount} has been refunded to your wallet from project: ${escrow.project.title}.`,
      link: `/wallet`,
    });

    if (escrow.project.freelancerId) {
      await createNotification({
        userId: escrow.project.freelancerId,
        title: "Project Escrow Refunded",
        body: `The escrow for project "${escrow.project.title}" has been fully refunded to the recruiter.`,
        link: `/projects/${projectId}`,
      });
    }

    return NextResponse.json({ success: true, refundAmount });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to refund escrow" },
      { status: 500 }
    );
  }
}