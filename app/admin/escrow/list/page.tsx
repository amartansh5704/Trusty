"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Wallet,
  ArrowRight,
  LogOut,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { showError } from "@/lib/toast";

type EscrowHold = {
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
  };
  pendingReleases?: number;
};

export default function AdminEscrowListPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [escrows, setEscrows] = useState<EscrowHold[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadEscrows();
  }, [user, loading]);

  async function loadEscrows() {
    try {
      const res = await fetch("/api/admin/escrow/list");
      const data = await res.json();
      if (res.ok) setEscrows(data.escrows);
      else showError("Error", data.error);
    } catch {
      showError("Error", "Failed to load escrow data.");
    } finally {
      setFetching(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/auth");
    router.refresh();
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    HOLDING: {
      label: "Holding",
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    },
    PARTIALLY_RELEASED: {
      label: "Partial",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    },
    FULLY_RELEASED: {
      label: "Released",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
    },
    REFUNDED: {
      label: "Refunded",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    },
  };

  if (loading || fetching) return null;
  if (!user || user.role !== "ADMIN") return null;

  const totalHeld = escrows.reduce((sum, e) => sum + e.heldAmount, 0);
  const pendingCount = escrows.filter(
    (e) => (e.pendingReleases ?? 0) > 0
  ).length;

  return (
    <div className="min-h-screen bg-black">
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
                href="/admin/hires"
                className="text-gray-300 hover:text-white text-sm"
              >
                Hires
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Escrow Holds</h1>
          <p className="text-gray-400 mt-1">
            Manage project escrow and approve milestone payments.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Wallet className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalHeld)}
              </p>
              <p className="text-gray-400 text-sm mt-1">Total Held</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Clock className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-gray-400 text-sm mt-1">
                Projects Awaiting Action
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Shield className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {escrows.length}
              </p>
              <p className="text-gray-400 text-sm mt-1">Total Projects</p>
            </CardContent>
          </Card>
        </div>

        {escrows.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <Wallet className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No escrow holds yet
              </h3>
              <p className="text-gray-400">
                Escrow holds appear here when recruiters hire freelancers.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {escrows.map((escrow) => {
              const config =
                statusConfig[escrow.status] ?? statusConfig.HOLDING;
              const hasPending = (escrow.pendingReleases ?? 0) > 0;
              const progressPercent =
                escrow.totalAmount > 0
                  ? Math.round(
                      (escrow.releasedAmount / escrow.totalAmount) * 100
                    )
                  : 0;

              return (
                <Link
                  key={escrow.id}
                  href={`/admin/escrow/${escrow.projectId}`}
                >
                  <Card
                    className={`bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors cursor-pointer mb-2 ${
                      hasPending ? "border-orange-400/30" : ""
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-white font-semibold text-lg">
                              {escrow.project.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={config.color}
                            >
                              {config.label}
                            </Badge>
                            {hasPending && (
                              <Badge
                                variant="outline"
                                className="bg-orange-500/10 text-orange-400 border-orange-500/30"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {escrow.pendingReleases} pending
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-6 text-sm mb-4">
                            <div>
                              <p className="text-gray-400 text-xs">
                                Recruiter
                              </p>
                              <p className="text-white">
                                {escrow.project.recruiter.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                Freelancer
                              </p>
                              <p className="text-white">
                                {escrow.project.freelancer?.name ?? "—"}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-gray-400 text-xs mb-1">
                                Total
                              </p>
                              <p className="text-white font-semibold">
                                {formatCurrency(escrow.totalAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs mb-1">
                                Still Held
                              </p>
                              <p className="text-yellow-400 font-semibold">
                                {formatCurrency(escrow.heldAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs mb-1">
                                Released
                              </p>
                              <p className="text-green-400 font-semibold">
                                {formatCurrency(escrow.releasedAmount)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Released</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                              <div
                                className="bg-green-400 h-1.5 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-5 w-5 text-gray-500 flex-shrink-0 mt-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}