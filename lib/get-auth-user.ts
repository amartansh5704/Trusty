import { createSupabaseServerClient } from "./supabase-server";
import { prisma } from "./prisma";

export async function getAuthUser() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
    });

    return user;
  } catch {
    return null;
  }
}