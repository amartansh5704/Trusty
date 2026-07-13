import { NextResponse } from "next/server";
import { getProjectById } from "@/services/project.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try{ 
    const { id } = await params;
  const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}