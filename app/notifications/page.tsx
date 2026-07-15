"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { showSuccess } from "@/lib/toast";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const { user, loading } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fetching, setFetching] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!loading && user) loadNotifications();
  }, [loading, user]);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {} finally {
      setFetching(false);
    }
  }

  async function markAllRead() {
    setMarking(true);
    const res = await fetch("/api/notifications", { method: "POST" });
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showSuccess("Done", "All notifications marked as read.");
    }
    setMarking(false);
  }

  if (loading || fetching) return null;
  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={markAllRead}
              disabled={marking}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {marking ? "Marking..." : "Mark All Read"}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-400">
                You will be notified about project updates, payments, and messages.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border transition-colors ${
                  notification.read
                    ? "bg-gray-900 border-gray-800"
                    : "bg-gray-900 border-yellow-400/20"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.read ? "bg-gray-600" : "bg-yellow-400"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">
                          {notification.title}
                        </p>
                        <p className="text-gray-400 text-sm mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    {notification.link && (
                      <Link href={notification.link}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white flex-shrink-0"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
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