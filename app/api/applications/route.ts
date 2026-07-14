import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import {
  createApplication,
  getApplicationByFreelancerAndProject,
} from "@/services/application.service";
import { getProjectForAuth } from "@/services/project.service";
import { createNotification } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "FREELANCER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, coverLetter, proposedAmount } = body;

    const project = await getProjectForAuth(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "OPEN") {
      return NextResponse.json(
        { error: "Project is not accepting applications" },
        { status: 400 }
      );
    }

    const existing = await getApplicationByFreelancerAndProject(
      user.id,
      projectId
    );
    if (existing) {
      return NextResponse.json(
        { error: "Already applied to this project" },
        { status: 400 }
      );
    }

    const application = await createApplication({
      projectId,
      freelancerId: user.id,
      coverLetter,
      proposedAmount: proposedAmount ? Number(proposedAmount) : undefined,
    });

    await createNotification({
      userId: project.recruiterId,
      title: "New Application",
      body: `${user.name} applied to your project.`,
      link: `/projects/${projectId}`,
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}