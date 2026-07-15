import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getNotifications, markAllRead, getUnreadCount } from "@/services/notification.service";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countOnly = searchParams.get("count") === "true";

    if (countOnly) {
      const count = await getUnreadCount(user.id);
      return NextResponse.json({ count });
    }

    const notifications = await getNotifications(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markAllRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }
}