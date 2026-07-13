"use client";

import { useState } from "react";

type TestResult = {
  name: string;
  route: string;
  method: string;
  status: "IDLE" | "RUNNING" | "PASS" | "FAIL";
  statusCode?: number;
  response?: any;
  error?: string;
  timeMs?: number;
};

const initialTests: TestResult[] = [
  {
    name: "GET Open Projects",
    route: "/api/projects",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Open Projects with Search",
    route: "/api/projects?search=test",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Open Projects with Skill Filter",
    route: "/api/projects?skill=React",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Single Project (non-existent)",
    route: "/api/projects/00000000-0000-0000-0000-000000000000",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Auth Check",
    route: "/api/auth/check",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Session Debug",
    route: "/api/auth/debug",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "GET Health Check",
    route: "/api/health",
    method: "GET",
    status: "IDLE",
  },
  {
    name: "POST Create Project (auth required)",
    route: "/api/projects",
    method: "POST",
    status: "IDLE",
  },
  {
    name: "POST Apply to Project (auth required)",
    route: "/api/applications",
    method: "POST",
    status: "IDLE",
  },
  {
    name: "POST Accept Application (auth required)",
    route: "/api/applications/00000000-0000-0000-0000-000000000000/accept",
    method: "POST",
    status: "IDLE",
  },
  {
    name: "POST Approve Milestone (auth required)",
    route: "/api/milestones/00000000-0000-0000-0000-000000000000/approve",
    method: "POST",
    status: "IDLE",
  },
  {
    name: "POST Reject Milestone (auth required)",
    route: "/api/milestones/00000000-0000-0000-0000-000000000000/reject",
    method: "POST",
    status: "IDLE",
  },
];

