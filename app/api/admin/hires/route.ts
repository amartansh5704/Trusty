import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { getPendingHires } from "@/services/hire.service";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await getUserByEmail(session.user.email);
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hires = await getPendingHires();
    return NextResponse.json({ hires });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch pending hires" },
      { status: 500 }
    );
  }
}