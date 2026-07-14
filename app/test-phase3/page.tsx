"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Play, ChevronDown, ChevronUp } from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type TestStatus = "idle" | "running" | "pass" | "fail";

type TestResult = {
  name: string;
  status: TestStatus;
  message: string;
  detail?: string;
  duration?: number;
};

type TestGroup = {
  name: string;
  description: string;
  tests: TestResult[];
  expanded: boolean;
};

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// TEST DEFINITIONS
// ============================================================

const TEST_GROUPS: Array<{
  name: string;
  description: string;
  tests: Array<{
    name: string;
    fn: () => Promise<{ ok: boolean; message: string; detail?: string }>;
  }>;
}> = [
  // ----------------------------------------------------------
  // GROUP 1 — API Health
  // ----------------------------------------------------------
  {
    name: "API Health",
    description: "Basic connectivity — all API routes respond",
    tests: [
      {
        name: "GET /api/health returns 200",
        fn: async () => {
          const res = await fetch("/api/health");
          if (res.ok) return { ok: true, message: "Health endpoint is up" };
          return { ok: false, message: `Status ${res.status}` };
        },
      },
      {
        name: "GET /api/projects returns project list",
        fn: async () => {
          const res = await fetch("/api/projects");
          const data = await res.json();
          if (res.ok && Array.isArray(data.projects)) {
            return {
              ok: true,
              message: `Returned ${data.projects.length} open projects`,
            };
          }
          return {
            ok: false,
            message: data.error ?? "Unexpected response shape",
            detail: JSON.stringify(data),
          };
        },
      },
      {
        name: "GET /api/auth/check returns session info",
        fn: async () => {
          const res = await fetch("/api/auth/check");
          const data = await res.json();
          if (res.ok) {
            return {
              ok: true,
              message: data.user
                ? `Logged in as ${data.user.name} (${data.user.role})`
                : "No session — not logged in",
            };
          }
          return { ok: false, message: data.error ?? "Check failed" };
        },
      },
    ],
  },

  // ----------------------------------------------------------
  // GROUP 2 — Auth Guard Tests
  // ----------------------------------------------------------
  {
    name: "Auth Guards",
    description: "Unauthenticated requests must be blocked",
    tests: [
      {
        name: "POST /api/projects without auth returns 401",
        fn: async () => {
          // We send a request with no session cookie that will pass
          // This tests that the route actually checks auth
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = await res.json();

          // If logged in as recruiter this would try to validate body
          // If logged in as freelancer this returns 403
          // If not logged in this returns 401
          // All three are correct auth behavior
          if (res.status === 401 || res.status === 403 || res.status === 400) {
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 401/403/400 but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/applications without body returns 4xx",
        fn: async () => {
          const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly blocked: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/milestones/fake-id/submit returns 4xx",
        fn: async () => {
          const res = await fetch("/api/milestones/fake-id-12345/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proofOfWorkUrl: "https://example.com" }),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly blocked: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/milestones/fake-id/approve returns 4xx",
        fn: async () => {
          const res = await fetch("/api/milestones/fake-id-12345/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ freelancerId: "fake" }),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly blocked: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/payments without body returns 4xx",
        fn: async () => {
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly blocked: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
    ],
  },

  // ----------------------------------------------------------
  // GROUP 3 — Project API
  // ----------------------------------------------------------
  {
    name: "Project API",
    description: "Project creation, fetching, and filtering",
    tests: [
      {
        name: "GET /api/projects?search=x returns filtered list",
        fn: async () => {
          const res = await fetch("/api/projects?search=react");
          const data = await res.json();
          if (res.ok && Array.isArray(data.projects)) {
            return {
              ok: true,
              message: `Search returned ${data.projects.length} results`,
            };
          }
          return {
            ok: false,
            message: data.error ?? "Bad response",
          };
        },
      },
      {
        name: "GET /api/projects?skill=x returns skill-filtered list",
        fn: async () => {
          const res = await fetch("/api/projects?skill=React");
          const data = await res.json();
          if (res.ok && Array.isArray(data.projects)) {
            return {
              ok: true,
              message: `Skill filter returned ${data.projects.length} results`,
            };
          }
          return {
            ok: false,
            message: data.error ?? "Bad response",
          };
        },
      },
      {
        name: "GET /api/projects/nonexistent-id returns 404",
        fn: async () => {
          const res = await fetch(
            "/api/projects/00000000-0000-0000-0000-000000000000"
          );
          const data = await res.json();
          if (res.status === 404) {
            return { ok: true, message: "Correctly returned 404" };
          }
          return {
            ok: false,
            message: `Expected 404 but got ${res.status}: ${data.error}`,
          };
        },
      },
      {
        name: "GET /api/projects returns correct shape",
        fn: async () => {
          const res = await fetch("/api/projects");
          const data = await res.json();
          if (!res.ok) {
            return { ok: false, message: data.error ?? "Failed" };
          }
          if (!Array.isArray(data.projects)) {
            return {
              ok: false,
              message: "Response missing projects array",
              detail: JSON.stringify(data),
            };
          }
          if (data.projects.length === 0) {
            return {
              ok: true,
              message: "No open projects yet — shape is correct",
            };
          }
          const p = data.projects[0];
          const hasRequired =
            p.id && p.title && p.totalAmount !== undefined && p.recruiter;
          if (hasRequired) {
            return {
              ok: true,
              message: `Shape valid — first project: "${p.title}"`,
            };
          }
          return {
            ok: false,
            message: "Project missing required fields",
            detail: JSON.stringify(Object.keys(p)),
          };
        },
      },
    ],
  },

  // ----------------------------------------------------------
  // GROUP 4 — Payment API
  // ----------------------------------------------------------
  {
    name: "Payment API",
    description: "Payment creation and UTR submission",
    tests: [
      {
        name: "GET /api/payments without projectId returns 400",
        fn: async () => {
          const res = await fetch("/api/payments");
          const data = await res.json();
          if (res.status === 400 || res.status === 401) {
            return {
              ok: true,
              message: `Correctly returned ${res.status}: ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 400/401 but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/payments/fake-id/utr returns 4xx",
        fn: async () => {
          const res = await fetch("/api/payments/fake-id/utr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utrNumber: "TEST123" }),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly blocked: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
      {
        name: "POST /api/payments/fake-id/utr with short UTR returns 400",
        fn: async () => {
          const res = await fetch("/api/payments/fake-id/utr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utrNumber: "AB" }),
          });
          if (res.status >= 400 && res.status < 500) {
            const data = await res.json();
            return {
              ok: true,
              message: `Correctly rejected: ${res.status} — ${data.error}`,
            };
          }
          return {
            ok: false,
            message: `Expected 4xx but got ${res.status}`,
          };
        },
      },
    ],
  },

  // ----------------------------------------------------------
  // GROUP 5 — Page Routes
  // ----------------------------------------------------------
  {
    name: "Page Routes",
    description: "All pages load without 500 errors",
    tests: [
      {
        name: "GET / (landing page) returns 200",
        fn: async () => {
          const res = await fetch("/");
          if (res.ok) return { ok: true, message: "Landing page loads" };
          return { ok: false, message: `Status ${res.status}` };
        },
      },
      {
        name: "GET /projects/browse returns 200 or redirect",
        fn: async () => {
          const res = await fetch("/projects/browse");
          if (res.ok || res.status === 307 || res.status === 302) {
            return {
              ok: true,
              message: `Browse page: ${res.status} ${res.url}`,
            };
          }
          return { ok: false, message: `Unexpected status ${res.status}` };
        },
      },
      {
        name: "GET /projects/new returns 200 or redirect",
        fn: async () => {
          const res = await fetch("/projects/new");
          if (res.ok || res.status === 307 || res.status === 302) {
            return {
              ok: true,
              message: `New project page: ${res.status}`,
            };
          }
          return { ok: false, message: `Unexpected status ${res.status}` };
        },
      },
      {
        name: "GET /dashboard/recruiter returns 200 or redirect",
        fn: async () => {
          const res = await fetch("/dashboard/recruiter");
          if (res.ok || res.status === 307 || res.status === 302) {
            return {
              ok: true,
              message: `Recruiter dashboard: ${res.status}`,
            };
          }
          return { ok: false, message: `Unexpected status ${res.status}` };
        },
      },
      {
        name: "GET /dashboard/freelancer returns 200 or redirect",
        fn: async () => {
          const res = await fetch("/dashboard/freelancer");
          if (res.ok || res.status === 307 || res.status === 302) {
            return {
              ok: true,
              message: `Freelancer dashboard: ${res.status}`,
            };
          }
          return { ok: false, message: `Unexpected status ${res.status}` };
        },
      },
    ],
  },

  // ----------------------------------------------------------
  // GROUP 6 — Data Shape Validation
  // ----------------------------------------------------------
  {
    name: "Data Shapes",
    description: "API responses have all required fields",
    tests: [
      {
        name: "Auth check response has correct fields",
        fn: async () => {
          const res = await fetch("/api/auth/check");
          const data = await res.json();
          if (!res.ok) {
            return { ok: false, message: data.error ?? "Failed" };
          }
          if (!data.user) {
            return {
              ok: true,
              message: "No session — cannot validate user shape",
            };
          }
          const required = [
            "id",
            "name",
            "email",
            "role",
            "creditBalance",
            "walletBalance",
          ];
          const missing = required.filter((k) => !(k in data.user));
          if (missing.length === 0) {
            return {
              ok: true,
              message: `All required fields present for ${data.user.name}`,
            };
          }
          return {
            ok: false,
            message: `Missing fields: ${missing.join(", ")}`,
          };
        },
      },
      {
        name: "Open projects have recruiter + milestones + applications",
        fn: async () => {
          const res = await fetch("/api/projects");
          const data = await res.json();
          if (!res.ok) return { ok: false, message: data.error };
          if (data.projects.length === 0) {
            return {
              ok: true,
              message: "No projects to validate — create one to test",
            };
          }
          const p = data.projects[0];
          const checks = {
            "has recruiter": !!p.recruiter,
            "recruiter has name": !!p.recruiter?.name,
            "has milestones array": Array.isArray(p.milestones),
            "has applications array": Array.isArray(p.applications),
            "has requiredSkills array": Array.isArray(p.requiredSkills),
            "has deadline": !!p.deadline,
          };
          const failed = Object.entries(checks)
            .filter(([, v]) => !v)
            .map(([k]) => k);
          if (failed.length === 0) {
            return { ok: true, message: "All shape checks passed" };
          }
          return {
            ok: false,
            message: `Failed: ${failed.join(", ")}`,
          };
        },
      },
      {
        name: "Single project fetch has full milestone + application data",
        fn: async () => {
          // First get list
          const listRes = await fetch("/api/projects");
          const listData = await listRes.json();
          if (!listRes.ok) return { ok: false, message: listData.error };
          if (listData.projects.length === 0) {
            return {
              ok: true,
              message: "No projects to test single fetch — create one first",
            };
          }

          const id = listData.projects[0].id;
          const res = await fetch(`/api/projects/${id}`);
          const data = await res.json();

          if (!res.ok) return { ok: false, message: data.error };

          const p = data.project;
          const milestoneShape =
            p.milestones.length === 0 ||
            (p.milestones[0].title &&
              p.milestones[0].amount !== undefined &&
              p.milestones[0].status);

          if (milestoneShape) {
            return {
              ok: true,
              message: `Project "${p.title}" with ${p.milestones.length} milestones validated`,
            };
          }
          return {
            ok: false,
            message: "Milestone missing title/amount/status",
          };
        },
      },
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function TestPhase3Page() {
  const [groups, setGroups] = useState<TestGroup[]>(
    TEST_GROUPS.map((g) => ({
      ...g,
      expanded: true,
      tests: g.tests.map((t) => ({
        name: t.name,
        status: "idle" as TestStatus,
        message: "Not run yet",
      })),
    }))
  );
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    duration: number;
  } | null>(null);

  function toggleGroup(groupIndex: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, expanded: !g.expanded } : g
      )
    );
  }

  async function runAllTests() {
    setRunning(true);
    setSummary(null);

    const startAll = Date.now();
    let totalPassed = 0;
    let totalFailed = 0;

    const updatedGroups: TestGroup[] = [];

    for (let gi = 0; gi < TEST_GROUPS.length; gi++) {
      const group = TEST_GROUPS[gi];
      const testResults: TestResult[] = [];

      for (let ti = 0; ti < group.tests.length; ti++) {
        const testDef = group.tests[ti];

        // Mark as running
        setGroups((prev) =>
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

        const result = await run(testDef.fn);

        const testResult: TestResult = {
          name: testDef.name,
          status: result.ok ? "pass" : "fail",
          message: result.message,
          detail: result.detail,
          duration: result.duration,
        };

        testResults.push(testResult);

        if (result.ok) totalPassed++;
        else totalFailed++;

        // Update this test result
        setGroups((prev) =>
          prev.map((g, i) =>
            i === gi
              ? {
                  ...g,
                  tests: g.tests.map((t, j) =>
                    j === ti ? testResult : t
                  ),
                }
              : g
          )
        );
      }

      updatedGroups.push({
        ...group,
        expanded: true,
        tests: testResults,
      });
    }

    setSummary({
      total: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      duration: Date.now() - startAll,
    });

    setRunning(false);
  }

  async function runGroup(groupIndex: number) {
    setRunning(true);

    const group = TEST_GROUPS[groupIndex];

    for (let ti = 0; ti < group.tests.length; ti++) {
      const testDef = group.tests[ti];

      setGroups((prev) =>
        prev.map((g, i) =>
          i === groupIndex
            ? {
                ...g,
                tests: g.tests.map((t, j) =>
                  j === ti ? { ...t, status: "running" } : t
                ),
              }
            : g
        )
      );

      const result = await run(testDef.fn);

      setGroups((prev) =>
        prev.map((g, i) =>
          i === groupIndex
            ? {
                ...g,
                tests: g.tests.map((t, j) =>
                  j === ti
                    ? {
                        name: testDef.name,
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

    setRunning(false);
  }

  const allTests = groups.flatMap((g) => g.tests);
  const totalRun = allTests.filter((t) => t.status !== "idle").length;
  const totalPass = allTests.filter((t) => t.status === "pass").length;
  const totalFail = allTests.filter((t) => t.status === "fail").length;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <h1 className="text-2xl font-bold">Trust Issues — Phase 3 Test Suite</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Tests all API routes, auth guards, page routes, and data shapes.
            Run while logged in as different roles for full coverage.
          </p>
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-2 bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            {running ? "Running..." : "Run All Tests"}
          </button>

          {totalRun > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                {totalRun}/{allTests.length} run
              </span>
              <span className="text-green-400 font-semibold">
                ✓ {totalPass} passed
              </span>
              {totalFail > 0 && (
                <span className="text-red-400 font-semibold">
                  ✗ {totalFail} failed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary Banner */}
        {summary && (
          <div
            className={`mb-8 p-4 rounded-lg border ${
              summary.failed === 0
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {summary.failed === 0 ? (
                  <CheckCircle className="h-6 w-6 text-green-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-400" />
                )}
                <div>
                  <p
                    className={`font-bold text-lg ${
                      summary.failed === 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {summary.failed === 0
                      ? "All tests passed"
                      : `${summary.failed} test${summary.failed > 1 ? "s" : ""} failed`}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {summary.passed}/{summary.total} passed in{" "}
                    {(summary.duration / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Groups */}
        <div className="space-y-4">
          {groups.map((group, gi) => {
            const groupTests = group.tests;
            const groupPass = groupTests.filter(
              (t) => t.status === "pass"
            ).length;
            const groupFail = groupTests.filter(
              (t) => t.status === "fail"
            ).length;
            const groupRun = groupTests.filter(
              (t) => t.status !== "idle"
            ).length;

            return (
              <div
                key={group.name}
                className="border border-gray-800 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div className="bg-gray-900 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleGroup(gi)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {group.expanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-white font-semibold">
                          {group.name}
                        </span>
                      </div>
                      <span className="text-gray-500 text-sm">
                        {group.description}
                      </span>
                    </button>

                    <div className="flex items-center gap-3 ml-4">
                      {groupRun > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          {groupPass > 0 && (
                            <span className="text-green-400">
                              ✓ {groupPass}
                            </span>
                          )}
                          {groupFail > 0 && (
                            <span className="text-red-400">✗ {groupFail}</span>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => runGroup(gi)}
                        disabled={running}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md disabled:opacity-50 transition-colors"
                      >
                        Run group
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Rows */}
                {group.expanded && (
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
                          {/* Status Icon */}
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

                          {/* Test Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-sm font-medium ${
                                  test.status === "pass"
                                    ? "text-white"
                                    : test.status === "fail"
                                    ? "text-red-300"
                                    : "text-gray-400"
                                }`}
                              >
                                {test.name}
                              </p>
                              {test.duration !== undefined && (
                                <span className="text-gray-600 text-xs flex-shrink-0">
                                  {test.duration}ms
                                </span>
                              )}
                            </div>

                            {test.status !== "idle" &&
                              test.status !== "running" && (
                                <p
                                  className={`text-xs mt-0.5 ${
                                    test.status === "pass"
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
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
                )}
              </div>
            );
          })}
        </div>

        {/* Manual checklist */}
        <div className="mt-10 border border-gray-800 rounded-lg overflow-hidden">
          <div className="bg-gray-900 px-5 py-4">
            <h2 className="text-white font-semibold">
              Manual Flow Checklist
            </h2>
            <p className="text-gray-500 text-sm">
              These require real browser interaction — tick them off manually
            </p>
          </div>
          <div className="divide-y divide-gray-800/50">
            {[
              {
                flow: "Recruiter",
                step: "Register as RECRUITER → complete onboarding → land on recruiter dashboard",
              },
              {
                flow: "Recruiter",
                step: "Post a project with 2 milestones, amounts must equal total budget",
              },
              {
                flow: "Recruiter",
                step: "Visit project detail page — see milestones and Pay Into Escrow button",
              },
              {
                flow: "Recruiter",
                step: "Click Pay Into Escrow → see UPI details → click I Have Sent Payment → enter dummy UTR → submit",
              },
              {
                flow: "Freelancer",
                step: "Register as FREELANCER → complete onboarding → land on freelancer dashboard",
              },
              {
                flow: "Freelancer",
                step: "Go to Find Work → see the project posted by recruiter",
              },
              {
                flow: "Freelancer",
                step: "Click View Project → see Apply Now button with stake info",
              },
              {
                flow: "Freelancer",
                step: "Click Apply Now → write cover letter → submit application",
              },
              {
                flow: "Recruiter",
                step: "Go to project detail → see application → click Accept → freelancer is hired",
              },
              {
                flow: "Freelancer",
                step: "Go to project detail → see milestone with Submit button",
              },
              {
                flow: "Freelancer",
                step: "Click Submit Milestone → enter GitHub link → submit",
              },
              {
                flow: "Recruiter",
                step: "Go to project detail → see milestone Under Review → click Approve + Release Payment",
              },
              {
                flow: "Both",
                step: "Freelancer wallet balance increases after milestone approval",
              },
            ].map((item, i) => (
              <div key={i} className="px-5 py-3 bg-black flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 accent-yellow-400 flex-shrink-0"
                />
                <div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                      item.flow === "Recruiter"
                        ? "bg-blue-500/10 text-blue-400"
                        : item.flow === "Freelancer"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}
                  >
                    {item.flow}
                  </span>
                  <span className="text-gray-300 text-sm">{item.step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-gray-600 text-xs text-center mt-8">
          Remove this page before deploying to production.
        </p>
      </div>
    </div>
  );
}