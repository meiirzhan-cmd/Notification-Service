"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationStore } from "@/stores/notification";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./DashboardCard";

const DEMO_USER_ID = "demo-user-001";

export function AdminSendPanel() {
  const sendNotification = useNotificationStore((s) => s.sendNotification);
  const refresh = useNotificationStore((s) => s.refresh);
  const [isSending, setIsSending] = useState(false);
  const [type, setType] = useState<"email" | "push" | "in-app">("in-app");
  const [category, setCategory] = useState("updates");
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState(
    "This is a test notification from the admin dashboard.",
  );

  const handleSend = async () => {
    setIsSending(true);
    try {
      const notification = await sendNotification({
        userId: DEMO_USER_ID,
        type,
        title,
        body,
        category: category as "updates",
      });
      if (notification) {
        console.log("Sent:", notification.id);
        // Re-fetch from Redis after consumer has had time to process
        setTimeout(() => refresh(DEMO_USER_ID), 1500);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardCard title="Send Test Notification" icon={Send}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs mb-1">Type</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
            {(["email", "push", "in-app"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updates">Updates</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="reminders">Reminders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs mb-1">Body</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={isSending}
          className="w-full"
          size="sm"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {isSending ? "Publishing..." : "Publish to RabbitMQ"}
        </Button>
      </div>
    </DashboardCard>
  );
}
