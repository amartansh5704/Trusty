import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import {
  acceptApplication,
  rejectOtherApplications,
} from "@/services/application.service";
import { assignFreelancer, getProjectForAuth } from "@/services/project.service";
import { stakeCreditsForProject } from "@/services/credit.service";
import { createNotification } from "@/services/notification.service";
import { calculateStakeAmount } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

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

    const application = await prisma.application.findUnique({
      where: { id: id },
      include: {
        freelancer: true,
        project: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.project.recruiterId !== recruiter.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stakeAmount = calculateStakeAmount(
      application.project.totalAmount,
      application.freelancer.creditBalance
    );

    if (application.freelancer.creditBalance < stakeAmount) {
      return NextResponse.json(
        { error: "Freelancer does not have enough credits to stake" },
        { status: 400 }
      );
    }

    await acceptApplication(id);
    await rejectOtherApplications(application.projectId, id);
    await assignFreelancer(
      application.projectId,
      application.freelancerId,
      stakeAmount
    );
    await stakeCreditsForProject(
      application.freelancerId,
      stakeAmount,
      application.project.title
    );

    await createNotification({
      userId: application.freelancerId,
      title: "Application Accepted",
      body: `You have been hired for: ${application.project.title}`,
      link: `/projects/${application.projectId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to accept application" },
      { status: 500 }
    );
  }
}