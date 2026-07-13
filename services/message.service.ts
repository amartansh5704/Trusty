import { prisma } from "@/lib/prisma";

export async function sendMessage(data: {
  projectId: string;
  senderId: string;
  content: string;
}) {
  return prisma.message.create({
    data,
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });
}

export async function getMessages(projectId: string) {
  return prisma.message.findMany({
    where: { projectId },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function markMessagesRead(
  projectId: string,
  userId: string
) {
  return prisma.message.updateMany({
    where: {
      projectId,
      read: false,
      senderId: { not: userId },
    },
    data: { read: true },
  });
}