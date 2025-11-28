import ClientPage from "./ClientPage";

export default function Page({ params }: { params: { id: string } }) {
  return <ClientPage fixtureId={params.id} />;
}
