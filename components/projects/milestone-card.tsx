"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, XCircle, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";
import Link from "next/link";

type Milestone = {
  id: string;
  title: string;
  description: string;
  amount: number;
  order: number;
  status: string;
  deadline: Date;
  proofOfWorkUrl: string | null;
  proofNotes: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
};

interface MilestoneCardProps {
  milestone: Milestone;
  isFreelancer: boolean;
  isRecruiter: boolean;
  projectId: string;
  freelancerId: string;
}

export default function MilestoneCard({
  milestone,
  isFreelancer,
  isRecruiter,
  projectId,
  freelancerId,
}: MilestoneCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    PENDING: {
      label: "Pending",
      color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    SUBMITTED: {
      label: "Under Review",
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      icon: <Upload className="h-3 w-3" />,
    },
    APPROVED: {
      label: "Approved",
      color: "bg-green-500/10 text-green-400 border-green-500/30",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    REJECTED: {
      label: "Rejected",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
      icon: <XCircle className="h-3 w-3" />,
    },
    DISPUTED: {
      label: "Disputed",
      color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const config = statusConfig[milestone.status] || statusConfig.PENDING;

  async function handleApprove() {
    setLoading(true);
    const res = await fetch(`/api/milestones/${milestone.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freelancerId }),
    });

    if (res.ok) {
      showSuccess("Milestone approved", "Payment released to freelancer.");
      window.location.reload();
    } else {
      const data = await res.json();
      showError("Failed to approve", data.error);
    }
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    const res = await fetch(`/api/milestones/${milestone.id}/reject`, {
      method: "POST",
    });

    if (res.ok) {
      showSuccess("Milestone rejected", "Freelancer will be notified.");
      window.location.reload();
    } else {
      showError("Failed to reject", "Please try again.");
    }
    setLoading(false);
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm font-mono w-6">
              {milestone.order}
            </span>
            <div>
              <p className="text-white font-medium">{milestone.title}</p>
              <p className="text-gray-400 text-xs">
                Due {formatDate(milestone.deadline)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-semibold">
              {formatCurrency(milestone.amount)}
            </span>
            <Badge variant="outline" className={config.color}>
              <span className="flex items-center gap-1">
                {config.icon}
                {config.label}
              </span>
            </Badge>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
            <p className="text-gray-300 text-sm">{milestone.description}</p>

            {milestone.proofOfWorkUrl && (
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Proof of Work</p>
                <a
                  href={milestone.proofOfWorkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 text-sm hover:underline break-all"
                >
                  {milestone.proofOfWorkUrl}
                </a>
                {milestone.proofNotes && (
                  <p className="text-gray-300 text-sm mt-2">
                    {milestone.proofNotes}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {isFreelancer && milestone.status === "PENDING" && (
                <Link
                  href={`/projects/${projectId}/submit?milestone=${milestone.id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Milestone
                  </Button>
                </Link>
              )}

              {isFreelancer && milestone.status === "REJECTED" && (
                <Link
                  href={`/projects/${projectId}/submit?milestone=${milestone.id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                    Resubmit Milestone
                  </Button>
                </Link>
              )}

              {isRecruiter && milestone.status === "SUBMITTED" && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve + Release Payment
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 border-red-800 text-red-400 hover:bg-red-900/20"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}