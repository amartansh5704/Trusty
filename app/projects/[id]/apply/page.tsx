"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins, Shield } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { formatCurrency, getCreditTier, calculateStakeAmount } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

export default function ApplyPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, coverLetter }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("Application failed", data.error);
      setSubmitting(false);
      return;
    }

    showSuccess("Application submitted", "Waiting for recruiter response.");
    router.push(`/projects/${projectId}`);
  }

  if (loading || !project) return null;
  if (!user) return null;

  const tier = getCreditTier(user.creditBalance);
  const stakeAmount = calculateStakeAmount(
    project.totalAmount,
    user.creditBalance
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/projects/${projectId}`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Apply to Project</h1>
        </div>

        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold">{project.title}</h3>
            <p className="text-gray-400 text-sm mt-1">
              Budget:{" "}
              <span className="text-yellow-400 font-semibold">
                {formatCurrency(project.totalAmount)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-yellow-400/20 mb-6">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-400" />
              Your Stake if Hired
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Your Tier</p>
                <p className="text-white font-semibold">{tier.tier}</p>
              </div>
              <div>
                <p className="text-gray-400">Stake Required</p>
                <p className="text-yellow-400 font-semibold flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {stakeAmount} credits ({tier.stakePercent}%)
                </p>
              </div>
              <div>
                <p className="text-gray-400">Your Credits</p>
                <p className="text-white font-semibold">
                  {user.creditBalance} credits
                </p>
              </div>
              <div>
                <p className="text-gray-400">After Stake</p>
                <p className="text-white font-semibold">
                  {user.creditBalance - stakeAmount} credits
                </p>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Stake is returned when project completes. Lost if you ghost.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="bg-gray-900 border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-gray-300">
                Tell the recruiter why you are the right person for this project
              </Label>
              <Textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="I have 3 years of experience with React and Node.js. I have built similar dashboards before and can deliver this in 2 weeks. Here is my approach..."
                required
                rows={8}
                minLength={50}
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
              <p className="text-gray-500 text-xs mt-1">
                Minimum 50 characters. Be specific about your experience and
                approach.
              </p>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={submitting || user.creditBalance < stakeAmount}
            className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold py-3"
          >
            {submitting
              ? "Submitting..."
              : user.creditBalance < stakeAmount
              ? "Not Enough Credits to Apply"
              : "Submit Application"}
          </Button>
        </form>
      </div>
    </div>
  );
}