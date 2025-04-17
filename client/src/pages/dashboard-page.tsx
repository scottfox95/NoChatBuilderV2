import DashboardLayout from "@/components/layouts/dashboard-layout";
import ChatbotList from "@/components/dashboards/chatbot-list";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <ChatbotList />
    </DashboardLayout>
  );
}
