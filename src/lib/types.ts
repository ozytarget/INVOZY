
export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  price: number;
};

export type PaymentMethod = "Cash" | "Bank Transfer" | "Credit Card" | "Debit Card";

export type Payment = {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
}

export type DocumentStatus = 'Draft' | 'Sent' | 'Paid' | 'Partial' | 'Overdue' | 'Approved';
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
  taxId?: string;
  signature?: string;
  isSigned?: boolean;
  payments?: Payment[];
};

export type Client = {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalBilled: number;
  documentCount: number;
};