const postBodies: Record<string, object> = {
  "/api/projects": {
    title: "Test Project from Route Tester",
    description: "This is a test project created by the route tester.",
    totalAmount: 1000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    requiredSkills: ["React", "Node.js"],
    milestones: [
      {
        title: "Milestone 1",
        description: "First milestone",
        amount: 1000,
        deadline: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    ],
  },
  "/api/applications": {
    projectId: "00000000-0000-0000-0000-000000000000",
    coverLetter:
      "This is a test cover letter with more than fifty characters to pass validation.",
  },
  "/api/applications/00000000-0000-0000-0000-000000000000/accept": {},
  "/api/milestones/00000000-0000-0000-0000-000000000000/approve": {
    freelancerId: "00000000-0000-0000-0000-000000000000",
  },
  "/api/milestones/00000000-0000-0000-0000-000000000000/reject": {},
};

const expectedBehaviors: Record<string, string> = {
  "GET Open Projects": "Should return { projects: [] } or list of projects",
  "GET Open Projects with Search": "Should return filtered projects array",
  "GET Open Projects with Skill Filter": "Should return skill-filtered projects",
  "GET Single Project (non-existent)": "Should return 404 not found",
  "GET Auth Check": "Should return { user: null } or user object",
  "GET Session Debug": "Should return { hasSession: true/false }",
  "GET Health Check": "Should return summary with passed/failed counts",
  "POST Create Project (auth required)":
    "Should return 401 if not logged in as recruiter, or 201 with project",
  "POST Apply to Project (auth required)":
    "Should return 401 if not logged in as freelancer",
  "POST Accept Application (auth required)":
    "Should return 401 if not logged in, or 404 if not found",
  "POST Approve Milestone (auth required)":
    "Should return 401 if not logged in, or 404 if not found",
  "POST Reject Milestone (auth required)":
    "Should return 401 if not logged in, or 404 if not found",
};

const acceptableStatusCodes: Record<string, number[]> = {
  "GET Open Projects": [200],
  "GET Open Projects with Search": [200],
  "GET Open Projects with Skill Filter": [200],
  "GET Single Project (non-existent)": [404],
  "GET Auth Check": [200],
  "GET Session Debug": [200],
  "GET Health Check": [200],
  "POST Create Project (auth required)": [201, 401, 403],
  "POST Apply to Project (auth required)": [201, 400, 401, 403, 404],
  "POST Accept Application (auth required)": [200, 401, 403, 404],
  "POST Approve Milestone (auth required)": [200, 400, 401, 403, 404],
  "POST Reject Milestone (auth required)": [200, 401, 403, 404],
};

export default function TestPhase3Page() {
  const [tests, setTests] = useState<TestResult[]>(initialTests);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function updateTest(index: number, update: Partial<TestResult>) {
    setTests((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...update } : t))
    );
  }

  async function runAllTests() {
    setRunning(true);
    setDone(false);
    setTests(initialTests.map((t) => ({ ...t, status: "IDLE" })));

    for (let i = 0; i < initialTests.length; i++) {
      const test = initialTests[i];
      updateTest(i, { status: "RUNNING" });

      const start = Date.now();

      try {
        const options: RequestInit = {
          method: test.method,
          headers: { "Content-Type": "application/json" },
        };

        if (test.method === "POST") {
          const routeKey = Object.keys(postBodies).find((key) =>
            test.route.startsWith(key)
          );
          options.body = JSON.stringify(
            routeKey ? postBodies[routeKey] : {}
          );
        }

        const res = await fetch(test.route, options);
        const timeMs = Date.now() - start;
        let responseData: any;

        try {
          responseData = await res.json();
        } catch {
          responseData = { raw: await res.text() };
        }

        const acceptable = acceptableStatusCodes[test.name] || [200];
        const passed = acceptable.includes(res.status);

        updateTest(i, {
          status: passed ? "PASS" : "FAIL",
          statusCode: res.status,
          response: responseData,
          timeMs,
        });
      } catch (error: any) {
        updateTest(i, {
          status: "FAIL",
          error: error?.message || "Network error or route does not exist",
          timeMs: Date.now() - start,
        });
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    setRunning(false);
    setDone(true);
  }

  async function runSingleTest(index: number) {
    const test = initialTests[index];
    updateTest(index, { status: "RUNNING" });

    const start = Date.now();

    try {
      const options: RequestInit = {
        method: test.method,
        headers: { "Content-Type": "application/json" },
      };

      if (test.method === "POST") {
        const routeKey = Object.keys(postBodies).find((key) =>
          test.route.startsWith(key)
        );
        options.body = JSON.stringify(routeKey ? postBodies[routeKey] : {});
      }

      const res = await fetch(test.route, options);
      const timeMs = Date.now() - start;
      let responseData: any;

      try {
        responseData = await res.json();
      } catch {
        responseData = { raw: await res.text() };
      }

      const acceptable = acceptableStatusCodes[test.name] || [200];
      const passed = acceptable.includes(res.status);

      updateTest(index, {
        status: passed ? "PASS" : "FAIL",
        statusCode: res.status,
        response: responseData,
        timeMs,
      });
    } catch (error: any) {
      updateTest(index, {
        status: "FAIL",
        error: error?.message || "Network error or route does not exist",
        timeMs: Date.now() - start,
      });
    }
  }

  const passed = tests.filter((t) => t.status === "PASS").length;
  const failed = tests.filter((t) => t.status === "FAIL").length;
  const idle = tests.filter((t) => t.status === "IDLE").length;

  const statusColors = {
    IDLE: "bg-gray-800 border-gray-700",
    RUNNING: "bg-blue-900/20 border-blue-700",
    PASS: "bg-green-900/20 border-green-700",
    FAIL: "bg-red-900/20 border-red-700",
  };

  const statusBadge = {
    IDLE: "bg-gray-700 text-gray-300",
    RUNNING: "bg-blue-600 text-white animate-pulse",
    PASS: "bg-green-600 text-white",
    FAIL: "bg-red-600 text-white",
  };

  const methodColors: Record<string, string> = {
    GET: "text-blue-400",
    POST: "text-yellow-400",
    PUT: "text-purple-400",
    DELETE: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Phase 3 — Route Tester
          </h1>
          <p className="text-gray-400">
            Tests every API route built in Phase 3. Green = working as
            expected. Red = broken or missing.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={runAllTests}
            disabled={running}
            className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Running Tests..." : "Run All Tests"}
          </button>

          {done && (
            <div className="flex items-center gap-4">
              <span className="text-green-400 font-semibold">
                ✓ {passed} passed
              </span>
              {failed > 0 && (
                <span className="text-red-400 font-semibold">
                  ✗ {failed} failed
                </span>
              )}
              {idle > 0 && (
                <span className="text-gray-400">
                  — {idle} not run
                </span>
              )}
            </div>
          )}
        </div>

        {done && failed === 0 && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
            <p className="text-green-400 font-bold text-lg">
              ✓ All routes are working correctly
            </p>
            <p className="text-green-300 text-sm mt-1">
              Phase 3 API layer is healthy. Ready for Phase 4.
            </p>
          </div>
        )}

        {done && failed > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-bold text-lg">
              ✗ {failed} route{failed > 1 ? "s" : ""} failed
            </p>
            <p className="text-red-300 text-sm mt-1">
              Check the failed routes below. Read the error and response
              carefully.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all ${statusColors[test.status]}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${statusBadge[test.status]}`}
                  >
                    {test.status}
                  </span>

                  <span
                    className={`text-xs font-mono font-bold ${methodColors[test.method]}`}
                  >
                    {test.method}
                  </span>

                  <span className="text-white font-medium">{test.name}</span>

                  <span className="text-gray-500 text-xs font-mono hidden md:block">
                    {test.route}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {test.timeMs !== undefined && (
                    <span className="text-gray-500 text-xs">
                      {test.timeMs}ms
                    </span>
                  )}

                  {test.statusCode !== undefined && (
                    <span
                      className={`text-xs font-mono font-bold ${
                        test.status === "PASS"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {test.statusCode}
                    </span>
                  )}

                  <button
                    onClick={() => runSingleTest(index)}
                    disabled={running}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded disabled:opacity-50"
                  >
                    Run
                  </button>
                </div>
              </div>

              <p className="text-gray-500 text-xs mt-2 ml-1">
                Expected: {expectedBehaviors[test.name]}
              </p>

              {test.error && (
                <div className="mt-3 bg-red-900/30 border border-red-800 rounded p-3">
                  <p className="text-red-400 text-xs font-mono">
                    ERROR: {test.error}
                  </p>
                </div>
              )}

              {test.response && (
                <details className="mt-3">
                  <summary className="text-gray-400 text-xs cursor-pointer hover:text-white">
                    View Response
                  </summary>
                  <pre className="mt-2 bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto max-h-48">
                    {JSON.stringify(test.response, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-white font-bold mb-4">
            Manual UI Checklist
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            These cannot be automated. Check each one manually.
          </p>
          <div className="space-y-2 text-sm">
            {[
              {
                url: "/projects/new",
                label: "Create Project page loads for recruiter",
              },
              {
                url: "/projects/new",
                label: "Milestone builder — Add and remove milestones works",
              },
              {
                url: "/projects/new",
                label: "Amount balance checker shows green when totals match",
              },
              {
                url: "/projects/new",
                label: "Submit form creates project and redirects to project page",
              },
              {
                url: "/projects/browse",
                label: "Browse page loads for freelancer",
              },
              {
                url: "/projects/browse",
                label: "Search box filters projects",
              },
              {
                url: "/projects/browse",
                label: "Skill filter works",
              },
              {
                url: "/projects/[id]",
                label: "Project detail shows milestones",
              },
              {
                url: "/projects/[id]",
                label: "Apply Now button visible to eligible freelancers",
              },
              {
                url: "/projects/[id]",
                label: "Applications visible to recruiter",
              },
              {
                url: "/projects/[id]/apply",
                label: "Apply page shows stake info",
              },
              {
                url: "/projects/[id]/apply",
                label: "Cover letter submission works",
              },
              {
                url: "/dashboard/recruiter",
                label: "Recruiter dashboard shows posted projects",
              },
              {
                url: "/dashboard/freelancer",
                label: "Freelancer dashboard shows credits and tier",
              },
            ].map(({ url, label }, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`check-${i}`}
                  className="accent-yellow-400"
                />
                <label
                  htmlFor={`check-${i}`}
                  className="text-gray-300 cursor-pointer"
                >
                  <span className="text-yellow-400 font-mono text-xs mr-2">
                    {url}
                  </span>
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-white font-bold mb-4">
            Quick Navigation Links
          </h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/", label: "Landing" },
              { href: "/login", label: "Login" },
              { href: "/register", label: "Register" },
              { href: "/onboarding", label: "Onboarding" },
              { href: "/dashboard/recruiter", label: "Recruiter Dashboard" },
              { href: "/dashboard/freelancer", label: "Freelancer Dashboard" },
              { href: "/projects/new", label: "New Project" },
              { href: "/projects/browse", label: "Browse Projects" },
              { href: "/api/health", label: "API Health" },
              { href: "/api/auth/check", label: "Auth Check" },
              { href: "/api/auth/debug", label: "Session Debug" },
              { href: "/api/projects", label: "Projects API" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}