"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  IndianRupee,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  LogOut,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";

type TopUp = {
  id: string;
  amount: number;
  status: string;
  utrNumber: string | null;
  screenshotUrl: string | null;
  submittedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function AdminTopupsPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadTopUps();
  }, [user, loading]);

  async function loadTopUps() {
    try {
      const res = await fetch(
        `/api/admin/topups${tab === "all" ? "?all=true" : ""}`
      );
      const data = await res.json();
      if (res.ok) setTopUps(data.topUps);
    } catch {
      showError("Error", "Failed to load top-ups.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setFetching(true);
      loadTopUps();
    }
  }, [tab]);

  async function handleVerify(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/topups/${id}/verify`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      showSuccess("Verified", "Wallet has been credited.");
      loadTopUps();
    } else {
      showError("Failed", data.error);
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/topups/${id}/reject`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      showSuccess("Rejected", "Top-up has been rejected.");
      loadTopUps();
    } else {
      showError("Failed", data.error);
    }
    setActionLoading(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/auth");
    router.refresh();
  }

  const statusConfig: Record<
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
    VERIFIED: {
      label: "Verified",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    REFUNDED: {
      label: "Rejected",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };

  if (loading || fetching) return null;
  if (!user || user.role !== "ADMIN") return null;

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
                className="text-white text-sm font-medium"
              >
                Top-Ups
              </Link>
              <Link
                href="/admin/escrow/list"
                className="text-gray-300 hover:text-white text-sm"
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Wallet Top-Ups
            </h1>
            <p className="text-gray-400 mt-1">
              Verify UTR numbers and credit recruiter wallets.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === "pending"
                ? "bg-yellow-400 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === "all"
                ? "bg-yellow-400 text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All Top-Ups
          </button>
        </div>

        {topUps.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <IndianRupee className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {tab === "pending"
                  ? "No pending top-ups"
                  : "No top-ups yet"}
              </h3>
              <p className="text-gray-400">
                {tab === "pending"
                  ? "All top-up requests have been processed."
                  : "Top-up requests will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {topUps.map((topUp) => {
              const config =
                statusConfig[topUp.status] ?? statusConfig.PENDING;
              const isPending = topUp.status === "SUBMITTED";

              return (
                <Card
                  key={topUp.id}
                  className={`bg-gray-900 border-gray-800 ${
                    isPending ? "border-yellow-400/20" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* User info */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center">
                            <span className="text-yellow-400 font-bold text-sm">
                              {topUp.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {topUp.user.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {topUp.user.email}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={config.color}
                          >
                            {config.label}
                          </Badge>
                        </div>

                        {/* Amount and UTR */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              Amount
                            </p>
                            <p className="text-yellow-400 font-bold text-lg">
                              {formatCurrency(topUp.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              UTR Number
                            </p>
                            <p className="text-white font-mono font-semibold">
                              {topUp.utrNumber ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              Submitted
                            </p>
                            <p className="text-white text-xs">
                              {topUp.submittedAt
                                ? formatDateTime(topUp.submittedAt)
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              Screenshot
                            </p>
                            {topUp.screenshotUrl ? (
                              <a
                                href={topUp.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-400 text-xs hover:underline flex items-center gap-1"
                              >
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <p className="text-gray-500 text-xs">
                                Not provided
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {isPending && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleVerify(topUp.id)}
                            disabled={actionLoading === topUp.id}
                            className="bg-green-600 hover:bg-green-500 text-white font-semibold"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {actionLoading === topUp.id
                              ? "Processing..."
                              : "Verify & Credit"}
                          </Button>
                          <Button
                            onClick={() => handleReject(topUp.id)}
                            disabled={actionLoading === topUp.id}
                            variant="outline"
                            className="border-red-800 text-red-400 hover:bg-red-900/20"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {!isPending && (
                        <div className="flex-shrink-0">
                          {topUp.status === "VERIFIED" && (
                            <CheckCircle className="h-6 w-6 text-green-400" />
                          )}
                          {topUp.status === "REFUNDED" && (
                            <XCircle className="h-6 w-6 text-red-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}