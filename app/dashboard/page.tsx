import { NotificationProvider } from "@/contexts/NotificationContext";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard - Notification Service",
  description: "Monitor and manage your notification service",
};

// For demo purposes, use a static userId.
// In production, this would come from auth.
const DEMO_USER_ID = "demo-user-001";

export default function DashboardPage() {
  return (
    <NotificationProvider userId={DEMO_USER_ID}>
      <DashboardClient />
    </NotificationProvider>
  );
}
