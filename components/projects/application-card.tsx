"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Coins,
  CheckCircle,
  Wallet,
  IndianRupee,
  Copy,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { showSuccess, showError, showInfo } from "@/lib/toast";
import { getCreditTier, formatCurrency } from "@/lib/utils";
import Link from "next/link";

type Application = {
  id: string;
  coverLetter: string;
  proposedAmount: number | null;
  status: string;
  freelancer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creditBalance: number;
    skills: string[];
    totalProjectsCompleted: number;
  };
};

interface ApplicationCardProps {
  application: Application;
  projectStatus: string;
  projectAmount: number;
  recruiterWalletBalance: number;
}

const UPI_ID = "trustissues@upi";
const UPI_NAME = "Trust Issues Platform";

export default function ApplicationCard({
  application,
  projectStatus,
  projectAmount,
  recruiterWalletBalance,
}: ApplicationCardProps) {
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "WALLET" | "UPI" | null
  >(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [hired, setHired] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Determine initial state from application status
  useEffect(() => {
    if (application.status === "ACCEPTED") {
      // Could be fully hired (IN_PROGRESS) or pending payment
      if (projectStatus === "IN_PROGRESS") {
        setHired(true);
      } else {
        setPendingPayment(true);
      }
    }
  }, [application.status, projectStatus]);

  const tier = getCreditTier(application.freelancer.creditBalance);
  const canAffordWallet = recruiterWalletBalance >= projectAmount;

  const tierColors: Record<string, string> = {
    Starter: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    Reliable: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Trusted: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Elite: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  };

  function copyUPI() {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    showInfo("Copied", "UPI ID copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  function closeDialog() {
    setHireDialogOpen(false);
    setPaymentMethod(null);
    setUtrNumber("");
    setScreenshotUrl("");
  }

  async function handleWalletHire() {
    setLoading(true);

    const res = await fetch("/api/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        paymentMethod: "WALLET",
      }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess(
        "Hired!",
        `${application.freelancer.name} has been hired. Escrow is active.`
      );
      setHired(true);
      closeDialog();
      window.location.reload();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }

    setLoading(false);
  }

  async function handleUPIHire(e: React.FormEvent) {
    e.preventDefault();

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      showError("Invalid UTR", "Please enter a valid UTR number.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: application.id,
        paymentMethod: "UPI",
        utrNumber: utrNumber.trim(),
        screenshotUrl: screenshotUrl.trim() || undefined,
      }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess(
        "Payment submitted",
        "Freelancer will be hired after admin verifies your payment."
      );
      setPendingPayment(true);
      closeDialog();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }

    setLoading(false);
  }

  const showHireButton =
    projectStatus === "OPEN" && !hired && !pendingPayment;

  return (
    <>
      <Card
        className={`bg-gray-900 border-gray-800 ${
          hired
            ? "border-green-800"
            : pendingPayment
            ? "border-yellow-800"
            : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-400 font-bold text-sm">
                  {application.freelancer.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Link href={`/freelancer/${application.freelancer.id}`}>
                    <span className="text-white font-semibold hover:text-yellow-400">
                      {application.freelancer.name}
                    </span>
                  </Link>
                  <Badge
                    variant="outline"
                    className={tierColors[tier.tier]}
                  >
                    {tier.tier}
                  </Badge>
                  {hired && (
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-400 border-green-500/30"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Hired
                    </Badge>
                  )}
                  {pendingPayment && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    >
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Hiring — Payment Pending
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-yellow-400" />
                    {application.freelancer.creditBalance} credits
                  </span>
                  <span>
                    {application.freelancer.totalProjectsCompleted} projects
                    completed
                  </span>
                </div>

                {application.freelancer.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {application.freelancer.skills
                      .slice(0, 5)
                      .map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="border-gray-700 text-gray-400 text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                  </div>
                )}

                <p className="text-gray-300 text-sm">
                  {application.coverLetter}
                </p>

                {pendingPayment && (
                  <div className="mt-3 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-300 text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Waiting for admin to verify your payment. The freelancer
                      will be notified once confirmed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {showHireButton && (
              <Button
                onClick={() => setHireDialogOpen(true)}
                className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold flex-shrink-0"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Hire & Pay
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hire & Pay Dialog */}
      <Dialog open={hireDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {!paymentMethod && "Choose Payment Method"}
              {paymentMethod === "WALLET" && "Pay from Wallet"}
              {paymentMethod === "UPI" && "Pay via UPI"}
            </DialogTitle>
          </DialogHeader>

          {/* Hire summary */}
          <div className="bg-gray-800 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Hiring</span>
              <span className="text-white font-semibold">
                {application.freelancer.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Escrow Amount</span>
              <span className="text-yellow-400 font-bold text-lg">
                {formatCurrency(projectAmount)}
              </span>
            </div>
          </div>

          {/* Step 1 — Choose method */}
          {!paymentMethod && (
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => {
                  if (canAffordWallet) {
                    setPaymentMethod("WALLET");
                  } else {
                    showError(
                      "Insufficient balance",
                      `You need ${formatCurrency(projectAmount)} but have ${formatCurrency(recruiterWalletBalance)}. Top up first.`
                    );
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-6 justify-start px-4"
              >
                <div className="flex items-center gap-3 w-full">
                  <Wallet className="h-5 w-5 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">Pay from Wallet</p>
                    <p className="text-green-200 text-xs font-normal">
                      Balance: {formatCurrency(recruiterWalletBalance)}
                      {!canAffordWallet && " (insufficient)"}
                    </p>
                  </div>
                  {canAffordWallet && (
                    <span className="text-xs bg-green-500/20 px-2 py-1 rounded-full">
                      Instant
                    </span>
                  )}
                </div>
              </Button>

              <Button
                onClick={() => setPaymentMethod("UPI")}
                variant="outline"
                className="w-full border-gray-700 text-white hover:bg-gray-800 py-6 justify-start px-4"
              >
                <div className="flex items-center gap-3 w-full">
                  <IndianRupee className="h-5 w-5 flex-shrink-0 text-yellow-400" />
                  <div className="text-left flex-1">
                    <p className="font-semibold">Pay via UPI</p>
                    <p className="text-gray-400 text-xs font-normal">
                      Pay and submit UTR. Admin verifies.
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                    2-4 hrs
                  </span>
                </div>
              </Button>
            </div>
          )}

          {/* Step 2a — Wallet confirmation */}
          {paymentMethod === "WALLET" && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  {formatCurrency(projectAmount)} will be deducted from your
                  wallet and placed in escrow.{" "}
                  {application.freelancer.name} will be hired immediately.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">
                    Current Balance
                  </p>
                  <p className="text-white font-bold">
                    {formatCurrency(recruiterWalletBalance)}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">After Payment</p>
                  <p className="text-white font-bold">
                    {formatCurrency(
                      recruiterWalletBalance - projectAmount
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPaymentMethod(null)}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Back
                </Button>
                <Button
                  onClick={handleWalletHire}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold"
                >
                  {loading
                    ? "Processing..."
                    : `Pay ${formatCurrency(projectAmount)} & Hire`}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2b — UPI payment */}
          {paymentMethod === "UPI" && (
            <div className="space-y-4 pt-2">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Send exactly</p>
                <p className="text-3xl font-bold text-yellow-400 mb-3">
                  {formatCurrency(projectAmount)}
                </p>
                <p className="text-gray-400 text-sm mb-1">to UPI ID</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-white font-mono font-semibold text-lg">
                    {UPI_ID}
                  </p>
                  <button
                    type="button"
                    onClick={copyUPI}
                    className="text-gray-400 hover:text-white"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">{UPI_NAME}</p>
              </div>

              <form onSubmit={handleUPIHire} className="space-y-3">
                <div>
                  <Label className="text-gray-300">
                    UTR / Reference Number{" "}
                    <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={utrNumber}
                    onChange={(e) =>
                      setUtrNumber(e.target.value.toUpperCase())
                    }
                    placeholder="UPI123456789012"
                    required
                    minLength={6}
                    className="bg-gray-800 border-gray-700 text-white font-mono mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">
                    Screenshot URL{" "}
                    <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-300 text-xs">
                    After admin verifies your payment, the freelancer will be
                    auto-hired and escrow activated. Usually 2-4 hours.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentMethod(null)}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
                  >
                    {loading ? "Submitting..." : "Submit & Hire"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}