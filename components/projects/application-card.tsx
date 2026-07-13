"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, CheckCircle } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { getCreditTier } from "@/lib/utils";
import Link from "next/link";

type Application = {
  id: string;
  coverLetter: string;
  proposedAmount: number | null;
  status: string;
  freelancer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creditBalance: number;
    skills: string[];
    totalProjectsCompleted: number;
  };
};

interface ApplicationCardProps {
  application: Application;
  projectStatus: string;
}

export default function ApplicationCard({
  application,
  projectStatus,
}: ApplicationCardProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(
    application.status === "ACCEPTED"
  );

  const tier = getCreditTier(application.freelancer.creditBalance);

  const tierColors: Record<string, string> = {
    Starter: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    Reliable: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Trusted: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Elite: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  };

  async function handleAccept() {
    setLoading(true);
    const res = await fetch(`/api/applications/${application.id}/accept`, {
      method: "POST",
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess(
        "Application accepted",
        `${application.freelancer.name} has been hired.`
      );
      setAccepted(true);
      window.location.reload();
    } else {
      showError("Failed to accept", data.error);
    }
    setLoading(false);
  }

  return (
    <Card
      className={`bg-gray-900 border-gray-800 ${
        accepted ? "border-green-800" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
              <span className="text-yellow-400 font-bold text-sm">
                {application.freelancer.name.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/freelancer/${application.freelancer.id}`}>
                  <span className="text-white font-semibold hover:text-yellow-400">
                    {application.freelancer.name}
                  </span>
                </Link>
                <Badge
                  variant="outline"
                  className={tierColors[tier.tier]}
                >
                  {tier.tier}
                </Badge>
                {accepted && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-400 border-green-500/30"
                  >
                    Hired
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-yellow-400" />
                  {application.freelancer.creditBalance} credits
                </span>
                <span>
                  {application.freelancer.totalProjectsCompleted} projects
                  completed
                </span>
              </div>

              {application.freelancer.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {application.freelancer.skills.slice(0, 5).map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="border-gray-700 text-gray-400 text-xs"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-gray-300 text-sm">{application.coverLetter}</p>
            </div>
          </div>

          {projectStatus === "OPEN" && !accepted && (
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold flex-shrink-0"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {loading ? "Hiring..." : "Accept"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}