import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    if (existing) {
      return NextResponse.json({ user: existing });
    }

    const body = await req.json();
    const { name, role, bio, skills, portfolioUrl } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 }
      );
    }

    const validRoles = ["FREELANCER", "RECRUITER", "ADMIN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: authUser.email,
        name,
        role,
        bio: bio || null,
        skills: skills || [],
        portfolioUrl: portfolioUrl || null,
        creditBalance: role === "FREELANCER" ? 25 : 0,
        earnedCredits: role === "FREELANCER" ? 25 : 0,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}