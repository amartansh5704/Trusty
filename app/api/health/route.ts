import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import * as UserService from "@/services/user.service";
import * as ProjectService from "@/services/project.service";
import * as MilestoneService from "@/services/milestone.service";
import * as ApplicationService from "@/services/application.service";
import * as PaymentService from "@/services/payment.service";
import * as CreditService from "@/services/credit.service";
import * as NotificationService from "@/services/notification.service";
import * as MessageService from "@/services/message.service";
import * as DisputeService from "@/services/dispute.service";

type TestResult = {
  service: string;
  function: string;
  status: "PASS" | "FAIL";
  error?: string;
  timeMs: number;
};

async function runTest(
  serviceName: string,
  functionName: string,
  fn: () => Promise<any>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return {
      service: serviceName,
      function: functionName,
      status: "PASS",
      timeMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      service: serviceName,
      function: functionName,
      status: "FAIL",
      error: error?.message || String(error),
      timeMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const results: TestResult[] = [];

  // ─── DATABASE CONNECTION ────────────────────────────────
  results.push(
    await runTest("Database", "prisma.connect", async () => {
      await prisma.$queryRaw`SELECT 1`;
    })
  );

  // ─── USER SERVICE ───────────────────────────────────────
  results.push(
    await runTest("UserService", "getUserByEmail", async () => {
      await UserService.getUserByEmail("nonexistent@test.com");
    })
  );

  results.push(
    await runTest("UserService", "getUserById", async () => {
      await UserService.getUserById("00000000-0000-0000-0000-000000000000");
    })
  );

  results.push(
    await runTest("UserService", "getAllFreelancers", async () => {
      await UserService.getAllFreelancers();
    })
  );

  results.push(
    await runTest("UserService", "getAllFreelancers (with search)", async () => {
      await UserService.getAllFreelancers("test", "React");
    })
  );

  results.push(
    await runTest("UserService", "getPublicFreelancerProfile", async () => {
      await UserService.getPublicFreelancerProfile(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("UserService", "getFreelancerStats", async () => {
      await UserService.getFreelancerStats(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("UserService", "getRecruiterStats", async () => {
      await UserService.getRecruiterStats(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── PROJECT SERVICE ────────────────────────────────────
  results.push(
    await runTest("ProjectService", "getOpenProjects", async () => {
      await ProjectService.getOpenProjects();
    })
  );

  results.push(
    await runTest("ProjectService", "getOpenProjects (with search)", async () => {
      await ProjectService.getOpenProjects("test", "React");
    })
  );

  results.push(
    await runTest("ProjectService", "getProjectById", async () => {
      await ProjectService.getProjectById(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("ProjectService", "getProjectsByRecruiter", async () => {
      await ProjectService.getProjectsByRecruiter(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("ProjectService", "getProjectsByFreelancer", async () => {
      await ProjectService.getProjectsByFreelancer(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("ProjectService", "getProjectForAuth", async () => {
      await ProjectService.getProjectForAuth(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── MILESTONE SERVICE ──────────────────────────────────
  results.push(
    await runTest("MilestoneService", "getMilestoneById", async () => {
      await MilestoneService.getMilestoneById(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("MilestoneService", "getMilestonesByProject", async () => {
      await MilestoneService.getMilestonesByProject(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── APPLICATION SERVICE ────────────────────────────────
  results.push(
    await runTest("ApplicationService", "getApplicationsByProject", async () => {
      await ApplicationService.getApplicationsByProject(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest(
      "ApplicationService",
      "getApplicationByFreelancerAndProject",
      async () => {
        await ApplicationService.getApplicationByFreelancerAndProject(
          "00000000-0000-0000-0000-000000000000",
          "00000000-0000-0000-0000-000000000000"
        );
      }
    )
  );

  // ─── PAYMENT SERVICE ────────────────────────────────────
  results.push(
    await runTest("PaymentService", "getPaymentsByProject", async () => {
      await PaymentService.getPaymentsByProject(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("PaymentService", "getPendingPayments", async () => {
      await PaymentService.getPendingPayments();
    })
  );

  // ─── CREDIT SERVICE ────────────────────────────────────
  results.push(
    await runTest("CreditService", "getCreditHistory", async () => {
      await CreditService.getCreditHistory(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("CreditService", "CREDIT_EVENTS exists", async () => {
      if (!CreditService.CREDIT_EVENTS.PROJECT_COMPLETED) {
        throw new Error("CREDIT_EVENTS not defined");
      }
    })
  );

  // ─── NOTIFICATION SERVICE ──────────────────────────────
  results.push(
    await runTest("NotificationService", "getNotifications", async () => {
      await NotificationService.getNotifications(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  results.push(
    await runTest("NotificationService", "getUnreadCount", async () => {
      await NotificationService.getUnreadCount(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── MESSAGE SERVICE ───────────────────────────────────
  results.push(
    await runTest("MessageService", "getMessages", async () => {
      await MessageService.getMessages(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── DISPUTE SERVICE ───────────────────────────────────
  results.push(
    await runTest("DisputeService", "getAllDisputes", async () => {
      await DisputeService.getAllDisputes();
    })
  );

  results.push(
    await runTest("DisputeService", "getDisputeById", async () => {
      await DisputeService.getDisputeById(
        "00000000-0000-0000-0000-000000000000"
      );
    })
  );

  // ─── SUMMARY ───────────────────────────────────────────
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const totalTime = results.reduce((sum, r) => sum + r.timeMs, 0);

  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed,
      totalTimeMs: totalTime,
      allHealthy: failed === 0,
    },
    results,
  });
}