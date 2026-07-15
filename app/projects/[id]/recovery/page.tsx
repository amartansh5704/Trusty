"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Wallet,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { formatCurrency, formatDate, getCreditTier, calculateStakeAmount } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

type RecoveryData = {
  project: {
    id: string;
    title: string;
    description: string;
    totalAmount: number;
    requiredSkills: string[];
    deadline: string;
  };
  recoveryEvent: {
    id: string;
    completionPercent: number;
    aiGeneratedBrief: string | null;
    remainingBudget: number;
    status: string;
    previousFreelancer: { id: string; name: string };
    createdAt: string;
  } | null;
  dossiers: Array<{
    id: string;
    completedWork: string;
    remainingWork: string;
    technicalNotes: string | null;
    knownIssues: string | null;
    nextSteps: string | null;
    filesAndAccess: string | null;
    aiSummary: string | null;
    createdAt: string;
    author: { id: string; name: string };
    milestone: { id: string; title: string; order: number } | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    order: number;
    status: string;
    deadline: string;
  }>;
  relayQueue: Array<{
    id: string;
    freelancerId: string;
    order: number;
    status: string;
  }>;
};

export default function RecoveryPage() {
  const { user, loading } = useUser();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [data, setData] = useState<RecoveryData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) loadRecovery();
  }, [loading, user]);

  async function loadRecovery() {
    try {
      const res = await fetch(`/api/projects/${projectId}/recovery`);
      const d = await res.json();
      if (res.ok) setData(d);
      else showError("Error", d.error);
    } catch {
      showError("Error", "Failed to load recovery data.");
    } finally {
      setFetching(false);
    }
  }

  async function handleAccept() {
    setActionLoading(true);
    const res = await fetch(`/api/projects/${projectId}/recovery/accept`, {
      method: "POST",
    });
    let d: any = {};
    try { d = await res.json(); } catch {}
    if (res.ok) {
      showSuccess("Project Accepted", "You have been assigned to this project. Good luck!");
      router.push(`/projects/${projectId}`);
    } else {
      showError("Failed", d.error ?? "Something went wrong.");
    }
    setActionLoading(false);
  }

  async function handleDecline() {
    setActionLoading(true);
    const res = await fetch(`/api/projects/${projectId}/recovery/decline`, {
      method: "POST",
    });
    let d: any = {};
    try { d = await res.json(); } catch {}
    if (res.ok) {
      showSuccess("Declined", "The next backup freelancer has been notified.");
      router.push("/dashboard/freelancer");
    } else {
      showError("Failed", d.error ?? "Something went wrong.");
    }
    setActionLoading(false);
  }

  if (loading || fetching) return null;
  if (!user) return null;
  if (!data) return null;

  const { project, recoveryEvent, dossiers, milestones, relayQueue } = data;

  const mySlot = relayQueue.find((s) => s.freelancerId === user.id);
  const isNotified = mySlot?.status === "NOTIFIED";
  const isRecruiter = user.role === "RECRUITER";
  const isAdmin = user.role === "ADMIN";

  const approvedMilestones = milestones.filter((m) => m.status === "APPROVED");
  const remainingMilestones = milestones.filter((m) => m.status !== "APPROVED");

  const stakeAmount = calculateStakeAmount(project.totalAmount, user.creditBalance);
  const canAffordStake = user.creditBalance >= stakeAmount;

  const milestoneStatusColors: Record<string, string> = {
    PENDING: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    SUBMITTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    APPROVED: "bg-green-500/10 text-green-400 border-green-500/30",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/freelancer">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Recovery Brief</h1>
            <p className="text-gray-400 text-sm mt-0.5">{project.title}</p>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Relay Handoff
          </Badge>
        </div>

        {/* Context Banner */}
        <Card className="bg-gray-900 border-orange-400/20 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-medium mb-1">This project needs a new freelancer</h3>
                <p className="text-gray-400 text-sm">
                  The previous freelancer ({recoveryEvent?.previousFreelancer.name ?? "Unknown"})
                  {" "}has left this project at {recoveryEvent?.completionPercent ?? 0}% completion.
                  Review the recovery brief below and decide if you want to take it over.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm">{project.description}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Total Budget</p>
                    <p className="text-white font-bold">{formatCurrency(project.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Remaining Budget</p>
                    <p className="text-yellow-400 font-bold">
                      {formatCurrency(recoveryEvent?.remainingBudget ?? project.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Deadline</p>
                    <p className="text-white">{formatDate(project.deadline)}</p>
                  </div>
                </div>
                {project.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="outline" className="border-gray-600 text-gray-300 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Recovery Brief */}
            {recoveryEvent?.aiGeneratedBrief && (
              <Card className="bg-gray-900 border-yellow-400/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-yellow-400" />
                    AI Recovery Brief
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {recoveryEvent.aiGeneratedBrief}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Milestones */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  Milestones ({approvedMilestones.length}/{milestones.length} completed)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-sm w-6">#{m.order}</span>
                      <div>
                        <p className="text-white text-sm font-medium">{m.title}</p>
                        <p className="text-gray-500 text-xs">{m.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-yellow-400 font-semibold text-sm">
                        {formatCurrency(m.amount)}
                      </span>
                      <Badge variant="outline" className={milestoneStatusColors[m.status] ?? ""}>
                        {m.status === "APPROVED" ? (
                          <><CheckCircle className="h-3 w-3 mr-1" />Done</>
                        ) : (
                          <><Clock className="h-3 w-3 mr-1" />Remaining</>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dossier Entries */}
            {dossiers.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Previous Freelancer's Dossier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dossiers.map((entry) => (
                    <div key={entry.id} className="border border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">
                          {entry.author.name}
                          {entry.milestone && (
                            <span className="text-gray-500 ml-2">
                              • Milestone {entry.milestone.order}: {entry.milestone.title}
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>

                      {entry.aiSummary && (
                        <div className="bg-yellow-400/5 border border-yellow-400/20 rounded p-2">
                          <p className="text-yellow-400 text-xs font-semibold mb-1">AI Summary</p>
                          <p className="text-gray-300 text-xs">{entry.aiSummary}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-green-400 text-xs font-semibold mb-1">Completed</p>
                          <p className="text-gray-300 text-xs">{entry.completedWork}</p>
                        </div>
                        <div>
                          <p className="text-orange-400 text-xs font-semibold mb-1">Remaining</p>
                          <p className="text-gray-300 text-xs">{entry.remainingWork}</p>
                        </div>
                      </div>

                      {entry.technicalNotes && (
                        <div>
                          <p className="text-blue-400 text-xs font-semibold mb-1">Technical Notes</p>
                          <p className="text-gray-300 text-xs">{entry.technicalNotes}</p>
                        </div>
                      )}

                      {entry.filesAndAccess && (
                        <div>
                          <p className="text-yellow-400 text-xs font-semibold mb-1">Files & Access</p>
                          <p className="text-gray-300 text-xs">{entry.filesAndAccess}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Accept / Decline */}
            {isNotified && (
              <Card className="bg-gray-900 border-yellow-400/30">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-white font-semibold">Your Decision</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Remaining Budget</span>
                      <span className="text-yellow-400 font-bold">
                        {formatCurrency(recoveryEvent?.remainingBudget ?? project.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credit Stake Required</span>
                      <span className="text-white font-semibold flex items-center gap-1">
                        <Coins className="h-3 w-3 text-yellow-400" />
                        {stakeAmount} credits
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your Credits</span>
                      <span className="text-white">{user.creditBalance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Milestones Remaining</span>
                      <span className="text-white">{remainingMilestones.length}</span>
                    </div>
                  </div>

                  {!canAffordStake && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                      <p className="text-red-400 text-xs">
                        You need {stakeAmount} credits but only have {user.creditBalance}.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleAccept}
                    disabled={actionLoading || !canAffordStake}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {actionLoading ? "Processing..." : "Accept Project"}
                  </Button>
                  <Button
                    onClick={handleDecline}
                    disabled={actionLoading}
                    variant="outline"
                    className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                  <p className="text-gray-500 text-xs text-center">
                    If you decline, the next backup freelancer will be notified.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Completion Progress */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3">Completion</h3>
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{recoveryEvent?.completionPercent ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${recoveryEvent?.completionPercent ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-green-400">{approvedMilestones.length} milestones</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remaining</span>
                    <span className="text-orange-400">{remainingMilestones.length} milestones</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relay Queue */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-3">Relay Queue</h3>
                <div className="space-y-2">
                  {relayQueue.map((slot) => {
                    const isMe = slot.freelancerId === user.id;
                    const slotStatusColors: Record<string, string> = {
                      STANDBY: "text-gray-400",
                      NOTIFIED: "text-yellow-400",
                      ACCEPTED: "text-green-400",
                      DECLINED: "text-red-400",
                      SKIPPED: "text-gray-500",
                    };
                    return (
                      <div
                        key={slot.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          isMe ? "bg-yellow-400/5 border border-yellow-400/20" : "bg-gray-800"
                        }`}
                      >
                        <span className={`text-sm ${isMe ? "text-yellow-400 font-semibold" : "text-gray-300"}`}>
                          Backup #{slot.order} {isMe && "(You)"}
                        </span>
                        <span className={`text-xs font-medium ${slotStatusColors[slot.status] ?? "text-gray-400"}`}>
                          {slot.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}