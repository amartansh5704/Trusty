"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";

type Milestone = {
  title: string;
  description: string;
  amount: string;
  deadline: string;
};

export default function NewProjectPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([
    { title: "", description: "", amount: "", deadline: "" },
  ]);

  function addMilestone() {
    setMilestones([
      ...milestones,
      { title: "", description: "", amount: "", deadline: "" },
    ]);
  }

  function removeMilestone(index: number) {
    if (milestones.length === 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  }

  function updateMilestone(
    index: number,
    field: keyof Milestone,
    value: string
  ) {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  }

  const milestonesTotal = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  );
  const projectTotal = parseFloat(totalAmount) || 0;
  const amountsMatch = Math.abs(milestonesTotal - projectTotal) < 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (milestones.some((m) => !m.title || !m.amount || !m.deadline)) {
      showError("Incomplete milestones", "Fill in all milestone fields.");
      return;
    }

    if (!amountsMatch) {
      showError(
        "Amount mismatch",
        `Milestone total (₹${milestonesTotal}) must equal project budget (₹${projectTotal}).`
      );
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        totalAmount: parseFloat(totalAmount),
        deadline,
        requiredSkills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        milestones,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError("Failed to create project", data.error);
      setSubmitting(false);
      return;
    }

    showSuccess("Project created", "Your project is now live.");
    router.push(`/projects/${data.project.id}`);
  }

  if (loading) return null;
  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/recruiter">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Post a Project</h1>
            <p className="text-gray-400 mt-1">
              Define your project and milestones. Payment goes into escrow on
              hire.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Project Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Build a React dashboard with authentication"
                  required
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the project in detail. What needs to be built, what tech stack, any specific requirements..."
                  required
                  rows={5}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Total Budget (₹)</Label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="15000"
                    required
                    min="1"
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Project Deadline</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">
                  Required Skills (comma separated)
                </Label>
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="React, Node.js, PostgreSQL, Tailwind"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Milestones</CardTitle>
                  <p className="text-gray-400 text-sm mt-1">
                    Break your project into deliverable chunks. Payment releases
                    per milestone.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addMilestone}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="border border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 text-sm font-semibold">
                      Milestone {index + 1}
                    </span>
                    {milestones.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(index)}
                        className="text-red-400 hover:text-red-300 h-6 w-6"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-300 text-sm">Title</Label>
                    <Input
                      value={milestone.title}
                      onChange={(e) =>
                        updateMilestone(index, "title", e.target.value)
                      }
                      placeholder="Design and setup database schema"
                      required
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300 text-sm">Description</Label>
                    <Textarea
                      value={milestone.description}
                      onChange={(e) =>
                        updateMilestone(index, "description", e.target.value)
                      }
                      placeholder="What exactly needs to be delivered for this milestone..."
                      rows={2}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300 text-sm">
                        Amount (₹)
                      </Label>
                      <Input
                        type="number"
                        value={milestone.amount}
                        onChange={(e) =>
                          updateMilestone(index, "amount", e.target.value)
                        }
                        placeholder="5000"
                        required
                        min="1"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Deadline</Label>
                      <Input
                        type="date"
                        value={milestone.deadline}
                        onChange={(e) =>
                          updateMilestone(index, "deadline", e.target.value)
                        }
                        required
                        min={new Date().toISOString().split("T")[0]}
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  amountsMatch || !totalAmount
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <span className="text-sm text-gray-300">
                  Milestones Total:{" "}
                  <span className="font-semibold text-white">
                    ₹{milestonesTotal}
                  </span>
                </span>
                <span className="text-sm text-gray-300">
                  Project Budget:{" "}
                  <span className="font-semibold text-white">
                    ₹{projectTotal || 0}
                  </span>
                </span>
                <span
                  className={`text-sm font-semibold ${
                    amountsMatch || !totalAmount
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {amountsMatch || !totalAmount ? "✓ Balanced" : "✗ Mismatch"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold py-3 text-lg"
          >
            {submitting ? "Creating Project..." : "Post Project"}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}