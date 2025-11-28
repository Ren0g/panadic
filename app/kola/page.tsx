// app/kola/page.tsx
import ClientShell from "./client-shell";

export const dynamic = "force-dynamic";
export const revalidate = false;

export default function Page() {
  return <ClientShell />;
}
