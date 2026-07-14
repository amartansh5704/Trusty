"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  IndianRupee,
  Wallet,
  AlertTriangle,
  Users,
  FolderOpen,
  LogOut,
  Clock,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";

type AdminStats = {
  pendingTopUps: number;
  pendingReleases: number;
  pendingHires: number;
  totalEscrowHeld: number;
  totalUsers: number;
  totalProjects: number;
  openDisputes: number;
};

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/admin/auth");
      return;
    }
    if (user?.role === "ADMIN") loadStats();
  }, [user, loading]);

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {} finally {
      setFetching(false);
    }
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
              <Link href="/admin" className="text-white text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/admin/topups" className="text-gray-300 hover:text-white text-sm">
                Top-Ups
              </Link>
              <Link href="/admin/hires" className="text-gray-300 hover:text-white text-sm">
                Hires
              </Link>
              <Link href="/admin/escrow/list" className="text-gray-300 hover:text-white text-sm">
                Escrow
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{user.name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-300 hover:text-red-400">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400 mb-8">Platform overview and pending actions.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/topups">
            <Card className="bg-gray-900 border-gray-800 hover:border-yellow-400/30 transition-colors cursor-pointer">
              <CardContent className="p-5 text-center">
                <IndianRupee className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats?.pendingTopUps ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">Pending Top-Ups</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/hires">
            <Card className="bg-gray-900 border-gray-800 hover:border-yellow-400/30 transition-colors cursor-pointer">
              <CardContent className="p-5 text-center">
                <UserCheck className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats?.pendingHires ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">Pending Hires</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/escrow/list">
            <Card className="bg-gray-900 border-gray-800 hover:border-yellow-400/30 transition-colors cursor-pointer">
              <CardContent className="p-5 text-center">
                <Clock className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-white">{stats?.pendingReleases ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">Pending Releases</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Wallet className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{formatCurrency(stats?.totalEscrowHeld ?? 0)}</p>
              <p className="text-gray-400 text-sm mt-1">Total Escrow Held</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{stats?.totalUsers ?? 0}</p>
              <p className="text-gray-400 text-sm mt-1">Total Users</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <FolderOpen className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{stats?.totalProjects ?? 0}</p>
              <p className="text-gray-400 text-sm mt-1">Total Projects</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 text-center">
              <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{stats?.openDisputes ?? 0}</p>
              <p className="text-gray-400 text-sm mt-1">Open Disputes</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/admin/topups">
            <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center">
                    <IndianRupee className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Review Top-Ups</p>
                    <p className="text-gray-400 text-sm">Verify wallet top-ups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/hires">
            <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-400/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Review Hires</p>
                    <p className="text-gray-400 text-sm">Verify payments and start escrow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/escrow/list">
            <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Manage Escrow</p>
                    <p className="text-gray-400 text-sm">Release milestone payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}