"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Plus,
  Clock,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

type DossierEntry = {
  id: string;
  completedWork: string;
  remainingWork: string;
  technicalNotes: string | null;
  knownIssues: string | null;
  nextSteps: string | null;
  filesAndAccess: string | null;
  aiSummary: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
  milestone: { id: string; title: string; order: number } | null;
};

type Milestone = {
  id: string;
  title: string;
  order: number;
  status: string;
};

export default function DossierPage() {
  const { user, loading } = useUser();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [dossiers, setDossiers] = useState<DossierEntry[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [isFreelancerOnProject, setIsFreelancerOnProject] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [completedWork, setCompletedWork] = useState("");
  const [remainingWork, setRemainingWork] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [filesAndAccess, setFilesAndAccess] = useState("");

  useEffect(() => {
    if (!loading && user) loadData();
  }, [loading, user]);

  async function loadData() {
    try {
      const [dossierRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/dossier`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (dossierRes.ok) {
        const d = await dossierRes.json();
        setDossiers(d.dossiers);
      }

      if (projectRes.ok) {
        const p = await projectRes.json();
        setProjectTitle(p.project.title);
        setMilestones(p.project.milestones);
        setIsFreelancerOnProject(p.project.freelancerId === user?.id);
      }
    } catch {
      showError("Error", "Failed to load dossier data.");
    } finally {
      setFetching(false);
    }
  }

  function resetForm() {
    setSelectedMilestone("");
    setCompletedWork("");
    setRemainingWork("");
    setTechnicalNotes("");
    setKnownIssues("");
    setNextSteps("");
    setFilesAndAccess("");
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!completedWork.trim() || !remainingWork.trim()) {
      showError("Missing fields", "Completed work and remaining work are required.");
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/projects/${projectId}/dossier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestoneId: selectedMilestone || undefined,
        completedWork: completedWork.trim(),
        remainingWork: remainingWork.trim(),
        technicalNotes: technicalNotes.trim() || undefined,
        knownIssues: knownIssues.trim() || undefined,
        nextSteps: nextSteps.trim() || undefined,
        filesAndAccess: filesAndAccess.trim() || undefined,
      }),
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {}

    if (res.ok) {
      showSuccess("Dossier updated", "Your project state has been recorded.");
      resetForm();
      loadData();
    } else {
      showError("Failed", data.error ?? "Something went wrong.");
    }

    setSubmitting(false);
  }

  if (loading || fetching) return null;
  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
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
              <h1 className="text-2xl font-bold text-white">Project Dossier</h1>
              <p className="text-gray-400 text-sm mt-0.5">{projectTitle}</p>
            </div>
          </div>

          {isFreelancerOnProject && !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Update Dossier
            </Button>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-gray-900 border-yellow-400/20 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-white font-medium mb-1">
                  What is a Project Dossier?
                </h3>
                <p className="text-gray-400 text-sm">
                  The dossier is a running record of your project's state.
                  Update it at each milestone with what you've completed,
                  what remains, technical decisions, and file locations.
                  If the project ever needs to be handed off, this is what
                  the next freelancer reads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Dossier Form */}
        {showForm && (
          <Card className="bg-gray-900 border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-yellow-400" />
                New Dossier Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Milestone selector */}
                {milestones.length > 0 && (
                  <div>
                    <Label className="text-gray-300">
                      Related Milestone{" "}
                      <span className="text-gray-500">(optional)</span>
                    </Label>
                    <select
                      value={selectedMilestone}
                      onChange={(e) => setSelectedMilestone(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">General update (no specific milestone)</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          Milestone {m.order}: {m.title} ({m.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Completed Work */}
                <div>
                  <Label className="text-gray-300">
                    What has been completed{" "}
                    <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    value={completedWork}
                    onChange={(e) => setCompletedWork(e.target.value)}
                    placeholder="Describe all work completed so far. Be specific — mention features built, APIs created, pages done, etc."
                    required
                    rows={4}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Remaining Work */}
                <div>
                  <Label className="text-gray-300">
                    What remains to be done{" "}
                    <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    value={remainingWork}
                    onChange={(e) => setRemainingWork(e.target.value)}
                    placeholder="List all remaining tasks. What milestones are left? What features still need to be built?"
                    required
                    rows={4}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Technical Notes */}
                <div>
                  <Label className="text-gray-300">
                    Technical Notes{" "}
                    <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Textarea
                    value={technicalNotes}
                    onChange={(e) => setTechnicalNotes(e.target.value)}
                    placeholder="Tech stack used, architecture decisions, database structure, deployment setup, etc."
                    rows={3}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Known Issues */}
                <div>
                  <Label className="text-gray-300">
                    Known Issues & Blockers{" "}
                    <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Textarea
                    value={knownIssues}
                    onChange={(e) => setKnownIssues(e.target.value)}
                    placeholder="Any bugs, blockers, API limitations, or problems encountered."
                    rows={3}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Next Steps */}
                <div>
                  <Label className="text-gray-300">
                    Recommended Next Steps{" "}
                    <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    placeholder="If someone else picks this up, what should they do first?"
                    rows={3}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                {/* Files and Access */}
                <div>
                  <Label className="text-gray-300">
                    Files, Repos & Access Info{" "}
                    <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Textarea
                    value={filesAndAccess}
                    onChange={(e) => setFilesAndAccess(e.target.value)}
                    placeholder="GitHub repo URLs, hosting credentials, API keys location, Figma links, Google Drive folders, etc."
                    rows={3}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
                  >
                    {submitting ? "Saving..." : "Save Dossier Entry"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dossier History */}
        <h2 className="text-lg font-bold text-white mb-4">
          Dossier History ({dossiers.length})
        </h2>

        {dossiers.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No dossier entries yet
              </h3>
              <p className="text-gray-400">
                {isFreelancerOnProject
                  ? "Start documenting your project progress. Click 'Update Dossier' above."
                  : "The freelancer has not submitted any dossier entries yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {dossiers.map((entry) => (
              <Card key={entry.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <span className="text-yellow-400 font-bold text-xs">
                          {entry.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {entry.author.name}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    {entry.milestone && (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                      >
                        Milestone {entry.milestone.order}: {entry.milestone.title}
                      </Badge>
                    )}
                  </div>

                  {/* AI Summary */}
                  {entry.aiSummary && (
                    <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 mb-4">
                      <p className="text-yellow-400 text-xs font-semibold mb-1">
                        AI Summary
                      </p>
                      <p className="text-gray-300 text-sm">{entry.aiSummary}</p>
                    </div>
                  )}

                  {/* Sections */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-green-400 text-xs font-semibold mb-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed Work
                      </p>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {entry.completedWork}
                      </p>
                    </div>

                    <div>
                      <p className="text-orange-400 text-xs font-semibold mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Remaining Work
                      </p>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {entry.remainingWork}
                      </p>
                    </div>

                    {entry.technicalNotes && (
                      <div>
                        <p className="text-blue-400 text-xs font-semibold mb-1">
                          Technical Notes
                        </p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {entry.technicalNotes}
                        </p>
                      </div>
                    )}

                    {entry.knownIssues && (
                      <div>
                        <p className="text-red-400 text-xs font-semibold mb-1">
                          Known Issues
                        </p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {entry.knownIssues}
                        </p>
                      </div>
                    )}

                    {entry.nextSteps && (
                      <div>
                        <p className="text-purple-400 text-xs font-semibold mb-1">
                          Next Steps
                        </p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {entry.nextSteps}
                        </p>
                      </div>
                    )}

                    {entry.filesAndAccess && (
                      <div>
                        <p className="text-yellow-400 text-xs font-semibold mb-1">
                          Files & Access
                        </p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {entry.filesAndAccess}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}