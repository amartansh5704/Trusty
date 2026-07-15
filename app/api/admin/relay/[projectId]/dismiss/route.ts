import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { dismissGhostAlert } from "@/services/ghost.service";
import { createNotification } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";

// POST — admin dismisses ghost alert (false alarm)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dismissGhostAlert(projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { recruiterId: true, title: true },
    });

    if (project) {
      await createNotification({
        userId: project.recruiterId,
        title: "Ghost Alert Dismissed",
        body: `Your ghost alert for "${project.title}" has been reviewed and dismissed by admin.`,
        link: `/projects/${projectId}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to dismiss alert" },
      { status: 500 }
    );
  }
}