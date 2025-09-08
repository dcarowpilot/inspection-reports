// app/final/[id]/page.tsx  (SERVER component)
import FinalClient from './FinalClient';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinalClient id={id} />;
}
