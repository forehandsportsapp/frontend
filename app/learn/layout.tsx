import ProtectedRoute from "@/components/ProtectedRoute";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
