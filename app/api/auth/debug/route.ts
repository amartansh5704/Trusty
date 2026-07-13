import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((c) => c.name);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();

  return NextResponse.json({
    hasSession: !!data.session,
    email: data.session?.user?.email ?? null,
    cookieNames,
  });
}