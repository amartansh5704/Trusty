import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getOpenProjects } from "@/services/project.service";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Calendar,
  Users,
  ArrowRight,
  Search,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function BrowseProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; skill?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FREELANCER") redirect("/dashboard/recruiter");

  const { search, skill } = await searchParams;

  const projects = await getOpenProjects(search, skill);

  return (
    <DashboardLayout user={user}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Find Work</h1>
        <p className="text-gray-400 mt-1">
          Browse open projects and apply with your credit stake.
        </p>
      </div>

      <form method="GET" className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search projects..."
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-yellow-400"
          />
        </div>
        <input
          name="skill"
          defaultValue={skill}
          placeholder="Filter by skill..."
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-400 w-48"
        />
        <Button
          type="submit"
          className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold"
        >
          Search
        </Button>
      </form>

      {projects.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No projects found
            </h3>
            <p className="text-gray-400">
              {search || skill
                ? "Try a different search or clear filters."
                : "No open projects right now. Check back soon."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const totalMilestones = project.milestones.length;
            const applicantCount = project.applications.length;

            return (
              <Card
                key={project.id}
                className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1">
                            {project.title}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            by {project.recruiter.name}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-yellow-400 whitespace-nowrap">
                          {formatCurrency(project.totalAmount)}
                        </span>
                      </div>

                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>

                      {project.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.requiredSkills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="border-gray-600 text-gray-300 text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {totalMilestones} milestone
                          {totalMilestones !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {applicantCount} applicant
                          {applicantCount !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due {formatDate(project.deadline)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Link href={`/projects/${project.id}`}>
                        <Button className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold whitespace-nowrap">
                          View Project
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}