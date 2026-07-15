import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY ?? ""
);

interface RecoveryBriefInput {
  projectTitle: string;
  projectDescription: string;
  completionPercent: number;
  milestones: Array<{
    title: string;
    description: string;
    amount: number;
    status: string;
    order: number;
  }>;
  dossierEntries: Array<{
    completedWork: string;
    remainingWork: string;
    technicalNotes?: string | null;
    knownIssues?: string | null;
    nextSteps?: string | null;
    filesAndAccess?: string | null;
    author: { name: string };
    milestone?: { title: string; order: number } | null;
    createdAt: Date;
  }>;
  remainingBudget: number;
}

export async function generateRecoveryBrief(
  input: RecoveryBriefInput
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const approvedMilestones = input.milestones.filter(
    (m) => m.status === "APPROVED"
  );
  const remainingMilestones = input.milestones.filter(
    (m) => m.status !== "APPROVED"
  );

  const dossierText =
    input.dossierEntries.length > 0
      ? input.dossierEntries
          .map(
            (d) => `
--- Dossier Entry (${d.milestone ? `Milestone: ${d.milestone.title}` : "General"}) ---
Author: ${d.author.name}
Date: ${new Date(d.createdAt).toLocaleDateString()}

COMPLETED WORK:
${d.completedWork}

REMAINING WORK:
${d.remainingWork}

${d.technicalNotes ? `TECHNICAL NOTES:\n${d.technicalNotes}` : ""}
${d.knownIssues ? `KNOWN ISSUES:\n${d.knownIssues}` : ""}
${d.nextSteps ? `NEXT STEPS:\n${d.nextSteps}` : ""}
${d.filesAndAccess ? `FILES AND ACCESS:\n${d.filesAndAccess}` : ""}
          `.trim()
          )
          .join("\n\n")
      : "No dossier entries were left by the previous freelancer.";

  const prompt = `
You are a technical project handoff assistant. A freelancer has abandoned a project and a backup freelancer needs to pick it up. Generate a clear, structured Recovery Brief that will help the new freelancer understand exactly where things stand and what they need to do.

PROJECT: ${input.projectTitle}
DESCRIPTION: ${input.projectDescription}
COMPLETION: ${input.completionPercent}%
REMAINING BUDGET: ₹${input.remainingBudget}

COMPLETED MILESTONES (${approvedMilestones.length}):
${approvedMilestones.map((m) => `- ${m.title}: ${m.description}`).join("\n") || "None"}

REMAINING MILESTONES (${remainingMilestones.length}):
${remainingMilestones.map((m) => `- Milestone ${m.order}: ${m.title} (₹${m.amount})\n  ${m.description}`).join("\n") || "None"}

DOSSIER FROM PREVIOUS FREELANCER:
${dossierText}

Generate a Recovery Brief with these sections:
1. **Project Summary** — What this project is and its current state
2. **What Has Been Done** — Summarise completed work clearly
3. **What Needs To Be Done** — Remaining milestones and work, in order
4. **Technical Context** — Stack, architecture decisions, important notes
5. **Known Issues and Blockers** — Problems the previous freelancer documented
6. **Files and Access** — Where to find the code, credentials, resources
7. **Recommended Starting Point** — First thing the new freelancer should do
8. **Budget Breakdown** — Remaining milestones and their payment amounts

Be direct, practical and specific. This will be read by a freelancer who knows nothing about this project.
  `.trim();

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function summarizeDossierEntry(data: {
  completedWork: string;
  remainingWork: string;
  technicalNotes?: string;
  knownIssues?: string;
  nextSteps?: string;
  filesAndAccess?: string;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
Summarize this project dossier entry in 2-3 concise sentences. Focus on the most important progress made and what is still needed.

COMPLETED:
${data.completedWork}

REMAINING:
${data.remainingWork}

${data.technicalNotes ? `TECHNICAL NOTES: ${data.technicalNotes}` : ""}
${data.knownIssues ? `ISSUES: ${data.knownIssues}` : ""}
  `.trim();

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}