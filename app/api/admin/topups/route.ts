import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    const topUps = await prisma.walletTopUp.findMany({
      where: all ? undefined : { status: "SUBMITTED" },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ topUps });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch top-ups" },
      { status: 500 }
    );
  }
}