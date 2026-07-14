"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

export default function AdminAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError("Login failed", error.message);
      setLoading(false);
      return;
    }

    // Check if user is admin
    const res = await fetch("/api/auth/check");
    const data = await res.json();

    if (!data.user || data.user.role !== "ADMIN") {
      await supabase.auth.signOut();
      showError("Access denied", "This account is not an admin.");
      setLoading(false);
      return;
    }

    showSuccess("Welcome back", "Redirecting to admin panel...");
    router.push("/admin");
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // 1. Create Supabase auth user
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      showError("Registration failed", signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Sign in immediately
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      showError("Sign in failed", signInError.message);
      setLoading(false);
      return;
    }

    // 3. Create Prisma user with ADMIN role
    const res = await fetch("/api/auth/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role: "ADMIN",
        bio: "Platform Administrator",
        skills: [],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("Onboarding failed", data.error);
      setLoading(false);
      return;
    }

    showSuccess("Admin account created", "Redirecting to admin panel...");
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-800 w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-white text-xl">
            Trust Issues — Admin
          </CardTitle>
          <p className="text-gray-500 text-sm mt-1">
            Platform administration panel
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                mode === "login"
                  ? "bg-yellow-400 text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                mode === "register"
                  ? "bg-yellow-400 text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@trustissues.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                <Lock className="h-4 w-4 mr-2" />
                {loading ? "Signing in..." : "Sign In as Admin"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label className="text-gray-300">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  required
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@trustissues.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                <Shield className="h-4 w-4 mr-2" />
                {loading ? "Creating account..." : "Create Admin Account"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}