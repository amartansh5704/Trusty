"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Code, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/lib/toast";

export default function OnboardingPage() {
  const [step, setStep] = useState<"role" | "profile">("role");
  const [role, setRole] = useState<"FREELANCER" | "RECRUITER" | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleRoleSelect(selectedRole: "FREELANCER" | "RECRUITER") {
    setRole(selectedRole);
    setStep("profile");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role,
        bio,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        portfolioUrl,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("Setup failed", data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    showSuccess("Profile created!", "Welcome to Trust Issues.");

    if (role === "RECRUITER") {
      router.push("/dashboard/recruiter");
    } else {
      router.push("/dashboard/freelancer");
    }
  }

  if (step === "role") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-yellow-400" />
            <span className="text-xl font-bold text-white">Trust Issues</span>
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            How will you use Trust Issues?
          </h1>
          <p className="text-gray-400 text-center mb-10">
            Choose your role. You can always change this later.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className="bg-gray-900 border-gray-800 cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => handleRoleSelect("RECRUITER")}
            >
              <CardContent className="p-8 text-center">
                <Briefcase className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  I&apos;m Hiring
                </h3>
                <p className="text-gray-400 text-sm">
                  Post projects, hire freelancers, and pay through escrow with
                  milestone protection.
                </p>
              </CardContent>
            </Card>

            <Card
              className="bg-gray-900 border-gray-800 cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => handleRoleSelect("FREELANCER")}
            >
              <CardContent className="p-8 text-center">
                <Code className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  I&apos;m a Freelancer
                </h3>
                <p className="text-gray-400 text-sm">
                  Find projects, build your credit reputation, and get paid
                  securely through milestones.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">
            {role === "FREELANCER"
              ? "Set Up Your Freelancer Profile"
              : "Set Up Your Recruiter Profile"}
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">
            {role === "FREELANCER"
              ? "Tell clients about yourself and your skills."
              : "Tell freelancers about your company."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name field — always shown for both roles */}
            <div>
              <Label htmlFor="name" className="text-gray-300">
                Your Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === "FREELANCER" ? "John Doe" : "Jane Smith"
                }
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
              />
            </div>

            {/* Bio field */}
            <div>
              <Label htmlFor="bio" className="text-gray-300">
                {role === "FREELANCER" ? "About You" : "About Your Company"}
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  role === "FREELANCER"
                    ? "I'm a fullstack developer with 3 years of experience..."
                    : "We are a startup building AI tools..."
                }
                required
                className="bg-gray-800 border-gray-700 text-white mt-1"
                rows={4}
              />
            </div>

            {/* Freelancer-only fields */}
            {role === "FREELANCER" && (
              <>
                <div>
                  <Label htmlFor="skills" className="text-gray-300">
                    Skills (comma separated)
                  </Label>
                  <Input
                    id="skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, Node.js, Figma, Python"
                    required
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="portfolio" className="text-gray-300">
                    Portfolio URL (optional)
                  </Label>
                  <Input
                    id="portfolio"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("role")}
                className="flex-1 border-gray-700 text-white hover:bg-gray-800"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
              >
                {loading ? "Creating..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}