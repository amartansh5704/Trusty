import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        totalAmount: true,
        escrowAmount: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const amount = project.escrowAmount > 0
      ? project.escrowAmount
      : project.totalAmount;

    const escrow = await prisma.escrowHold.upsert({
      where: { projectId },
      update: {
        totalAmount: amount,
        heldAmount: amount,
        status: "HOLDING",
      },
      create: {
        projectId,
        totalAmount: amount,
        heldAmount: amount,
        status: "HOLDING",
      },
    });

    return NextResponse.json({ escrow });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create escrow hold" },
      { status: 500 }
    );
  }
}