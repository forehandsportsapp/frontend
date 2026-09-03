import ProtectedRoute from "@/components/ProtectedRoute";

export default function TournamentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
