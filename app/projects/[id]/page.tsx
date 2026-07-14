import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProjectById } from "@/services/project.service";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MilestoneCard from "@/components/projects/milestone-card";
import ApplicationCard from "@/components/projects/application-card";
import {
  Calendar,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { formatCurrency, formatDate, getCreditTier } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await getProjectById(id);
  if (!project) notFound();

  const isRecruiter = user.id === project.recruiterId;
  const isFreelancer = user.id === project.freelancerId;
  const canView = isRecruiter || isFreelancer || user.role === "ADMIN";

  if (!canView && project.status !== "OPEN") {
    redirect("/projects/browse");
  }

  const hasApplied = project.applications.some(
    (a) => a.freelancerId === user.id
  );

  const tier = getCreditTier(user.creditBalance);
  const canApply =
    user.role === "FREELANCER" &&
    project.status === "OPEN" &&
    !hasApplied &&
    !isFreelancer;

  const completedMilestones = project.milestones.filter(
    (m) => m.status === "APPROVED"
  ).length;
  const progressPercent =
    project.milestones.length > 0
      ? Math.round((completedMilestones / project.milestones.length) * 100)
      : 0;

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    COMPLETED: "bg-green-500/10 text-green-400 border-green-500/30",
    CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    DISPUTED: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={
              isRecruiter
                ? "/dashboard/recruiter"
                : user.role === "FREELANCER"
                ? "/projects/browse"
                : "/admin"
            }
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">{project.title}</h1>
          <Badge variant="outline" className={statusColors[project.status]}>
            {project.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Project Info */}
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <p className="text-gray-300 leading-relaxed">
                  {project.description}
                </p>

                <Separator className="my-4 bg-gray-800" />

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.requiredSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Budget</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(project.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Deadline</p>
                    <p className="text-white font-semibold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.deadline)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Posted by</p>
                    <p className="text-white font-semibold">
                      {project.recruiter.name}
                    </p>
                  </div>
                </div>

                {project.status === "IN_PROGRESS" && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {completedMilestones}/{project.milestones.length}{" "}
                        milestones
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Milestones */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                Milestones ({project.milestones.length})
              </h2>
              <div className="space-y-3">
                {project.milestones.map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    isFreelancer={isFreelancer}
                    isRecruiter={isRecruiter}
                    projectId={project.id}
                    freelancerId={project.freelancerId ?? ""}
                  />
                ))}
              </div>
            </div>

            {/* Applications */}
            {isRecruiter && project.applications.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-3">
                  Applications ({project.applications.length})
                </h2>
                <div className="space-y-3">
                  {project.applications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      projectStatus={project.status}
                      projectAmount={project.totalAmount}
                      recruiterWalletBalance={user.walletBalance}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {canApply && (
              <Card className="bg-gray-900 border-yellow-400/30">
                <CardContent className="p-4">
                  <h3 className="text-white font-semibold mb-2">
                    Apply for this Project
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    A {tier.stakePercent}% credit stake will be required if you
                    are hired.
                  </p>
                  <Link href={`/projects/${id}/apply`}>
                    <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                      Apply Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {hasApplied && !isFreelancer && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 text-center">
                  <p className="text-green-400 font-semibold">
                    ✓ Application Submitted
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Waiting for recruiter response.
                  </p>
                </CardContent>
              </Card>
            )}

            {(isRecruiter || isFreelancer) &&
              project.status === "IN_PROGRESS" && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 space-y-2">
                    <Link href={`/projects/${project.id}/messages`}>
                      <Button
                        variant="outline"
                        className="w-full border-gray-700 text-white hover:bg-gray-800"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Project Chat
                      </Button>
                    </Link>
                    {isRecruiter &&
                      project.status !== "COMPLETED" &&
                      project.status !== "DISPUTED" && (
                        <Link href={`/disputes/new/${project.id}`}>
                          <Button
                            variant="outline"
                            className="w-full border-red-800 text-red-400 hover:bg-red-900/20 mt-2"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Raise Dispute
                          </Button>
                        </Link>
                      )}
                  </CardContent>
                </Card>
              )}

            {project.freelancer && (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <h3 className="text-gray-400 text-sm mb-2">
                    Assigned Freelancer
                  </h3>
                  <Link href={`/freelancer/${project.freelancer.id}`}>
                    <div className="flex items-center gap-3 hover:opacity-80">
                      <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <span className="text-yellow-400 font-bold text-sm">
                          {project.freelancer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {project.freelancer.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {project.freelancer.creditBalance} credits
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}