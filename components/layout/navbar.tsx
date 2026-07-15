"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, Bell, LogOut, User, Coins } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    role: string;
    creditBalance: number;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadUnreadCount() {
    try {
      const res = await fetch("/api/notifications?count=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-yellow-400" />
            <span className="text-lg font-bold text-white">Trust Issues</span>
          </Link>

          <div className="flex items-center gap-4">
            {user.role === "RECRUITER" && (
              <>
                <Link href="/dashboard/recruiter" className="text-gray-300 hover:text-white text-sm">
                  Dashboard
                </Link>
                <Link href="/projects/new" className="text-gray-300 hover:text-white text-sm">
                  Post Project
                </Link>
                <Link href="/wallet" className="text-gray-300 hover:text-white text-sm">
                  Wallet
                </Link>
                <Link href="/freelancers" className="text-gray-300 hover:text-white text-sm">
                  Browse Freelancers
                </Link>
              </>
            )}
            {user.role === "FREELANCER" && (
              <>
                <Link href="/dashboard/freelancer" className="text-gray-300 hover:text-white text-sm">
                  Dashboard
                </Link>
                <Link href="/projects/browse" className="text-gray-300 hover:text-white text-sm">
                  Find Work
                </Link>
                <Link href="/wallet" className="text-gray-300 hover:text-white text-sm">
                  Wallet
                </Link>
                <Link href="/credits" className="text-gray-300 hover:text-white text-sm">
                  Credits
                </Link>
              </>
            )}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="text-gray-300 hover:text-white text-sm">
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === "FREELANCER" && (
            <div className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full">
              <Coins className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm font-semibold">
                {user.creditBalance}
              </span>
            </div>
          )}

          <Link href="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-black text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/profile/edit">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
              <User className="h-5 w-5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-300 hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}