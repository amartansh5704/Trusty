import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateRecoveryBrief(projectData: {
  projectTitle: string;
  projectDescription: string;
  completedMilestones: Array<{
    title: string;
    description: string;
    stateDoc: {
      completedWork: string;
      remainingWork: string;
      technicalNotes?: string | null;
      knownIssues?: string | null;
      nextSteps?: string | null;
    } | null;
  }>;
  remainingMilestones: Array<{
    title: string;
    description: string;
    amount: number;
  }>;
  remainingBudget: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
You are a project handover specialist. A freelancer has abandoned a project midway.
Generate a clean, professional Recovery Brief for a backup freelancer to pick up this project.

PROJECT: ${projectData.projectTitle}
DESCRIPTION: ${projectData.projectDescription}

COMPLETED WORK:
${projectData.completedMilestones
  .map(
    (m) => `
Milestone: ${m.title}
${m.stateDoc ? `Completed: ${m.stateDoc.completedWork}` : "No state doc"}
${m.stateDoc?.technicalNotes ? `Technical Notes: ${m.stateDoc.technicalNotes}` : ""}
${m.stateDoc?.knownIssues ? `Known Issues: ${m.stateDoc.knownIssues}` : ""}
`
  )
  .join("\n")}

REMAINING WORK:
${projectData.remainingMilestones.map((m) => `- ${m.title}: ${m.description} (₹${m.amount})`).join("\n")}

REMAINING BUDGET: ₹${projectData.remainingBudget}

Write the Recovery Brief in clear sections:
1. Project Status Summary
2. What Has Been Done
3. What Needs To Be Done
4. Technical Context and Known Issues
5. Recommended Starting Point
6. Budget Available

Be concise, practical, and helpful for a new freelancer starting immediately.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function summarizeStateDocument(stateDoc: {
  completedWork: string;
  remainingWork: string;
  technicalNotes?: string;
  knownIssues?: string;
  nextSteps?: string;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
Summarize this project state document into 3-4 clean bullet points that capture the essential handover information.

Completed Work: ${stateDoc.completedWork}
Remaining Work: ${stateDoc.remainingWork}
Technical Notes: ${stateDoc.technicalNotes || "None"}
Known Issues: ${stateDoc.knownIssues || "None"}
Next Steps: ${stateDoc.nextSteps || "None"}

Return only the bullet points, no headers.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}