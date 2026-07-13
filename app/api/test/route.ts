import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "loaded" : "MISSING",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "loaded" : "MISSING",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "loaded" : "MISSING",
    databaseUrl: process.env.DATABASE_URL ? "loaded" : "MISSING",
  });
}