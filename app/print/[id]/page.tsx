// app/print/[id]/page.tsx  (SERVER component)
import PrintClient from './PrintClient';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15: params is a Promise
  return <PrintClient id={id} />;
}
