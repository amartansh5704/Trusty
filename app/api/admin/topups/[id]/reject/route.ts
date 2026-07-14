import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserByEmail } from "@/services/user.service";
import { rejectTopUp } from "@/services/wallet.service";
import { createNotification } from "@/services/notification.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

    const topUp = await prisma.walletTopUp.findUnique({
      where: { id },
    });

    if (!topUp) {
      return NextResponse.json({ error: "Top-up not found" }, { status: 404 });
    }

    await rejectTopUp(id);

    await createNotification({
      userId: topUp.userId,
      title: "Top-Up Rejected",
      body: `Your wallet top-up of ₹${topUp.amount} was rejected. Please check your UTR and try again.`,
      link: "/wallet",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to reject top-up" },
      { status: 500 }
    );
  }
}