import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
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

    const hire = await prisma.pendingHire.findUnique({
      where: { id },
      include: {
        project: { select: { title: true } },
        recruiter: { select: { id: true } },
      },
    });

    if (!hire) {
      return NextResponse.json(
        { error: "Pending hire not found" },
        { status: 404 }
      );
    }

    if (hire.status !== "PAYMENT_SUBMITTED") {
      return NextResponse.json(
        { error: "This hire has already been processed" },
        { status: 400 }
      );
    }

    await prisma.pendingHire.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await createNotification({
      userId: hire.recruiterId,
      title: "Hire Payment Rejected",
      body: `Your payment for "${hire.project.title}" could not be verified. Please try again with a valid UTR.`,
      link: `/projects/${hire.projectId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to reject hire" },
      { status: 500 }
    );
  }
}