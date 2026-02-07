"use client";

import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({
  count,
  onClick,
  className,
}: Readonly<NotificationBellProps>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center size-9 rounded-md transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <Bell
        className={cn(
          "size-5",
          count > 0 && "animate-[wiggle_0.3s_ease-in-out]",
        )}
      />

      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
