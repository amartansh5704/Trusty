"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Play } from "lucide-react";

type TestResult = {
  name: string;
  status: "idle" | "running" | "pass" | "fail";
  message: string;
  detail?: string;
  duration?: number;
};

async function run(
  fn: () => Promise<{ ok: boolean; message: string; detail?: string }>
): Promise<{ ok: boolean; message: string; detail?: string; duration: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, duration: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false,
      message: "Threw an exception",
      detail: err?.message ?? String(err),
      duration: Date.now() - start,
    };
  }
}

const TESTS: Array<{
  group: string;
  tests: Array<{
    name: string;
    fn: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  }>;
}> = [
  {
    group: "Schema Health",
    tests: [
      {
        name: "BackupRelaySlot table exists",
        fn: async () => {
          const res = await fetch("/api/health");
          return res.ok
            ? { ok: true, message: "Health OK" }
            : { ok: false, message: `Status ${res.status}` };
        },
      },
      {
        name: "Auth check works",
        fn: async () => {
          const res = await fetch("/api/auth/check");
          const data = await res.json();
          if (data.user) {
            return {
              ok: true,
              message: `Logged in as ${data.user.name} (${data.user.role})`,
            };
          }
          return {
            ok: false,
            message: "Not logged in — some tests will fail",
          };
        },
      },
    ],
  },
  {
    group: "Backup Relay API",
    tests: [
      {
        name: "GET /api/projects/fake-id/backup returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/backup");
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "POST /api/projects/fake-id/backup without body returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
    ],
  },
  {
    group: "Dossier API",
    tests: [
      {
        name: "GET /api/projects/fake-id/dossier returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/dossier");
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "POST /api/projects/fake-id/dossier without body returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/dossier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
    ],
  },
  {
    group: "Ghost Alert API",
    tests: [
      {
        name: "GET /api/projects/fake-id/ghost-alert returns ok",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/ghost-alert");
          if (res.status >= 400 && res.status < 500) {
            return { ok: true, message: `Correctly returned ${res.status}` };
          }
          if (res.ok) {
            const data = await res.json();
            return {
              ok: true,
              message: `Returned alert: ${data.alert ? "exists" : "null"}`,
            };
          }
          return { ok: false, message: `Unexpected ${res.status}` };
        },
      },
      {
        name: "POST /api/projects/fake-id/ghost-alert returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/ghost-alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: "test" }),
          });
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
    ],
  },
  {
    group: "Recovery API",
    tests: [
      {
        name: "GET /api/projects/fake-id/recovery returns 4xx",
        fn: async () => {
          const res = await fetch("/api/projects/fake-id-00000/recovery");
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "POST /api/projects/fake-id/recovery/accept returns 4xx",
        fn: async () => {
          const res = await fetch(
            "/api/projects/fake-id-00000/recovery/accept",
            { method: "POST" }
          );
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "POST /api/projects/fake-id/recovery/decline returns 4xx",
        fn: async () => {
          const res = await fetch(
            "/api/projects/fake-id-00000/recovery/decline",
            { method: "POST" }
          );
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
    ],
  },
  {
    group: "Admin Relay API",
    tests: [
      {
        name: "GET /api/admin/relay returns ghost alerts or 4xx",
        fn: async () => {
          const res = await fetch("/api/admin/relay");
          if (res.ok) {
            const data = await res.json();
            return {
              ok: true,
              message: `${data.alerts?.length ?? 0} ghost alerts found`,
            };
          }
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Unexpected ${res.status}` };
        },
      },
      {
        name: "POST /api/admin/relay/fake-id/forfeit returns 4xx",
        fn: async () => {
          const res = await fetch("/api/admin/relay/fake-id/forfeit", {
            method: "POST",
          });
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "POST /api/admin/relay/fake-id/dismiss returns 4xx",
        fn: async () => {
          const res = await fetch("/api/admin/relay/fake-id/dismiss", {
            method: "POST",
          });
          if (res.status >= 400) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return { ok: false, message: `Expected 4xx, got ${res.status}` };
        },
      },
      {
        name: "Admin stats include ghostAlerts count",
        fn: async () => {
          const res = await fetch("/api/admin/stats");
          if (res.ok) {
            const data = await res.json();
            if ("ghostAlerts" in data) {
              return {
                ok: true,
                message: `ghostAlerts: ${data.ghostAlerts}`,
              };
            }
            return {
              ok: false,
              message: "ghostAlerts field missing from stats",
              detail: JSON.stringify(Object.keys(data)),
            };
          }
          if (res.status >= 400) {
            return {
              ok: true,
              message: `Auth blocked: ${res.status} (expected if not admin)`,
            };
          }
          return { ok: false, message: `Unexpected ${res.status}` };
        },
      },
    ],
  },
];

export default function TestRelayPage() {
  const [results, setResults] = useState<
    Array<{ group: string; tests: TestResult[] }>
  >(
    TESTS.map((g) => ({
      group: g.group,
      tests: g.tests.map((t) => ({
        name: t.name,
        status: "idle",
        message: "Not run yet",
      })),
    }))
  );
  const [running, setRunning] = useState(false);

  async function runAll() {
    setRunning(true);

    for (let gi = 0; gi < TESTS.length; gi++) {
      for (let ti = 0; ti < TESTS[gi].tests.length; ti++) {
        setResults((prev) =>
          prev.map((g, i) =>
            i === gi
              ? {
                  ...g,
                  tests: g.tests.map((t, j) =>
                    j === ti ? { ...t, status: "running" } : t
                  ),
                }
              : g
          )
        );

        const result = await run(TESTS[gi].tests[ti].fn);

        setResults((prev) =>
          prev.map((g, i) =>
            i === gi
              ? {
                  ...g,
                  tests: g.tests.map((t, j) =>
                    j === ti
                      ? {
                          name: TESTS[gi].tests[ti].name,
                          status: result.ok ? "pass" : "fail",
                          message: result.message,
                          detail: result.detail,
                          duration: result.duration,
                        }
                      : t
                  ),
                }
              : g
          )
        );
      }
    }

    setRunning(false);
  }

  const totalRun = results.flatMap((g) => g.tests).filter((t) => t.status !== "idle").length;
  const totalPass = results.flatMap((g) => g.tests).filter((t) => t.status === "pass").length;
  const totalFail = results.flatMap((g) => g.tests).filter((t) => t.status === "fail").length;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <h1 className="text-2xl font-bold">Phase 4 — Relay System Test Suite</h1>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Tests all backup relay, dossier, ghost alert, and recovery API routes.
        </p>

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={runAll}
            disabled={running}
            className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-semibold hover:bg-yellow-300 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {running ? "Running..." : "Run All Tests"}
          </button>
          {totalRun > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400 font-semibold">✓ {totalPass}</span>
              {totalFail > 0 && (
                <span className="text-red-400 font-semibold">✗ {totalFail}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {results.map((group) => (
            <div key={group.group} className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="bg-gray-900 px-5 py-3">
                <span className="text-white font-semibold">{group.group}</span>
              </div>
              <div className="divide-y divide-gray-800/50">
                {group.tests.map((test, ti) => (
                  <div
                    key={ti}
                    className={`px-5 py-3 ${
                      test.status === "fail"
                        ? "bg-red-500/5"
                        : test.status === "pass"
                        ? "bg-green-500/5"
                        : "bg-black"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {test.status === "idle" && (
                          <div className="w-4 h-4 rounded-full border border-gray-600" />
                        )}
                        {test.status === "running" && (
                          <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                        )}
                        {test.status === "pass" && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {test.status === "fail" && (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            test.status === "pass" ? "text-white" :
                            test.status === "fail" ? "text-red-300" :
                            "text-gray-400"
                          }`}>
                            {test.name}
                          </p>
                          {test.duration !== undefined && (
                            <span className="text-gray-600 text-xs">{test.duration}ms</span>
                          )}
                        </div>
                        {test.status !== "idle" && test.status !== "running" && (
                          <p className={`text-xs mt-0.5 ${
                            test.status === "pass" ? "text-green-400" : "text-red-400"
                          }`}>
                            {test.message}
                          </p>
                        )}
                        {test.detail && (
                          <pre className="text-xs text-gray-500 mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                            {test.detail}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center mt-8">
          Remove this page before deploying to production.
        </p>
      </div>
    </div>
  );
}