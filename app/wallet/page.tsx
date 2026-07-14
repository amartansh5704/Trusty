"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { showSuccess, showError, showInfo } from "@/lib/toast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

type TopUp = {
  id: string;
  amount: number;
  status: string;
  utrNumber: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

const UPI_ID = "trustissues@upi";
const UPI_NAME = "Trust Issues Platform";

export default function WalletPage() {
  const { user, loading } = useUser();

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [fetching, setFetching] = useState(true);

  // Top-up form state
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpStep, setTopUpStep] = useState<"amount" | "utr" | "done">(
    "amount"
  );
  const [topUpAmount, setTopUpAmount] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    try {
      const [walletRes, topUpRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/wallet/topups"),  // fixed: plural
      ]);

      const walletData = await walletRes.json();
      const topUpData = await topUpRes.json();

      if (walletRes.ok) {
        setWalletBalance(walletData.walletBalance);
        setTransactions(walletData.transactions);
      }

      if (topUpRes.ok) {
        setTopUps(topUpData.topUps);
      }
    } catch {
      showError("Error", "Failed to load wallet data.");
    } finally {
      setFetching(false);
    }
  }

  function copyUPI() {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    showInfo("Copied", "UPI ID copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  function resetTopUpForm() {
    setTopUpStep("amount");
    setTopUpAmount("");
    setUtrNumber("");
    setScreenshotUrl("");
    setSubmitting(false);
  }

  function handleOpenChange(open: boolean) {
    setTopUpOpen(open);
    if (!open) resetTopUpForm();
  }

  function handleProceedToPayment() {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 100) {
      showError("Invalid amount", "Minimum top-up is ₹100.");
      return;
    }
    if (amount > 100000) {
      showError("Invalid amount", "Maximum top-up is ₹1,00,000.");
      return;
    }
    setTopUpStep("utr");
  }

  async function handleSubmitTopUp(e: React.FormEvent) {
    e.preventDefault();

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      showError("Invalid UTR", "Please enter a valid UTR number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/wallet/topups", {  // fixed: plural
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(topUpAmount),
          utrNumber: utrNumber.trim(),
          screenshotUrl: screenshotUrl.trim() || undefined,
        }),
      });

      // Safe JSON parse — 405 and some errors return no body
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // body was empty
      }

      if (!res.ok) {
        showError("Failed", data.error ?? `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }

      setTopUpStep("done");
      loadWallet();
    } catch {
      showError("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const topUpStatusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    PENDING: {
      label: "Pending",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    SUBMITTED: {
      label: "Under Review",
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    VERIFIED: {
      label: "Verified",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    REFUNDED: {
      label: "Rejected",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  if (loading || fetching) return null;
  if (!user) return null;

  const isRecruiter = user.role === "RECRUITER";

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Wallet</h1>
            <p className="text-gray-400 mt-1">
              {isRecruiter
                ? "Top up your wallet to hire freelancers. Escrow is deducted automatically."
                : "Your earnings from completed milestones appear here."}
            </p>
          </div>

          {/* Fixed: no asChild, no button-in-button */}
          {isRecruiter && (
            <Button
              onClick={() => setTopUpOpen(true)}
              className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Top Up Wallet
            </Button>
          )}
        </div>

        {/* Balance Card */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Available Balance</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Top-up History (Recruiter only) */}
          {isRecruiter && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">
                Top-Up History
              </h2>
              {topUps.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <IndianRupee className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No top-ups yet.</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Top up your wallet to start hiring.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {topUps.map((topUp) => {
                    const config =
                      topUpStatusConfig[topUp.status] ??
                      topUpStatusConfig.PENDING;
                    return (
                      <Card
                        key={topUp.id}
                        className="bg-gray-900 border-gray-800"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-white font-semibold">
                                  {formatCurrency(topUp.amount)}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={config.color}
                                >
                                  <span className="flex items-center gap-1">
                                    {config.icon}
                                    {config.label}
                                  </span>
                                </Badge>
                              </div>
                              {topUp.utrNumber && (
                                <p className="text-gray-500 text-xs font-mono">
                                  UTR: {topUp.utrNumber}
                                </p>
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">
                              {formatDate(topUp.createdAt)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transaction History */}
          <div className={isRecruiter ? "" : "md:col-span-2"}>
            <h2 className="text-lg font-bold text-white mb-4">
              Transaction History
            </h2>
            {transactions.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-8 text-center">
                  <Wallet className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No transactions yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <Card
                      key={tx.id}
                      className="bg-gray-900 border-gray-800"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isPositive
                                  ? "bg-green-500/10"
                                  : "bg-red-500/10"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">
                                {tx.description}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatDateTime(tx.createdAt)}
                              </p>
                            </div>
                          </div>
                          <p
                            className={`font-semibold ${
                              isPositive ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {formatCurrency(Math.abs(tx.amount))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top-up Modal — rendered outside the header div, no button nesting */}
      <Dialog open={topUpOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {topUpStep === "amount" && "Top Up Wallet"}
              {topUpStep === "utr" && "Submit Payment Proof"}
              {topUpStep === "done" && "Top-Up Submitted"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1 — Enter amount */}
          {topUpStep === "amount" && (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-gray-300">Amount to add (₹)</Label>
                <Input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="5000"
                  min={100}
                  max={100000}
                  className="bg-gray-800 border-gray-700 text-white mt-1 text-lg"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Min ₹100 · Max ₹1,00,000
                </p>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[1000, 5000, 10000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(String(amt))}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                      topUpAmount === String(amt)
                        ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    ₹{amt.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleProceedToPayment}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                Proceed to Payment
              </Button>
            </div>
          )}

          {/* Step 2 — Pay and enter UTR */}
          {topUpStep === "utr" && (
            <div className="space-y-4 pt-2">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Send exactly</p>
                <p className="text-3xl font-bold text-yellow-400 mb-3">
                  {formatCurrency(parseFloat(topUpAmount))}
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

              <form onSubmit={handleSubmitTopUp} className="space-y-3">
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
                    placeholder="https://drive.google.com/... or imgur link"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Upload to Google Drive or Imgur and paste the link.
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-300 text-xs">
                    Our team verifies payments within 2–4 hours on business
                    days. Your wallet will be credited once verified.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit for Verification"}
                </Button>
              </form>
            </div>
          )}

          {/* Step 3 — Done */}
          {topUpStep === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">
                  Top-up request submitted
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {formatCurrency(parseFloat(topUpAmount))} will be added to
                  your wallet once our team verifies the payment.
                </p>
              </div>
              <Button
                onClick={() => handleOpenChange(false)}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}