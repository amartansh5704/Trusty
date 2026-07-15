import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { triggerRecovery } from "@/services/recovery.service";

// POST — admin confirms ghost and triggers recovery
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

    const recoveryEvent = await triggerRecovery(projectId, user.id);

    return NextResponse.json({
      success: true,
      recoveryEvent,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message ?? "Failed to trigger recovery" },
      { status: 500 }
    );
  }
}