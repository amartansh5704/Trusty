"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, Ghost } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

interface GhostAlertButtonProps {
  projectId: string;
  freelancerName: string;
}

export default function GhostAlertButton({
  projectId,
  freelancerName,
}: GhostAlertButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertRaised, setAlertRaised] = useState(false);
  const [alertStatus, setAlertStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingAlert();
  }, []);

  async function checkExistingAlert() {
    try {
      const res = await fetch(`/api/projects/${projectId}/ghost-alert`);
      if (res.ok) {
        const data = await res.json();
        if (data.alert) {
          setAlertRaised(true);
          setAlertStatus(data.alert.status);
        }
      }
    } catch {} finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/ghost-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() || undefined }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess(
        "Ghost Alert Sent",
        "Admin has been notified and will review the situation."
      );
      setAlertRaised(true);
      setAlertStatus("RAISED");
      setDialogOpen(false);
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }

    setLoading(false);
  }

  if (checking) return null;

  if (alertRaised) {
    const statusText: Record<string, string> = {
      RAISED: "Ghost Alert Sent — Under Review",
      CONFIRMED: "Ghost Confirmed — Relay In Progress",
      DISMISSED: "Ghost Alert Dismissed",
    };

    const statusColor: Record<string, string> = {
      RAISED: "border-orange-800 text-orange-400",
      CONFIRMED: "border-red-800 text-red-400",
      DISMISSED: "border-gray-700 text-gray-400",
    };

    return (
      <Button
        disabled
        variant="outline"
        className={`w-full ${statusColor[alertStatus ?? "RAISED"]} mt-2`}
      >
        <Ghost className="h-4 w-4 mr-2" />
        {statusText[alertStatus ?? "RAISED"]}
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant="outline"
        className="w-full border-orange-800 text-orange-400 hover:bg-orange-900/20 mt-2"
      >
        <Ghost className="h-4 w-4 mr-2" />
        Ghost Alert
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Raise Ghost Alert
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-sm">
                You are reporting that{" "}
                <span className="font-semibold text-white">
                  {freelancerName}
                </span>{" "}
                may have gone unresponsive. Admin will be notified
                immediately and will investigate.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-gray-300">
                  Additional Details{" "}
                  <span className="text-gray-500">(optional)</span>
                </Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Last heard from them 5 days ago, missed deadline..."
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold"
                >
                  {loading ? "Sending..." : "Send Ghost Alert"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}