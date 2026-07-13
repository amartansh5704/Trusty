import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProjectsByRecruiter } from "@/services/project.service";
import { getRecruiterStats } from "@/services/user.service";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FolderOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function RecruiterDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "RECRUITER") redirect("/dashboard/freelancer");

  const [projects, stats] = await Promise.all([
    getProjectsByRecruiter(user.id),
    getRecruiterStats(user.id),
  ]);

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    COMPLETED: "bg-green-500/10 text-green-400 border-green-500/30",
    CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    DISPUTED: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <DashboardLayout user={user}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.name}
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your projects and freelancers.
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Post New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, icon: FolderOpen, color: "text-gray-400" },
          { label: "Open", value: stats.open, icon: FolderOpen, color: "text-blue-400" },
          { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-yellow-400" },
          { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-400" },
          { label: "Disputed", value: stats.disputed, icon: AlertTriangle, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 text-center">
              <Icon className={`h-6 w-6 ${color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-400 text-xs">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Your Projects</h2>

      {projects.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No projects yet
            </h3>
            <p className="text-gray-400 mb-6">
              Post your first project and start hiring with escrow protection.
            </p>
            <Link href="/projects/new">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                Post Your First Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const completedMilestones = project.milestones.filter(
              (m) => m.status === "APPROVED"
            ).length;

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {project.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={statusColors[project.status]}
                          >
                            {project.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-gray-400">
                            Budget:{" "}
                            <span className="text-white font-medium">
                              {formatCurrency(project.totalAmount)}
                            </span>
                          </span>
                          <span className="text-gray-400">
                            Milestones:{" "}
                            <span className="text-white font-medium">
                              {completedMilestones}/{project.milestones.length}
                            </span>
                          </span>
                          <span className="text-gray-400">
                            Applications:{" "}
                            <span className="text-white font-medium">
                              {project.applications.length}
                            </span>
                          </span>
                          {project.freelancer && (
                            <span className="text-gray-400">
                              Freelancer:{" "}
                              <span className="text-yellow-400 font-medium">
                                {project.freelancer.name}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">
                        {formatDate(project.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}