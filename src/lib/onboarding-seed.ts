import type { Client, Document } from '@/lib/types';

const generateId = () => {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const generateShareToken = () => {
  return crypto.randomUUID();
};

export const createOnboardingSeed = (userId: string) => {
  const today = new Date();
  const issuedDate = today.toISOString().slice(0, 10);
  const dueDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const sampleClient: Client = {
    name: 'Sample Client',
    email: 'sample.client@example.com',
    phone: '(555) 000-0100',
    address: '101 Sample St, Demo City',
    totalBilled: 11,
    documentCount: 2,
  };

  const estimateId = generateId();
  const invoiceId = generateId();
  const taxRate = 10;

  const commonDoc = {
    userId,
    companyName: 'Set your company name',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    clientName: sampleClient.name,
    clientEmail: sampleClient.email,
    clientAddress: sampleClient.address,
    clientPhone: sampleClient.phone,
    projectTitle: 'Sample Paint Touch-up',
    issuedDate,
    dueDate,
    amount: 11,
    taxRate,
    lineItems: [
      {
        id: generateId(),
        description: 'Sample service',
        quantity: 1,
        price: 10,
      },
    ],
    notes: 'Welcome sample document. Edit or delete anytime.',
    terms: 'Net 14',
    payments: [],
    projectPhotos: [],
  };

  const estimate: Document = {
    ...commonDoc,
    id: estimateId,
    type: 'Estimate',
    status: 'Draft',
    share_token: generateShareToken(),
    estimateNumber: 'EST-001',
    search_field: 'sample client sample paint touch-up est-001',
  };

  const invoice: Document = {
    ...commonDoc,
    id: invoiceId,
    type: 'Invoice',
    status: 'Sent',
    share_token: generateShareToken(),
    invoiceNumber: 'INV-001',
    search_field: 'sample client sample paint touch-up inv-001',
  };

  return {
    clients: [sampleClient],
    documents: [estimate, invoice],
    companySettings: {},
  };
};
