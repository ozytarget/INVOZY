

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

export type ProjectPhoto = {
  url: string;
  description: string;
}

export type Document = {
  id: string;
  userId: string; // Added to link document to a user
  type: DocumentType;
  status: DocumentStatus;
  
  // Company Info (embedded for public viewing)
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyLogo?: string;
  companyWebsite?: string;
  contractorName?: string;
  schedulingUrl?: string;
  
  // Client Info
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  
  // Document Details
  projectTitle: string;
  issuedDate: string;
  dueDate?: string;
  amount: number; // This is the TOTAL amount, including tax
  taxRate?: number; // The percentage tax rate applied
  lineItems: LineItem[];
  notes: string;
  terms: string;
  taxId?: string; // Kept for legacy or other ID purposes, but not for rate
  signature?: string;
  isSigned?: boolean;
  payments?: Payment[];
  estimateNumber?: string;
  invoiceNumber?: string;
  projectPhotos?: ProjectPhoto[];
  search_field: string;
};

export type Client = {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalBilled: number;
  documentCount: number;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  documentId: string;
  documentType: 'Invoice' | 'Estimate';
  timestamp: string;
  isRead: boolean;
};
