export type NumberedDocument = {
  type: string;
  estimateNumber?: string;
  invoiceNumber?: string;
};

const TRAILING_NUMBER = /(\d+)\s*$/;

/**
 * Next sequential number for a document type, based on the highest existing
 * number instead of the document count, so deleting a document can never
 * produce a duplicate number (e.g. two INV-003).
 */
export function nextDocumentNumber(
  documents: NumberedDocument[],
  type: 'Estimate' | 'Invoice'
): string {
  const prefix = type === 'Estimate' ? 'EST' : 'INV';
  let highest = 0;
  for (const doc of documents) {
    if (doc.type !== type) continue;
    const value = type === 'Estimate' ? doc.estimateNumber : doc.invoiceNumber;
    if (!value) continue;
    const match = TRAILING_NUMBER.exec(value);
    if (!match) continue;
    const parsed = parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > highest) highest = parsed;
  }
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}
