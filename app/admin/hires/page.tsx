"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  LogOut,
  Users,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";

type PendingHire = {
  id: string;
  amount: number;
  paymentMethod: string;
  utrNumber: string | null;
  screenshotUrl: string | null;
  status: string;
  createdAt: string;
  project: {
    id: string;
    title: string;
    totalAmount: number;
  };
  recruiter: {
    id: string;
    name: string;
    email: string;
  };
  freelancer: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminHiresPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [hires, setHires] = useState<PendingHire[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadHires();
  }, [user, loading]);

  async function loadHires() {
    try {
      const res = await fetch("/api/admin/hires");
      const data = await res.json();
      if (res.ok) setHires(data.hires);
    } catch {
      showError("Error", "Failed to load pending hires.");
    } finally {
      setFetching(false);
    }
  }

  async function handleVerify(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/hires/${id}/verify`, {
      method: "POST",
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess(
        "Verified & Hired",
        "Payment verified. Freelancer hired and escrow is active."
      );
      loadHires();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/hires/${id}/reject`, {
      method: "POST",
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess("Rejected", "Hire payment rejected. Recruiter notified.");
      loadHires();
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
                className="text-gray-300 hover:text-white text-sm"
              >
                Top-Ups
              </Link>
              <Link
                href="/admin/hires"
                className="text-white text-sm font-medium"
              >
                Hires
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Pending Hires</h1>
          <p className="text-gray-400 mt-1">
            Verify UPI payments and activate escrow to start projects.
          </p>
        </div>

        {hires.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No pending hires
              </h3>
              <p className="text-gray-400">
                When recruiters pay via UPI to hire freelancers, they appear
                here for verification.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {hires.map((hire) => (
              <Card
                key={hire.id}
                className="bg-gray-900 border-yellow-400/20"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Project */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-white font-semibold text-lg">
                          {hire.project.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Payment Submitted
                        </Badge>
                      </div>

                      {/* Parties */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">
                            Recruiter
                          </p>
                          <p className="text-white font-medium">
                            {hire.recruiter.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {hire.recruiter.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">
                            Freelancer
                          </p>
                          <p className="text-white font-medium">
                            {hire.freelancer.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {hire.freelancer.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">
                            Escrow Amount
                          </p>
                          <p className="text-yellow-400 font-bold text-lg">
                            {formatCurrency(hire.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">
                            Submitted
                          </p>
                          <p className="text-white text-xs">
                            {formatDateTime(hire.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div className="bg-gray-800 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              UTR Number
                            </p>
                            <p className="text-white font-mono font-semibold">
                              {hire.utrNumber ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs mb-1">
                              Screenshot
                            </p>
                            {hire.screenshotUrl ? (
                              <a
                                href={hire.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-yellow-400 text-xs hover:underline flex items-center gap-1"
                              >
                                View Screenshot
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
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        onClick={() => handleVerify(hire.id)}
                        disabled={actionLoading === hire.id}
                        className="bg-green-600 hover:bg-green-500 text-white font-semibold"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {actionLoading === hire.id
                          ? "Processing..."
                          : "Verify & Start Escrow"}
                      </Button>
                      <Button
                        onClick={() => handleReject(hire.id)}
                        disabled={actionLoading === hire.id}
                        variant="outline"
                        className="border-red-800 text-red-400 hover:bg-red-900/20"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Payment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}