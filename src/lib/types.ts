export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

export type DocumentStatus = 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Overdue';
export type DocumentType = 'Estimate' | 'Invoice';

export type Document = {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  projectTitle: string;
  issuedDate: string;
  dueDate?: string;
  amount: number;
  lineItems: LineItem[];
  notes: string;
  terms: string;
};
