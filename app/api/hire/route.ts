import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { createPendingHire, executeHire } from "@/services/hire.service";
import { deductWalletForEscrow } from "@/services/wallet.service";
import { createNotification } from "@/services/notification.service";
import { calculateStakeAmount } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "RECRUITER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // rest of the function stays exactly the same
    // just replace `recruiter` variable name with `user`
    const body = await req.json();
    const { applicationId, paymentMethod, utrNumber, screenshotUrl } = body;

    if (!applicationId || !paymentMethod) {
      return NextResponse.json(
        { error: "applicationId and paymentMethod are required" },
        { status: 400 }
      );
    }

    if (!["WALLET", "UPI"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "paymentMethod must be WALLET or UPI" },
        { status: 400 }
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        freelancer: true,
        pendingHire: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.project.recruiterId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.project.status !== "OPEN") {
      return NextResponse.json(
        { error: "Project is no longer open" },
        { status: 400 }
      );
    }

    if (application.pendingHire) {
      return NextResponse.json(
        { error: "A hire is already in progress for this application" },
        { status: 400 }
      );
    }

    const stakeAmount = calculateStakeAmount(
      application.project.totalAmount,
      application.freelancer.creditBalance
    );

    if (application.freelancer.creditBalance < stakeAmount) {
      return NextResponse.json(
        {
          error: `Freelancer does not have enough credits. Required: ${stakeAmount}, Available: ${application.freelancer.creditBalance}`,
        },
        { status: 400 }
      );
    }

    const projectAmount = application.project.totalAmount;

    if (paymentMethod === "WALLET") {
      if (user.walletBalance < projectAmount) {
        return NextResponse.json(
          {
            error: `Insufficient wallet balance. Need ₹${projectAmount}, have ₹${user.walletBalance}. Top up your wallet first.`,
          },
          { status: 400 }
        );
      }

      await deductWalletForEscrow(
        user.id,
        projectAmount,
        application.project.title
      );

      const pendingHire = await createPendingHire({
        projectId: application.projectId,
        applicationId,
        recruiterId: user.id,
        freelancerId: application.freelancerId,
        amount: projectAmount,
        paymentMethod: "WALLET",
      });

      await prisma.pendingHire.update({
        where: { id: pendingHire.id },
        data: { status: "ADMIN_VERIFIED" },
      });

      await executeHire(pendingHire.id);

      return NextResponse.json({
        success: true,
        method: "WALLET",
        message: "Freelancer hired successfully. Escrow is active.",
      });
    }

    if (paymentMethod === "UPI") {
      if (!utrNumber || utrNumber.trim().length < 6) {
        return NextResponse.json(
          { error: "Valid UTR number is required (minimum 6 characters)" },
          { status: 400 }
        );
      }

      const pendingHire = await createPendingHire({
        projectId: application.projectId,
        applicationId,
        recruiterId: user.id,
        freelancerId: application.freelancerId,
        amount: projectAmount,
        paymentMethod: "UPI",
        utrNumber: utrNumber.trim(),
        screenshotUrl: screenshotUrl?.trim(),
      });

      await prisma.application.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      });

      await createNotification({
        userId: application.freelancerId,
        title: "You're Being Hired!",
        body: `${user.name} wants to hire you for "${application.project.title}". Payment is being verified.`,
        link: `/projects/${application.projectId}`,
      });

      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: "New Hire Payment",
          body: `${user.name} wants to hire for "${application.project.title}". UPI payment ₹${projectAmount} needs verification.`,
          link: "/admin/hires",
        });
      }

      return NextResponse.json({
        success: true,
        method: "UPI",
        pendingHireId: pendingHire.id,
        message:
          "Payment submitted. Freelancer will be hired after admin verifies payment.",
      });
    }

    return NextResponse.json({ error: "Invalid flow" }, { status: 400 });
  } catch (error: any) {
    console.error(error);

    if (error.message === "Insufficient wallet balance") {
      return NextResponse.json(
        { error: "Insufficient wallet balance. Please top up first." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process hire" },
      { status: 500 }
    );
  }
}