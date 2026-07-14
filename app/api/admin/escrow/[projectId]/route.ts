import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getProjectEscrowDetail } from "@/services/escrow.service";

export async function GET(
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

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const escrow = await getProjectEscrowDetail(projectId);

    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow hold not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ escrow });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch escrow detail" },
      { status: 500 }
    );
  }
}