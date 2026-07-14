import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { createProject, getOpenProjects } from "@/services/project.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const skill = searchParams.get("skill") || undefined;

    const projects = await getOpenProjects(search, skill);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, totalAmount, requiredSkills, deadline, milestones } = body;

    if (!title || !description || !totalAmount || !deadline || !milestones?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const project = await createProject({
      title,
      description,
      totalAmount: Number(totalAmount),
      requiredSkills: requiredSkills || [],
      deadline: new Date(deadline),
      recruiterId: user.id,
      milestones: milestones.map((m: any, index: number) => ({
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        deadline: new Date(m.deadline),
        order: index + 1,
      })),
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}