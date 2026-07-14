import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser?.email) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    return NextResponse.json({ user: user ?? null });
  } catch {
    return NextResponse.json({ user: null });
  }
}