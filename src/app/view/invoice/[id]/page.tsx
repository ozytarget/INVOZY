import { DocumentView } from "@/components/document-view";
import { documents } from "@/lib/data";
import { notFound } from "next/navigation";

export default function PublicInvoiceViewPage({ params }: { params: { id: string } }) {
  const document = documents.find(doc => doc.id === params.id && doc.type === 'Invoice');

  if (!document) {
    notFound();
  }

  return <DocumentView document={document} />;
}
