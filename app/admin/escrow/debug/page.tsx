"use client";

import { useState } from "react";

const TEST_PROJECT_ID = "fff2cd40-b9cd-4e1a-bdef-e479a3fab815";

export default function EscrowDebugPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  async function runTests() {
    setLoading(true);
    const out: Record<string, any> = {};

    // Test 1 — auth check
    try {
      const r = await fetch("/api/auth/check");
      out["1_auth_check"] = {
        status: r.status,
        body: await r.json(),
      };
    } catch (e: any) {
      out["1_auth_check"] = { error: e.message };
    }

    // Test 2 — escrow list
    try {
      const r = await fetch("/api/admin/escrow/list");
      out["2_escrow_list"] = {
        status: r.status,
        body: await r.json(),
      };
    } catch (e: any) {
      out["2_escrow_list"] = { error: e.message };
    }

    // Test 3 — hit the dynamic API route directly
    try {
      const r = await fetch(`/api/admin/escrow/${TEST_PROJECT_ID}`);
      out["3_escrow_detail_api"] = {
        status: r.status,
        url: `/api/admin/escrow/${TEST_PROJECT_ID}`,
        body: await r.json(),
      };
    } catch (e: any) {
      out["3_escrow_detail_api"] = { error: e.message };
    }

    // Test 4 — check all api/admin/escrow sub routes
    const subRoutes = [
      `/api/admin/escrow/list`,
      `/api/admin/escrow/create`,
      `/api/admin/escrow/${TEST_PROJECT_ID}`,
      `/api/admin/escrow/${TEST_PROJECT_ID}/refund`,
    ];

    for (const route of subRoutes) {
      try {
        const r = await fetch(route, { method: "GET" });
        let body: any;
        const text = await r.text();
        try {
          body = JSON.parse(text);
        } catch {
          body = text.slice(0, 200);
        }
        out[`route_${route}`] = { status: r.status, body };
      } catch (e: any) {
        out[`route_${route}`] = { error: e.message };
      }
    }

    // Test 5 — check if the page route itself resolves
    try {
      const r = await fetch(`/admin/escrow/${TEST_PROJECT_ID}`, {
        method: "GET",
        headers: { Accept: "text/html" },
      });
      const text = await r.text();
      out["5_page_route"] = {
        status: r.status,
        // Show first 300 chars — tells us if it hit a page or 404
        preview: text.slice(0, 300),
      };
    } catch (e: any) {
      out["5_page_route"] = { error: e.message };
    }

    // Test 6 — check next.js routing for admin/escrow/*
    try {
      const r = await fetch(`/admin/escrow/list`, {
        method: "GET",
        headers: { Accept: "text/html" },
      });
      out["6_list_page_route"] = {
        status: r.status,
        preview: (await r.text()).slice(0, 200),
      };
    } catch (e: any) {
      out["6_list_page_route"] = { error: e.message };
    }

    setResults(out);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-2">Escrow Debug</h1>
      <p className="text-gray-400 mb-2 text-sm">
        Testing project ID:{" "}
        <span className="font-mono text-yellow-400">{TEST_PROJECT_ID}</span>
      </p>
      <p className="text-gray-500 text-xs mb-6">
        Make sure you are logged in as admin before running.
      </p>

      <button
        onClick={runTests}
        disabled={loading}
        className="bg-yellow-400 text-black px-6 py-2 rounded-lg font-semibold mb-8 disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Debug Tests"}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="border border-gray-800 rounded-lg overflow-hidden">
              <div
                className={`px-4 py-2 text-sm font-mono font-semibold ${
                  value?.status === 200
                    ? "bg-green-900/30 text-green-400"
                    : value?.status === 404
                    ? "bg-red-900/30 text-red-400"
                    : value?.status === 401 || value?.status === 403
                    ? "bg-yellow-900/30 text-yellow-400"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                {key}{" "}
                {value?.status !== undefined && (
                  <span className="ml-2">→ HTTP {value.status}</span>
                )}
              </div>
              <pre className="bg-black p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}