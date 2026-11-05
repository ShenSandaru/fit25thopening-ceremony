import type { Metadata } from "next";
import { PROJECT_NAME } from "@fit-expo/shared";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: `Organizer Dashboard | ${PROJECT_NAME}`,
  description: "Official organizer management console for the FIT Expo Opening Ceremony",
};

export default function AdminPage() {
  return <AdminDashboard />;
}

