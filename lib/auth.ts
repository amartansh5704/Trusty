import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase-server";

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser?.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(role: "FREELANCER" | "RECRUITER" | "ADMIN") {
  const user = await requireUser();
  if (user.role !== role) throw new Error("Forbidden");
  return user;
}