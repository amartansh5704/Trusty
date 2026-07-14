"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, LinkIcon, FileText } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

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
};

type Project = {
  id: string;
  title: string;
  milestones: Milestone[];
};

export default function SubmitMilestonePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId = params.id as string;
  const milestoneId = searchParams.get("milestone");

  const [project, setProject] = useState<Project | null>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [proofOfWorkUrl, setProofOfWorkUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) {
          setProject(d.project);

          // Find the specific milestone from query param
          if (milestoneId) {
            const found = d.project.milestones.find(
              (m: Milestone) => m.id === milestoneId
            );
            if (found) {
              setMilestone(found);
              // Pre-fill if previously submitted and rejected
              if (found.proofOfWorkUrl) setProofOfWorkUrl(found.proofOfWorkUrl);
              if (found.proofNotes) setProofNotes(found.proofNotes);
            }
          } else {
            // No milestone specified — pick first PENDING or REJECTED milestone
            const firstPending = d.project.milestones.find(
              (m: Milestone) =>
                m.status === "PENDING" || m.status === "REJECTED"
            );
            if (firstPending) setMilestone(firstPending);
          }
        }
      })
      .catch(() => showError("Error", "Failed to load project."))
      .finally(() => setFetching(false));
  }, [projectId, milestoneId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!milestone) return;

    if (!proofOfWorkUrl.trim()) {
      showError("Missing proof", "Please provide a link to your proof of work.");
      return;
    }

    // Basic URL validation
    try {
      new URL(proofOfWorkUrl);
    } catch {
      showError("Invalid URL", "Please enter a valid URL starting with https://");
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/milestones/${milestone.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proofOfWorkUrl: proofOfWorkUrl.trim(),
        proofNotes: proofNotes.trim() || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("Submission failed", data.error);
      setSubmitting(false);
      return;
    }

    showSuccess(
      "Milestone submitted",
      "The recruiter will review your work and release payment."
    );
    router.push(`/projects/${projectId}`);
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    SUBMITTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    APPROVED: "bg-green-500/10 text-green-400 border-green-500/30",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
    DISPUTED: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };

  if (loading || fetching) return null;
  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
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
          <div>
            <h1 className="text-2xl font-bold text-white">Submit Milestone</h1>
            <p className="text-gray-400 text-sm mt-1">
              {project?.title ?? "Loading..."}
            </p>
          </div>
        </div>

        {!milestone ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No milestone to submit
              </h3>
              <p className="text-gray-400 mb-6">
                All milestones have been submitted or there are none available.
              </p>
              <Link href={`/projects/${projectId}`}>
                <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                  Back to Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Milestone Info */}
            <Card className="bg-gray-900 border-gray-800 mb-6">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-gray-500 text-sm font-mono">
                        #{milestone.order}
                      </span>
                      <h3 className="text-white font-semibold">
                        {milestone.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={statusColors[milestone.status]}
                      >
                        {milestone.status === "REJECTED"
                          ? "Rejected — Resubmit"
                          : milestone.status}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">
                      {milestone.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Amount:{" "}
                        <span className="text-yellow-400 font-semibold">
                          {formatCurrency(milestone.amount)}
                        </span>
                      </span>
                      <span className="text-gray-400">
                        Due:{" "}
                        <span className="text-white">
                          {formatDate(milestone.deadline)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {milestone.status === "REJECTED" && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm font-medium">
                      This milestone was rejected. Please revise your work and
                      resubmit with updated proof.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestone selector if multiple available */}
            {project &&
              project.milestones.filter(
                (m) => m.status === "PENDING" || m.status === "REJECTED"
              ).length > 1 && (
                <Card className="bg-gray-900 border-gray-800 mb-6">
                  <CardContent className="p-4">
                    <p className="text-gray-400 text-sm mb-3">
                      Other milestones available to submit:
                    </p>
                    <div className="space-y-2">
                      {project.milestones
                        .filter(
                          (m) =>
                            (m.status === "PENDING" ||
                              m.status === "REJECTED") &&
                            m.id !== milestone.id
                        )
                        .map((m) => (
                          <Link
                            key={m.id}
                            href={`/projects/${projectId}/submit?milestone=${m.id}`}
                          >
                            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer">
                              <span className="text-white text-sm">
                                #{m.order} {m.title}
                              </span>
                              <Badge
                                variant="outline"
                                className={statusColors[m.status]}
                              >
                                {m.status}
                              </Badge>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="h-5 w-5 text-yellow-400" />
                    Proof of Work
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">
                      Link to your deliverable{" "}
                      <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        value={proofOfWorkUrl}
                        onChange={(e) => setProofOfWorkUrl(e.target.value)}
                        placeholder="https://github.com/yourusername/project or https://drive.google.com/..."
                        required
                        className="bg-gray-800 border-gray-700 text-white pl-10"
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Link to GitHub repo, Google Drive, Figma, deployed URL, or
                      any accessible link showing your work.
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-300">
                      Notes for the recruiter{" "}
                      <span className="text-gray-500">(optional)</span>
                    </Label>
                    <Textarea
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      placeholder="Explain what you built, any decisions you made, how to access or run the work, any known limitations..."
                      rows={5}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* What happens next */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <h3 className="text-white font-medium mb-3">
                    What happens after you submit
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold mt-0.5">1</span>
                      <span>
                        Recruiter is notified and reviews your proof of work.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold mt-0.5">2</span>
                      <span>
                        If approved, payment for this milestone is released to
                        your wallet immediately.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold mt-0.5">3</span>
                      <span>
                        If rejected, you will be notified with feedback and can
                        resubmit.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold mt-0.5">4</span>
                      <span>
                        Each approved milestone also earns you{" "}
                        <span className="text-yellow-400">+10 credits</span>.
                      </span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold py-3 text-base"
              >
                {submitting ? "Submitting..." : "Submit Milestone for Review"}
              </Button>
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}