"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type RelayProject = {
  id: string;
  order: number;
  status: string;
  project: {
    id: string;
    title: string;
    totalAmount: number;
  };
};

interface RelayPendingSectionProps {
  userId: string;
}

export default function RelayPendingSection({
  userId,
}: RelayPendingSectionProps) {
  const [relayProjects, setRelayProjects] = useState<RelayProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelayProjects();
  }, []);

  async function loadRelayProjects() {
    try {
      const res = await fetch("/api/relay/pending");
      if (res.ok) {
        const data = await res.json();
        setRelayProjects(data.relaySlots);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  if (loading) return null;
  if (relayProjects.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        Projects Awaiting Your Response
      </h2>
      <div className="space-y-3">
        {relayProjects.map((slot) => (
          <Card
            key={slot.id}
            className="bg-gray-900 border-orange-400/20 hover:border-orange-400/40 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-400/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-lg">
                        {slot.project.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="bg-orange-500/10 text-orange-400 border-orange-500/30"
                      >
                        Relay — Backup #{slot.order}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">
                      The previous freelancer has left this project. Review
                      the recovery brief and decide if you want to take
                      over.
                    </p>
                    <p className="text-yellow-400 font-semibold mt-1">
                      Budget: {formatCurrency(slot.project.totalAmount)}
                    </p>
                  </div>
                </div>
                <Link href={`/projects/${slot.project.id}/recovery`}>
                  <Button className="bg-orange-500 hover:bg-orange-400 text-white font-semibold">
                    Review Brief
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}