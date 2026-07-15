import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { sendMessage, getMessages, markMessagesRead } from "@/services/message.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { recruiterId: true, freelancerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.recruiterId !== user.id && project.freelancerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await markMessagesRead(projectId, user.id);
    const messages = await getMessages(projectId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, content } = body;

    if (!projectId || !content?.trim()) {
      return NextResponse.json({ error: "projectId and content are required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { recruiterId: true, freelancerId: true, status: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.recruiterId !== user.id && project.freelancerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (project.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot message on a cancelled project" }, { status: 400 });
    }

    const message = await sendMessage({
      projectId,
      senderId: user.id,
      content: content.trim(),
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}