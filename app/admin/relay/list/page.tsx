"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Ghost,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  ArrowRight,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";

type GhostAlertItem = {
  id: string;
  projectId: string;
  note: string | null;
  status: string;
  raisedAt: string;
  confirmedAt: string | null;
  project: {
    id: string;
    title: string;
    totalAmount: number;
    escrowAmount: number;
  };
  raisedBy: { id: string; name: string; email: string };
  freelancer: { id: string; name: string; email: string };
};

export default function AdminRelayListPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [alerts, setAlerts] = useState<GhostAlertItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"raised" | "all">("raised");

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadAlerts();
  }, [user, loading, tab]);

  async function loadAlerts() {
    setFetching(true);
    try {
      const url =
        tab === "raised"
          ? "/api/admin/relay?status=RAISED"
          : "/api/admin/relay";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setAlerts(data.alerts);
    } catch {
      showError("Error", "Failed to load ghost alerts.");
    } finally {
      setFetching(false);
    }
  }

  async function handleConfirmGhost(projectId: string) {
    setActionLoading(projectId);
    const res = await fetch(`/api/admin/relay/${projectId}/forfeit`, {
      method: "POST",
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {}
    if (res.ok) {
      showSuccess(
        "Ghost Confirmed",
        "Freelancer penalized. Recovery brief generated. Backup notified."
      );
      loadAlerts();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }
    setActionLoading(null);
  }

  async function handleDismiss(projectId: string) {
    setActionLoading(projectId);
    const res = await fetch(`/api/admin/relay/${projectId}/dismiss`, {
      method: "POST",
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {}
    if (res.ok) {
      showSuccess("Alert Dismissed", "Recruiter has been notified.");
      loadAlerts();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }
    setActionLoading(null);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/auth");
    router.refresh();
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    RAISED: {
      label: "Raised",
      color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    },
    CONFIRMED: {
      label: "Confirmed — Relay Active",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
    },
    DISMISSED: {
      label: "Dismissed",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
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
              <span className="text-lg font-bold text-white">Trust Issues</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                ADMIN
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-300 hover:text-white text-sm">Dashboard</Link>
              <Link href="/admin/topups" className="text-gray-300 hover:text-white text-sm">Top-Ups</Link>
              <Link href="/admin/hires" className="text-gray-300 hover:text-white text-sm">Hires</Link>
              <Link href="/admin/escrow/list" className="text-gray-300 hover:text-white text-sm">Escrow</Link>
              <Link href="/admin/relay/list" className="text-white text-sm font-medium">Relay</Link>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-300 hover:text-red-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Ghost Alerts & Relay</h1>
          <p className="text-gray-400 mt-1">
            Review ghost alerts from recruiters. Confirm to trigger recovery and relay to backup freelancers.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setTab("raised")}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === "raised" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === "all" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            All Alerts
          </button>
        </div>

        {alerts.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <Ghost className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {tab === "raised" ? "No pending ghost alerts" : "No ghost alerts yet"}
              </h3>
              <p className="text-gray-400">
                Ghost alerts appear here when recruiters report unresponsive freelancers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const config = statusConfig[alert.status] ?? statusConfig.RAISED;
              const isPending = alert.status === "RAISED";

              return (
                <Card
                  key={alert.id}
                  className={`bg-gray-900 border-gray-800 ${
                    isPending ? "border-orange-400/20" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <Ghost className="h-5 w-5 text-orange-400" />
                          <h3 className="text-white font-semibold text-lg">
                            {alert.project.title}
                          </h3>
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Reported By</p>
                            <p className="text-white font-medium">{alert.raisedBy.name}</p>
                            <p className="text-gray-500 text-xs">{alert.raisedBy.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Ghosting Freelancer</p>
                            <p className="text-red-400 font-medium">{alert.freelancer.name}</p>
                            <p className="text-gray-500 text-xs">{alert.freelancer.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Escrow Held</p>
                            <p className="text-yellow-400 font-bold">
                              {formatCurrency(alert.project.escrowAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Reported At</p>
                            <p className="text-white text-xs">{formatDateTime(alert.raisedAt)}</p>
                          </div>
                        </div>

                        {/* Note */}
                        {alert.note && (
                          <div className="bg-gray-800 rounded-lg p-3 mb-4">
                            <p className="text-gray-400 text-xs mb-1">Recruiter's Note</p>
                            <p className="text-gray-300 text-sm">{alert.note}</p>
                          </div>
                        )}

                        {/* Quick links */}
                        <div className="flex gap-3 text-sm">
                          <Link
                            href={`/projects/${alert.projectId}`}
                            className="text-yellow-400 hover:underline flex items-center gap-1"
                          >
                            View Project <ArrowRight className="h-3 w-3" />
                          </Link>
                          <Link
                            href={`/api/projects/${alert.projectId}/dossier`}
                            target="_blank"
                            className="text-blue-400 hover:underline flex items-center gap-1"
                          >
                            View Dossier <ArrowRight className="h-3 w-3" />
                          </Link>
                          <Link
                            href={`/api/projects/${alert.projectId}/backup`}
                            target="_blank"
                            className="text-purple-400 hover:underline flex items-center gap-1"
                          >
                            View Backup Queue <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>

                      {/* Actions */}
                      {isPending && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            onClick={() => handleConfirmGhost(alert.projectId)}
                            disabled={actionLoading === alert.projectId}
                            className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {actionLoading === alert.projectId
                              ? "Processing..."
                              : "Confirm Ghost"}
                          </Button>
                          <Button
                            onClick={() => handleDismiss(alert.projectId)}
                            disabled={actionLoading === alert.projectId}
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Dismiss
                          </Button>
                        </div>
                      )}

                      {alert.status === "CONFIRMED" && (
                        <CheckCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                      )}
                      {alert.status === "DISMISSED" && (
                        <XCircle className="h-6 w-6 text-gray-500 flex-shrink-0" />
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