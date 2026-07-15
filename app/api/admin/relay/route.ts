import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getAllGhostAlerts } from "@/services/ghost.service";

// GET — get all ghost alerts (optionally filter by status)
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;

    const alerts = await getAllGhostAlerts(status);
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch ghost alerts" },
      { status: 500 }
    );
  }
}