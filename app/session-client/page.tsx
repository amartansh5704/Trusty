"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SessionClientPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Client Session Debug</h1>

      {loading && <p className="text-gray-400">Checking session...</p>}

      {!loading && error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          <p>
            <b>hasSession:</b> {session ? "true" : "false"}
          </p>
          <p>
            <b>email:</b> {session?.user?.email ?? "null"}
          </p>
          <pre className="bg-gray-900 border border-gray-800 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}