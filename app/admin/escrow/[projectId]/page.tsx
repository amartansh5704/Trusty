"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  LogOut,
  AlertTriangle,
  IndianRupee,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";

type ReleaseRequest = {
  id: string;
  milestoneId: string;
  amount: number;
  approvedAmount: number | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  milestone: {
    title: string;
    order: number;
    description: string;
    proofOfWorkUrl: string | null;
    proofNotes: string | null;
  };
  freelancer: {
    id: string;
    name: string;
    email: string;
  };
};

type Milestone = {
  id: string;
  title: string;
  description: string;
  amount: number;
  order: number;
  status: string;
  deadline: string;
  proofOfWorkUrl: string | null;
  proofNotes: string | null;
  releaseRequest: ReleaseRequest | null;
};

type EscrowDetail = {
  id: string;
  projectId: string;
  totalAmount: number;
  heldAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  status: string;
  createdAt: string;
  project: {
    id: string;
    title: string;
    status: string;
    totalAmount: number;
    recruiter: { id: string; name: string; email: string };
    freelancer: { id: string; name: string; email: string } | null;
    milestones: Milestone[];
  };
};

type ActionType = "full" | "partial" | "refund" | null;

export default function AdminEscrowDetailPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  console.log("PAGE PARAMS:", params, "projectId:", projectId);

  const [escrow, setEscrow] = useState<EscrowDetail | null>(null);
  const [fetching, setFetching] = useState(true);

  // Action dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRequest, setActiveRequest] =
    useState<ReleaseRequest | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadEscrow();
  }, [user, loading]);

  async function loadEscrow() {
    try {
      const res = await fetch(`/api/admin/escrow/${projectId}`);
      const data = await res.json();
      if (res.ok) setEscrow(data.escrow);
      else showError("Error", data.error);
    } catch {
      showError("Error", "Failed to load escrow detail.");
    } finally {
      setFetching(false);
    }
  }

  function openAction(request: ReleaseRequest, type: ActionType) {
    setActiveRequest(request);
    setActionType(type);
    setPartialAmount("");
    setAdminNote("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setActiveRequest(null);
    setActionType(null);
    setPartialAmount("");
    setAdminNote("");
  }

  async function handleAction(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRequest || !actionType) return;

    if (
      actionType === "partial" &&
      (!partialAmount ||
        parseFloat(partialAmount) <= 0 ||
        parseFloat(partialAmount) > activeRequest.amount)
    ) {
      showError(
        "Invalid amount",
        `Enter an amount between ₹1 and ₹${activeRequest.amount}`
      );
      return;
    }

    setActionLoading(true);

    const res = await fetch(
      `/api/admin/escrow/release/${activeRequest.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          approvedAmount:
            actionType === "partial"
              ? parseFloat(partialAmount)
              : undefined,
          adminNote: adminNote.trim() || undefined,
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      const messages: Record<string, string> = {
        full: "Full payment released to freelancer.",
        partial: `₹${partialAmount} released. Remainder stays in escrow.`,
        refund: "Amount refunded to recruiter wallet.",
      };
      showSuccess("Done", messages[actionType]);
      closeDialog();
      loadEscrow();
    } else {
      showError("Failed", data.error);
    }

    setActionLoading(false);
  }

  async function handleFullRefund() {
    setRefundLoading(true);

    const res = await fetch(
      `/api/admin/escrow/${projectId}/refund`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNote: "Full project refund by admin.",
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      showSuccess(
        "Refunded",
        `${formatCurrency(data.refundAmount)} returned to recruiter.`
      );
      setRefundDialogOpen(false);
      loadEscrow();
    } else {
      showError("Failed", data.error);
    }

    setRefundLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/auth");
    router.refresh();
  }

  const milestoneStatusConfig: Record<
    string,
    { label: string; color: string }
  > = {
    PENDING: {
      label: "Pending",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
    SUBMITTED: {
      label: "Under Review",
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    APPROVED: {
      label: "Approved",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    REJECTED: {
      label: "Rejected",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };

  const releaseStatusConfig: Record<
    string,
    { label: string; color: string }
  > = {
    PENDING: {
      label: "Awaiting Release",
      color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    APPROVED: {
      label: "Released",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    PARTIALLY_APPROVED: {
      label: "Partially Released",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    REFUNDED: {
      label: "Refunded",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
  };

  const escrowStatusConfig: Record<
    string,
    { label: string; color: string }
  > = {
    HOLDING: {
      label: "Holding",
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    PARTIALLY_RELEASED: {
      label: "Partially Released",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    FULLY_RELEASED: {
      label: "Fully Released",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    REFUNDED: {
      label: "Refunded",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
  };

  if (loading || fetching) return null;
  if (!user || user.role !== "ADMIN") return null;
  if (!escrow) return null;

  const progressPercent =
    escrow.totalAmount > 0
      ? Math.round((escrow.releasedAmount / escrow.totalAmount) * 100)
      : 0;

  const pendingRequests = escrow.project.milestones.filter(
    (m) => m.releaseRequest?.status === "PENDING"
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Admin Nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-yellow-400" />
              <span className="text-lg font-bold text-white">
                Trust Issues
              </span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                ADMIN
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-gray-300 hover:text-white text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/topups"
                className="text-gray-300 hover:text-white text-sm"
              >
                Top-Ups
              </Link>
              <Link
                href="/admin/escrow/list"
                className="text-white text-sm font-medium"
              >
                Escrow
              </Link>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-300 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/escrow/list">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {escrow.project.title}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Escrow Management
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              escrowStatusConfig[escrow.status]?.color ??
              "text-gray-400"
            }
          >
            {escrowStatusConfig[escrow.status]?.label ?? escrow.status}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Escrow Summary */}
          <Card className="bg-gray-900 border-gray-800 md:col-span-2">
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Total Escrow</p>
                  <p className="text-white font-bold text-xl">
                    {formatCurrency(escrow.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">
                    Currently Held
                  </p>
                  <p className="text-yellow-400 font-bold text-xl">
                    {formatCurrency(escrow.heldAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">
                    Total Released
                  </p>
                  <p className="text-green-400 font-bold text-xl">
                    {formatCurrency(escrow.releasedAmount)}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Released to freelancer</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-gray-400 text-xs">Recruiter</p>
                    <p className="text-white font-medium">
                      {escrow.project.recruiter.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {escrow.project.recruiter.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-yellow-400" />
                  <div>
                    <p className="text-gray-400 text-xs">Freelancer</p>
                    <p className="text-white font-medium">
                      {escrow.project.freelancer?.name ?? "—"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {escrow.project.freelancer?.email ?? ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-gray-900 border-red-900/30">
            <CardContent className="p-5">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Danger Zone
              </h3>
              <p className="text-gray-400 text-xs mb-4">
                Refund the entire remaining escrow (
                {formatCurrency(escrow.heldAmount)}) back to the recruiter.
                Use when project is cancelled or freelancer has ghosted.
              </p>
              <Button
                onClick={() => setRefundDialogOpen(true)}
                disabled={escrow.heldAmount <= 0}
                variant="outline"
                className="w-full border-red-800 text-red-400 hover:bg-red-900/20 disabled:opacity-40"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refund All to Recruiter
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pending Release Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-400" />
              Pending Release Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((milestone) => {
                const req = milestone.releaseRequest!;
                return (
                  <Card
                    key={milestone.id}
                    className="bg-gray-900 border-orange-400/20"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-gray-500 font-mono text-sm">
                              #{milestone.order}
                            </span>
                            <h3 className="text-white font-semibold">
                              {milestone.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-orange-500/10 text-orange-400 border-orange-500/30"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Release
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                            <div>
                              <p className="text-gray-400 text-xs">
                                Release Amount
                              </p>
                              <p className="text-yellow-400 font-bold text-lg">
                                {formatCurrency(req.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                Freelancer
                              </p>
                              <p className="text-white font-medium">
                                {req.freelancer.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                Requested
                              </p>
                              <p className="text-white text-xs">
                                {formatDateTime(req.createdAt)}
                              </p>
                            </div>
                          </div>

                          {milestone.proofOfWorkUrl && (
                            <div className="bg-gray-800 rounded-lg p-3 mb-3">
                              <p className="text-gray-400 text-xs mb-1">
                                Proof of Work
                              </p>
                              <a
                                href={milestone.proofOfWorkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-400 text-sm hover:underline break-all"
                              >
                                {milestone.proofOfWorkUrl}
                              </a>
                              {milestone.proofNotes && (
                                <p className="text-gray-300 text-sm mt-2">
                                  {milestone.proofNotes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => openAction(req, "full")}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Release Full {formatCurrency(req.amount)}
                        </Button>
                        <Button
                          onClick={() => openAction(req, "partial")}
                          variant="outline"
                          className="flex-1 border-blue-700 text-blue-400 hover:bg-blue-900/20"
                        >
                          <IndianRupee className="h-4 w-4 mr-2" />
                          Partial Release
                        </Button>
                        <Button
                          onClick={() => openAction(req, "refund")}
                          variant="outline"
                          className="border-red-800 text-red-400 hover:bg-red-900/20 px-4"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Milestones */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            All Milestones
          </h2>
          <div className="space-y-3">
            {escrow.project.milestones.map((milestone) => {
              const msConfig =
                milestoneStatusConfig[milestone.status] ??
                milestoneStatusConfig.PENDING;
              const releaseReq = milestone.releaseRequest;
              const relConfig = releaseReq
                ? releaseStatusConfig[releaseReq.status]
                : null;

              return (
                <Card
                  key={milestone.id}
                  className="bg-gray-900 border-gray-800"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono text-sm w-6">
                          #{milestone.order}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                              {milestone.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={msConfig.color}
                            >
                              {msConfig.label}
                            </Badge>
                            {relConfig && (
                              <Badge
                                variant="outline"
                                className={relConfig.color}
                              >
                                {relConfig.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            Due {formatDate(milestone.deadline)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-semibold">
                          {formatCurrency(milestone.amount)}
                        </p>
                        {releaseReq?.approvedAmount &&
                          releaseReq.approvedAmount !==
                            releaseReq.amount && (
                            <p className="text-green-400 text-xs">
                              {formatCurrency(releaseReq.approvedAmount)}{" "}
                              released
                            </p>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Release Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === "full" && "Release Full Payment"}
              {actionType === "partial" && "Partial Release"}
              {actionType === "refund" && "Refund This Milestone"}
            </DialogTitle>
          </DialogHeader>

          {activeRequest && (
            <form onSubmit={handleAction} className="space-y-4 pt-2">
              {/* Context */}
              <div className="bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-gray-400 mb-1">Milestone</p>
                <p className="text-white font-medium">
                  {activeRequest.milestone.title}
                </p>
                <p className="text-gray-400 mt-2 mb-1">Freelancer</p>
                <p className="text-white">{activeRequest.freelancer.name}</p>
                <p className="text-gray-400 mt-2 mb-1">Full Amount</p>
                <p className="text-yellow-400 font-bold text-lg">
                  {formatCurrency(activeRequest.amount)}
                </p>
              </div>

              {/* Full release confirmation */}
              {actionType === "full" && (
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm">
                    {formatCurrency(activeRequest.amount)} will be sent
                    directly to{" "}
                    <span className="font-semibold">
                      {activeRequest.freelancer.name}
                    </span>
                    's wallet immediately.
                  </p>
                </div>
              )}

              {/* Partial release input */}
              {actionType === "partial" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-300">
                      Amount to release (₹){" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder={String(activeRequest.amount)}
                      min={1}
                      max={activeRequest.amount}
                      required
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Max: {formatCurrency(activeRequest.amount)}. Remainder
                      stays in escrow.
                    </p>
                  </div>
                  {partialAmount && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">
                          To freelancer
                        </p>
                        <p className="text-green-400 font-bold">
                          {formatCurrency(parseFloat(partialAmount) || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">
                          Stays in escrow
                        </p>
                        <p className="text-yellow-400 font-bold">
                          {formatCurrency(
                            activeRequest.amount -
                              (parseFloat(partialAmount) || 0)
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Refund warning */}
              {actionType === "refund" && (
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">
                    {formatCurrency(activeRequest.amount)} will be refunded
                    back to the recruiter's wallet. The freelancer receives
                    nothing for this milestone.
                  </p>
                </div>
              )}

              {/* Admin note */}
              <div>
                <Label className="text-gray-300">
                  Admin Note{" "}
                  <span className="text-gray-500">(optional)</span>
                </Label>
                <Input
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Reason for this decision..."
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className={`flex-1 font-semibold ${
                    actionType === "full"
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : actionType === "partial"
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {actionLoading
                    ? "Processing..."
                    : actionType === "full"
                    ? "Confirm Release"
                    : actionType === "partial"
                    ? "Confirm Partial Release"
                    : "Confirm Refund"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Refund Entire Escrow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm mb-2">
                This will refund{" "}
                <span className="font-bold text-white">
                  {formatCurrency(escrow.heldAmount)}
                </span>{" "}
                back to{" "}
                <span className="font-bold text-white">
                  {escrow.project.recruiter.name}
                </span>
                's wallet.
              </p>
              <p className="text-red-400 text-sm">
                All pending release requests will be cancelled. This
                cannot be undone.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundDialogOpen(false)}
                className="flex-1 border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFullRefund}
                disabled={refundLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold"
              >
                {refundLoading
                  ? "Refunding..."
                  : `Refund ${formatCurrency(escrow.heldAmount)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}