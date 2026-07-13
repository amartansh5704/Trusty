import Navbar from "./navbar";

interface DashboardLayoutProps {
  user: {
    id: string;
    name: string;
    role: string;
    creditBalance: number;
  };
  children: React.ReactNode;
}

export default function DashboardLayout({
  user,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-black">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}