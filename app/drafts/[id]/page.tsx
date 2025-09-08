// app/drafts/[id]/page.tsx  (SERVER component)
import DraftEditorClient from './DraftEditorClient';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15: params is a Promise
  return <DraftEditorClient id={id} />;
}
