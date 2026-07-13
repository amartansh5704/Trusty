import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Wallet,
  Coins,
  Clock,
  FolderOpen,
  Star,
} from "lucide-react";
import { formatCurrency, formatDate, getCreditTier } from "@/lib/utils";

export default async function FreelancerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FREELANCER") redirect("/dashboard/recruiter");

  const projects = await prisma.project.findMany({
    where: { freelancerId: user.id },
    include: {
      recruiter: true,
      milestones: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingApplications = await prisma.application.count({
    where: { freelancerId: user.id, status: "PENDING" },
  });

  const reviews = await prisma.review.findMany({
    where: { receiverId: user.id },
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const tier = getCreditTier(user.creditBalance);

  const stats = {
    activeProjects: projects.filter((p) => p.status === "IN_PROGRESS").length,
    completedProjects: projects.filter((p) => p.status === "COMPLETED").length,
    totalEarned: projects
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.totalAmount, 0),
  };

  const tierColors: Record<string, string> = {
    Starter: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    Reliable: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    Trusted: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Elite: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  };

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
            Find work, deliver projects, build your reputation.
          </p>
        </div>
        <Link href="/projects/browse">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
            <Search className="h-4 w-4 mr-2" />
            Find Work
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <Coins className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {user.creditBalance}
            </p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Badge variant="outline" className={tierColors[tier.tier]}>
                {tier.tier}
              </Badge>
            </div>
            <p className="text-gray-400 text-xs mt-1">Credits</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <Wallet className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {formatCurrency(user.walletBalance)}
            </p>
            <p className="text-gray-400 text-xs mt-1">Wallet</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {stats.activeProjects}
            </p>
            <p className="text-gray-400 text-xs mt-1">Active Projects</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </p>
            <p className="text-gray-400 text-xs mt-1">Avg Rating</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Earned</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(stats.totalEarned)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Projects Completed</p>
            <p className="text-xl font-bold text-white">
              {stats.completedProjects}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Pending Applications</p>
            <p className="text-xl font-bold text-white">
              {pendingApplications}
            </p>
          </CardContent>
        </Card>
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
              Browse open projects and apply to start earning.
            </p>
            <Link href="/projects/browse">
              <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold">
                Browse Projects
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
            const totalMilestones = project.milestones.length;

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
                        <p className="text-gray-400 text-sm mb-3">
                          by {project.recruiter.name}
                        </p>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-gray-400">
                            Budget:{" "}
                            <span className="text-white font-medium">
                              {formatCurrency(project.totalAmount)}
                            </span>
                          </span>
                          <span className="text-gray-400">
                            Progress:{" "}
                            <span className="text-white font-medium">
                              {completedMilestones}/{totalMilestones} milestones
                            </span>
                          </span>
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