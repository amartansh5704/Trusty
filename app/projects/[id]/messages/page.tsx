"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { showError } from "@/lib/toast";
import { formatDateTime } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

type Message = {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

export default function MessagesPage() {
  const { user, loading } = useUser();
  const params = useParams();
  const projectId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [content, setContent] = useState("");
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && user) {
      loadData();
      // Poll every 5 seconds for new messages
      pollRef.current = setInterval(loadMessages, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loading, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function loadData() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectTitle(data.project.title);
      }
    } catch {}
    await loadMessages();
    setFetching(false);
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/messages?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch {}
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, content: content.trim() }),
    });

    let data: any = {};
    try { data = await res.json(); } catch {}

    if (res.ok) {
      setContent("");
      await loadMessages();
    } else {
      showError("Failed to send", data.error ?? "Something went wrong.");
    }
    setSending(false);
  }

  if (loading || fetching) return null;
  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Project Chat</h1>
            <p className="text-gray-400 text-sm">{projectTitle}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-1">No messages yet</p>
                <p className="text-gray-600 text-sm">
                  Start the conversation about your project.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMe = msg.sender.id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      {!isMe && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
                            <span className="text-yellow-400 text-xs font-bold">
                              {msg.sender.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-gray-400 text-xs">{msg.sender.name}</span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-yellow-400 text-black rounded-tr-sm"
                            : "bg-gray-800 text-white rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-gray-600 text-xs px-1">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex gap-3 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-3"
        >
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-yellow-400 text-black hover:bg-yellow-300 font-semibold h-9 w-9 p-0 rounded-lg flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}