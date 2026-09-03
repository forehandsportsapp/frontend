import ProtectedRoute from "@/components/ProtectedRoute";

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
