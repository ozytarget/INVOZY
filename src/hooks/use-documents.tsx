'use client';

import { Document, Client, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/supabase/client';
import { useUser } from '@/supabase/provider';

// Function to extract unique clients from documents and combine with stored clients
const getCombinedClients = (documents: Document[], storedClients: Client[]): Client[] => {
  const clientsMap = new Map<string, Client>();

  // Initialize with stored clients
  storedClients.forEach(c => {
    clientsMap.set(c.email, { ...c, totalBilled: 0, documentCount: 0 });
  });

  // Combine with document clients
  documents.forEach((doc) => {
    let client = clientsMap.get(doc.clientEmail);
    if (!client) {
      client = {
        name: doc.clientName,
        email: doc.clientEmail,
        phone: doc.clientPhone,
        address: doc.clientAddress,
        totalBilled: 0,
        documentCount: 0,
      };
    }
    if (doc.type === "Invoice") {
      client.totalBilled += doc.amount;
    }
    client.documentCount += 1;
    clientsMap.set(doc.clientEmail, client);
  });
  return Array.from(clientsMap.values());
};

interface DocumentContextType {
  documents: Document[];
  addDocument: (doc: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'>) => Promise<string | undefined>;
  updateDocument: (docId: string, docData: Partial<Document>) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  duplicateDocument: (docId: string) => Promise<void>;
  clients: Client[];
  addClient: (client: Omit<Client, 'totalBilled' | 'documentCount'>) => Promise<void>;
  signAndProcessDocument: (docId: string, signature: string) => Promise<string | undefined>;
  recordPayment: (invoiceId: string, payment: Omit<Payment, 'id'>) => Promise<void>;
  revertInvoiceToDraft: (invoiceId: string) => Promise<void>;
  revertLastPayment: (invoiceId: string) => Promise<void>;
  sendDocument: (docId: string, type: DocumentType) => Promise<void>;
  isLoading: boolean;
}

const DocumentContext = React.createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [storedClients, setStoredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Load all data from Supabase
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch estimates and invoices
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('estimates')
        .select('*')
        .eq('user_id', user.id) as { data: any[]; error: any };

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id) as { data: any[]; error: any };

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id) as { data: any[]; error: any };

      if (estimatesError) console.error('Error loading estimates:', estimatesError);
      if (invoicesError) console.error('Error loading invoices:', invoicesError);
      if (clientsError) console.error('Error loading clients:', clientsError);

      // Transform Supabase data to Document type
      const transformedEstimates: Document[] = (estimatesData || []).map(doc => ({
        id: doc.id || '',
        userId: doc.user_id || '',
        type: 'Estimate' as DocumentType,
        status: doc.status || 'Draft',
        companyName: doc.company_name || '',
        companyAddress: doc.company_address || '',
        companyEmail: doc.company_email || '',
        companyPhone: doc.company_phone || '',
        companyLogo: doc.company_logo,
        companyWebsite: doc.company_website,
        contractorName: doc.contractor_name,
        schedulingUrl: doc.scheduling_url,
        clientName: doc.client_name,
        clientEmail: doc.client_email,
        clientAddress: doc.client_address || '',
        clientPhone: doc.client_phone,
        projectTitle: doc.project_title,
        issuedDate: doc.issued_date,
        dueDate: doc.due_date,
        amount: doc.amount || 0,
        taxRate: doc.tax_rate || 0,
        lineItems: Array.isArray(doc.line_items) ? doc.line_items : [],
        notes: doc.notes || '',
        terms: doc.terms || '',
        taxId: doc.tax_id,
        signature: doc.signature,
        isSigned: doc.is_signed || false,
        payments: [],
        estimateNumber: doc.estimate_number,
        projectPhotos: doc.project_photos || [],
        search_field: doc.search_field || '',
      }));

      const transformedInvoices: Document[] = (invoicesData || []).map(doc => ({
        id: doc.id || '',
        userId: doc.user_id || '',
        type: 'Invoice' as DocumentType,
        status: doc.status || 'Draft',
        companyName: doc.company_name || '',
        companyAddress: doc.company_address || '',
        companyEmail: doc.company_email || '',
        companyPhone: doc.company_phone || '',
        companyLogo: doc.company_logo,
        companyWebsite: doc.company_website,
        contractorName: doc.contractor_name,
        schedulingUrl: doc.scheduling_url,
        clientName: doc.client_name,
        clientEmail: doc.client_email,
        clientAddress: doc.client_address || '',
        clientPhone: doc.client_phone,
        projectTitle: doc.project_title,
        issuedDate: doc.issued_date,
        dueDate: doc.due_date,
        amount: doc.amount || 0,
        taxRate: doc.tax_rate || 0,
        lineItems: Array.isArray(doc.line_items) ? doc.line_items : [],
        notes: doc.notes || '',
        terms: doc.terms || '',
        taxId: doc.tax_id,
        signature: doc.signature,
        isSigned: doc.is_signed || false,
        payments: [],
        invoiceNumber: doc.invoice_number,
        projectPhotos: doc.project_photos || [],
        search_field: doc.search_field || '',
      }));

      const allDocs = [...transformedEstimates, ...transformedInvoices];
      setDocuments(allDocs.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()));

      const transformedClients: Client[] = (clientsData || []).map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        totalBilled: c.total_billed || 0,
        documentCount: c.document_count || 0,
      }));

      setStoredClients(transformedClients);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  // ✅ Add document
  const addDocument = useCallback(async (docData: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'>): Promise<string | undefined> => {
    if (!user) return undefined;

    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const tableName = docData.type === 'Estimate' ? 'estimates' : 'invoices';
    const docCount = documents.filter(d => d.type === docData.type).length;

    const prefix = docData.type === 'Estimate' ? 'EST' : 'INV';
    const number = (docCount + 1).toString().padStart(3, '0');
    const docNumber = `${prefix}-${number}`;

    const dbData: Record<string, any> = {
      user_id: user.id,
      status: docData.status,
      company_name: companySettings.companyName || '',
      company_address: companySettings.companyAddress || '',
      company_email: companySettings.companyEmail || '',
      company_phone: companySettings.companyPhone || '',
      company_logo: companySettings.companyLogo,
      company_website: companySettings.companyWebsite,
      contractor_name: companySettings.contractorName,
      scheduling_url: companySettings.schedulingUrl,
      client_name: docData.clientName,
      client_email: docData.clientEmail,
      client_address: docData.clientAddress,
      client_phone: docData.clientPhone,
      project_title: docData.projectTitle,
      issued_date: docData.issuedDate,
      due_date: docData.dueDate,
      amount: docData.amount || 0,
      tax_rate: companySettings.taxRate || 0,
      notes: docData.notes || '',
      terms: docData.terms || '',
      tax_id: docData.taxId,
      signature: docData.signature,
      is_signed: docData.isSigned || false,
      project_photos: docData.projectPhotos || [],
      search_field: `${docData.clientName} ${docData.projectTitle} ${docNumber}`.toLowerCase(),
    };

    // ✅ Store line_items in both tables (try line_items column first, then fallback to notes)
    if (docData.lineItems && docData.lineItems.length > 0) {
      // For invoices, try to store in line_items column
      if (docData.type === 'Invoice') {
        dbData.line_items = docData.lineItems;
      } else {
        // For estimates, embed in notes if notes is empty, or create separate field
        // Try to store as JSON in a serialized format
        dbData.line_items = docData.lineItems;
      }
    }

    if (docData.type === 'Estimate') {
      dbData.estimate_number = docNumber;
    } else {
      dbData.invoice_number = docNumber;
    }

    let { data, error } = await (supabase.from(tableName) as any)
      .insert([dbData])
      .select()
      .single();

    // ✅ If error is about line_items column not existing, retry without it
    if (error && error.message && error.message.includes('line_items')) {
      console.warn('line_items column not found, retrying without it...');
      delete dbData.line_items;
      const retryResult = await (supabase.from(tableName) as any)
        .insert([dbData])
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Error adding document:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Data sent:', JSON.stringify(dbData, null, 2));
      return undefined;
    }

    // ✅ Reload data after adding
    await loadData();
    return data?.id;
  }, [user, documents, loadData]);

  // ✅ Update document
  const updateDocument = useCallback(async (docId: string, docData: Partial<Document>) => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const tableName = originalDoc.type === 'Estimate' ? 'estimates' : 'invoices';
    const docNumber = originalDoc.type === 'Estimate' ? originalDoc.estimateNumber : originalDoc.invoiceNumber;

    const dbData: Record<string, any> = {};
    if (docData.status) dbData.status = docData.status;
    if (docData.companyName) dbData.company_name = docData.companyName;
    if (docData.clientName) dbData.client_name = docData.clientName;
    if (docData.projectTitle) dbData.project_title = docData.projectTitle;
    if (docData.amount !== undefined) dbData.amount = docData.amount;
    if (docData.taxRate !== undefined) dbData.tax_rate = docData.taxRate;
    if (docData.issuedDate) dbData.issued_date = docData.issuedDate;
    if (docData.dueDate) dbData.due_date = docData.dueDate;
    if (docData.notes) dbData.notes = docData.notes;
    if (docData.terms) dbData.terms = docData.terms;
    if (docData.signature) dbData.signature = docData.signature;
    if (docData.isSigned !== undefined) dbData.is_signed = docData.isSigned;
    if (docData.lineItems !== undefined) dbData.line_items = docData.lineItems;
    if (docData.projectPhotos !== undefined) dbData.project_photos = docData.projectPhotos;

    dbData.search_field = `${docData.clientName || originalDoc.clientName} ${docData.projectTitle || originalDoc.projectTitle} ${docNumber}`.toLowerCase();

    const { error } = await (supabase.from(tableName) as any)
      .update(dbData)
      .eq('id', docId);

    // ✅ If error is about line_items column not existing, retry without it
    if (error && error.message && error.message.includes('line_items')) {
      console.warn('line_items column not found during update, retrying without it...');
      delete dbData.line_items;
      const retryError = (await (supabase.from(tableName) as any)
        .update(dbData)
        .eq('id', docId)).error;
      if (retryError) {
        console.error('Error updating document:', retryError);
        return;
      }
    } else if (error) {
      console.error('Error updating document:', error);
      return;
    }

    // ✅ Reload data after update
    await loadData();
  }, [user, documents, loadData]);

  // ✅ Delete document
  const deleteDocument = useCallback(async (docId: string) => {
    if (!user) return;

    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;

    const tableName = docToDelete.type === 'Estimate' ? 'estimates' : 'invoices';

    const { error } = await (supabase.from(tableName) as any)
      .delete()
      .eq('id', docId);

    if (error) console.error('Error deleting document:', error);
    else await loadData();
  }, [user, documents, loadData]);

  // ✅ Duplicate document
  const duplicateDocument = useCallback(async (docId: string) => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const newDoc: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'> = {
      ...originalDoc,
      status: 'Draft',
      issuedDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: originalDoc.dueDate ? format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd") : undefined,
      isSigned: false,
      signature: undefined,
    };

    await addDocument(newDoc);
  }, [user, documents, addDocument]);

  // ✅ Add client
  const addClient = useCallback(async (clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    if (!user) return;

    const { error } = await (supabase.from('clients') as any)
      .insert([{
        user_id: user.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
      }]);

    if (error) {
      console.error('Error adding client:', error);
    } else {
      await loadData();
    }
  }, [user, loadData]);

  // ✅ Sign and process document
  const signAndProcessDocument = useCallback(async (docId: string, signature: string): Promise<string | undefined> => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    if (originalDoc.type === 'Estimate') {
      // Mark estimate as signed and create invoice
      const { error: updateError } = await (supabase.from('estimates') as any)
        .update({ signature, is_signed: true, status: 'Approved' })
        .eq('id', docId);

      if (updateError) {
        console.error('Error signing estimate:', updateError);
        return undefined;
      }

      // Create new invoice
      const userInvoices = documents.filter(d => d.type === 'Invoice');
      const newInvoiceNumber = `INV-${(userInvoices.length + 1).toString().padStart(3, '0')}`;

      const newInvoiceData = {
        user_id: user.id,
        type: 'Invoice',
        status: 'Sent',
        company_name: originalDoc.companyName,
        company_address: originalDoc.companyAddress,
        company_email: originalDoc.companyEmail,
        company_phone: originalDoc.companyPhone,
        company_logo: originalDoc.companyLogo,
        company_website: originalDoc.companyWebsite,
        contractor_name: originalDoc.contractorName,
        scheduling_url: originalDoc.schedulingUrl,
        client_name: originalDoc.clientName,
        client_email: originalDoc.clientEmail,
        client_address: originalDoc.clientAddress,
        client_phone: originalDoc.clientPhone,
        project_title: originalDoc.projectTitle,
        issued_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
        amount: originalDoc.amount,
        tax_rate: originalDoc.taxRate,
        notes: originalDoc.notes,
        terms: originalDoc.terms || 'Net 30',
        tax_id: originalDoc.taxId,
        signature: signature,
        is_signed: true,
        project_photos: originalDoc.projectPhotos || [],
        invoice_number: newInvoiceNumber,
        search_field: `${originalDoc.clientName} ${originalDoc.projectTitle} ${newInvoiceNumber}`.toLowerCase(),
      };

      const { data, error } = await (supabase.from('invoices') as any)
        .insert([newInvoiceData])
        .select()
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        return undefined;
      }

      await loadData();
      return data?.id;
    } else {
      // It's an invoice - just sign it
      await (supabase.from('invoices') as any)
        .update({ signature, is_signed: true, status: 'Sent' })
        .eq('id', docId);

      await loadData();
    }
  }, [user, documents, loadData]);

  // ✅ Record payment
  const recordPayment = useCallback(async (invoiceId: string, payment: Omit<Payment, 'id'>) => {
    if (!user) return;

    const { data: paymentData, error: paymentError } = await (supabase.from('payments') as any)
      .insert([{
        invoice_id: invoiceId,
        amount: payment.amount,
        payment_date: payment.date,
        method: payment.method,
      }]);

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return;
    }

    // Recalculate invoice status
    const { data: remainingPayments } = await (supabase.from('payments') as any)
      .select('amount')
      .eq('invoice_id', invoiceId) as { data: any[] | null; error: any };

    const totalPaid = (remainingPayments || []).reduce((acc: number, p) => acc + (p?.amount || 0), 0);
    const invoice = documents.find(d => d.id === invoiceId);
    if (!invoice) return;

    let newStatus: DocumentStatus = 'Draft';
    if (totalPaid >= invoice.amount) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partial';
    } else if (invoice.isSigned) {
      newStatus = 'Sent';
    }

    await (supabase.from('invoices') as any)
      .update({ status: newStatus })
      .eq('id', invoiceId);

    await loadData();
  }, [user, documents, loadData]);

  // ✅ Revert invoice to draft
  const revertInvoiceToDraft = useCallback(async (invoiceId: string) => {
    if (!user) return;

    const { error } = await (supabase.from('invoices') as any)
      .update({
        status: 'Draft',
        is_signed: false,
        signature: null,
      })
      .eq('id', invoiceId);

    if (error) {
      console.error('Error reverting invoice:', error);
      return;
    }

    await loadData();
  }, [user, loadData]);

  // ✅ Revert last payment
  const revertLastPayment = useCallback(async (invoiceId: string) => {
    if (!user) return;

    const invoice = documents.find(d => d.id === invoiceId);
    if (!invoice) return;

    // Get last payment from database
    const { data: payments } = await (supabase.from('payments') as any)
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1) as { data: any[] | null; error: any };

    if (!payments || payments.length === 0) return;

    const lastPaymentId = payments[0]?.id;
    if (!lastPaymentId) return;

    // Delete last payment
    await (supabase.from('payments') as any)
      .delete()
      .eq('id', lastPaymentId);

    // Recalculate invoice status
    const { data: remainingPayments } = await (supabase.from('payments') as any)
      .select('amount')
      .eq('invoice_id', invoiceId) as { data: any[] | null; error: any };

    const totalPaid = (remainingPayments || []).reduce((acc: number, p) => acc + (p?.amount || 0), 0);
    let newStatus: DocumentStatus = 'Draft';

    if (totalPaid >= invoice.amount) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partial';
    } else if (invoice.isSigned) {
      newStatus = 'Sent';
    }

    const { error: statusError } = await (supabase.from('invoices') as any)
      .update({ status: newStatus })
      .eq('id', invoiceId);

    if (statusError) {
      console.error('Error updating invoice status:', statusError);
      return;
    }

    await loadData();
  }, [user, documents, loadData]);

  // ✅ Send document
  const sendDocument = useCallback(async (docId: string, type: DocumentType) => {
    if (!user) return;

    const tableName = type === 'Estimate' ? 'estimates' : 'invoices';

    const { data: docData } = await (supabase.from(tableName) as any)
      .select('status')
      .eq('id', docId)
      .single();

    if (docData && docData.status === 'Draft') {
      const { error } = await (supabase.from(tableName) as any)
        .update({ status: 'Sent' })
        .eq('id', docId);
      if (error) {
        console.error('Error sending:', error);
        return;
      }
    }
    // ✅ Reload data immediately after update
    await loadData();
  }, [user, loadData]);

  const clients = useMemo(() => {
    return getCombinedClients(documents, storedClients);
  }, [documents, storedClients]);

  return (
    <DocumentContext.Provider value={{ documents, addDocument, updateDocument, deleteDocument, duplicateDocument, clients, addClient, signAndProcessDocument, recordPayment, revertInvoiceToDraft, revertLastPayment, sendDocument, isLoading }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = React.useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
