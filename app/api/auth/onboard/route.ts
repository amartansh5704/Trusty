import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { role, bio, skills, portfolioUrl } = body;

    if (!role || !["FREELANCER", "RECRUITER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role,
          bio: bio || null,
          skills: Array.isArray(skills) ? skills : [],
          portfolioUrl: portfolioUrl || null,
          creditBalance: 1000,
          earnedCredits: 1000,
        },
      }));

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Onboard error:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}