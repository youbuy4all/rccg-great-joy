// Standalone print layout — no sidebar, no topbar, no overflow constraints.
// Children still get React Query / auth from the root layout.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
