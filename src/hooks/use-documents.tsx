'use client';

import { Document, Client, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/supabase/client';
import { useUser } from '@/supabase/provider';

// Generate UUID for share tokens
const generateShareToken = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to extract unique clients
const getCombinedClients = (documents: Document[], storedClients: Client[]): Client[] => {
  const clientsMap = new Map<string, Client>();

  storedClients.forEach(c => {
    clientsMap.set(c.email, {
      ...c,
      totalBilled: 0,
      documentCount: 0,
    });
  });

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
  recordPayment: (docId: string, payment: Omit<Payment, 'id' | 'date'>) => Promise<void>;
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

  // Load documents and clients from Supabase
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

      // Transform Supabase data to match Document type
      const transformedEstimates: Document[] = (estimatesData || []).map(doc => {
        console.log('🔍 LOADING ESTIMATE FROM DB:', {
          id: doc?.id,
          project_title: doc?.project_title,
          line_items_raw: doc?.line_items,
          line_items_type: typeof doc?.line_items,
          line_items_is_array: Array.isArray(doc?.line_items),
        });
        
        let lineItems = [];
        if (doc?.line_items) {
          if (Array.isArray(doc.line_items)) {
            lineItems = doc.line_items;
          } else if (typeof doc.line_items === 'string') {
            try {
              lineItems = JSON.parse(doc.line_items);
            } catch (e) {
              console.error('Error parsing line_items:', e, doc.line_items);
              lineItems = [];
            }
          }
        }
        
        console.log('✓ Parsed lineItems:', lineItems);
        
        return {
          id: doc.id,
          userId: doc.user_id,
          type: doc.type as DocumentType,
          status: doc.status as DocumentStatus,
          share_token: doc.share_token,
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
          amount: doc.amount,
          taxRate: doc.tax_rate,
          lineItems: lineItems,
          notes: doc.notes || '',
          terms: doc.terms || '',
          taxId: doc.tax_id,
          signature: doc.signature,
          isSigned: doc.is_signed || false,
          payments: [],
          estimateNumber: doc.estimate_number,
          projectPhotos: doc.project_photos || [],
          search_field: doc.search_field || '',
        };
      });

      const transformedInvoices: Document[] = (invoicesData || []).map(doc => {
        console.log('🔍 LOADING INVOICE FROM DB:', {
          id: doc.id,
          project_title: doc.project_title,
          line_items_raw: doc.line_items,
          line_items_type: typeof doc.line_items,
          line_items_is_array: Array.isArray(doc.line_items),
        });
        
        let lineItems = [];
        if (doc.line_items) {
          if (Array.isArray(doc.line_items)) {
            lineItems = doc.line_items;
          } else if (typeof doc.line_items === 'string') {
            try {
              lineItems = JSON.parse(doc.line_items);
            } catch (e) {
              console.error('Error parsing line_items:', e, doc.line_items);
              lineItems = [];
            }
          }
        }
        
        console.log('✓ Parsed lineItems:', lineItems);
        
        return {
          id: doc.id,
          userId: doc.user_id,
          type: doc.type as DocumentType,
          status: doc.status as DocumentStatus,
          share_token: doc.share_token,
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
          amount: doc.amount,
          taxRate: doc.tax_rate,
          lineItems: lineItems,
          notes: doc.notes || '',
          terms: doc.terms || '',
          taxId: doc.tax_id,
          signature: doc.signature,
          isSigned: doc.is_signed || false,
          payments: [],
          invoiceNumber: doc.invoice_number,
          projectPhotos: doc.project_photos || [],
          search_field: doc.search_field || '',
        };
      });

      const allDocs = [...transformedEstimates, ...transformedInvoices];
      const sortedDocs = allDocs.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
      
      setDocuments(sortedDocs);
      
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
  }, [user]);

  const addDocument = useCallback(async (docData: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'>): Promise<string | undefined> => {
    if (!user) {
      console.error('No user found when trying to add document');
      return undefined;
    }

    console.log('Adding document for user:', user.id);

    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const tableName = docData.type === 'Estimate' ? 'estimates' : 'invoices';
    const docCount = documents.filter(d => d.type === docData.type).length;

    const prefix = docData.type === 'Estimate' ? 'EST' : 'INV';
    const number = (docCount + 1).toString().padStart(3, '0');
    const docNumber = `${prefix}-${number}`;

    const dbData = {
      user_id: user.id,
      type: docData.type,
      status: docData.status,
      company_name: companySettings.companyName || docData.companyName,
      company_address: companySettings.companyAddress || docData.companyAddress,
      company_email: companySettings.companyEmail || docData.companyEmail,
      company_phone: companySettings.companyPhone || docData.companyPhone,
      company_logo: companySettings.companyLogo || docData.companyLogo,
      company_website: companySettings.companyWebsite || docData.companyWebsite,
      contractor_name: companySettings.contractorName || docData.contractorName,
      scheduling_url: companySettings.schedulingUrl || docData.schedulingUrl,
      client_name: docData.clientName,
      client_email: docData.clientEmail,
      client_address: docData.clientAddress,
      client_phone: docData.clientPhone,
      project_title: docData.projectTitle,
      issued_date: docData.issuedDate,
      due_date: docData.dueDate,
      amount: docData.amount,
      tax_rate: companySettings.taxRate || docData.taxRate,
      notes: docData.notes,
      terms: docData.terms,
      // ⚠️ TODO: line_items column needs to be created in Supabase before adding this
      // line_items: docData.lineItems || [],
      tax_id: docData.taxId,
      signature: docData.signature,
      is_signed: docData.isSigned,
      project_photos: docData.projectPhotos,
      search_field: `${docData.clientName} ${docData.projectTitle} ${docNumber}`.toLowerCase(),
      ...(docData.type === 'Estimate' ? { estimate_number: docNumber } : { invoice_number: docNumber })
    };

    console.log('💾 Inserting into table:', tableName);
    console.log('💾 Data to insert:', dbData);
    // console.log('💾 line_items in insert:', dbData.line_items);

    const { data, error } = await (supabase
      .from(tableName) as any)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Document data attempted:', dbData);
      return undefined;
    }
    
    console.log('✅ Inserted successfully, returned data:', data);
    // console.log('✅ Returned line_items from DB:', data?.line_items);
    console.log('✅ Type of returned line_items:', typeof data?.line_items);

    // Generate and add share token if column exists
    const shareToken = generateShareToken();
    try {
      const { error: updateError } = await (supabase
        .from(tableName) as any)
        .update({ share_token: shareToken })
        .eq('id', data?.id);
      
      if (updateError) {
        console.warn('Could not add share_token (column may not exist):', updateError);
      }
    } catch (e) {
      console.warn('Could not update share_token:', e);
    }

    // Reload documents after adding
    await loadData();

    return data?.id;
  }, [user, loadData]);

  const updateDocument = useCallback(async (docId: string, docData: Partial<Document>) => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const tableName = originalDoc.type === 'Estimate' ? 'estimates' : 'invoices';
    const docNumber = originalDoc.type === 'Estimate' ? originalDoc.estimateNumber : originalDoc.invoiceNumber;
    const clientName = docData.clientName || originalDoc.clientName;
    const projectTitle = docData.projectTitle || originalDoc.projectTitle;

    const dbData: Record<string, any> = {};
    
    // Map Document fields to database columns
    if (docData.status) dbData.status = docData.status;
    if (docData.companyName) dbData.company_name = docData.companyName;
    if (docData.companyAddress) dbData.company_address = docData.companyAddress;
    if (docData.companyEmail) dbData.company_email = docData.companyEmail;
    if (docData.companyPhone) dbData.company_phone = docData.companyPhone;
    if (docData.companyLogo) dbData.company_logo = docData.companyLogo;
    if (docData.companyWebsite) dbData.company_website = docData.companyWebsite;
    if (docData.contractorName) dbData.contractor_name = docData.contractorName;
    if (docData.schedulingUrl) dbData.scheduling_url = docData.schedulingUrl;
    if (docData.clientName) dbData.client_name = docData.clientName;
    if (docData.clientEmail) dbData.client_email = docData.clientEmail;
    if (docData.clientAddress) dbData.client_address = docData.clientAddress;
    if (docData.clientPhone) dbData.client_phone = docData.clientPhone;
    if (docData.projectTitle) dbData.project_title = docData.projectTitle;
    if (docData.issuedDate) dbData.issued_date = docData.issuedDate;
    if (docData.dueDate) dbData.due_date = docData.dueDate;
    if (docData.amount) dbData.amount = docData.amount;
    if (docData.taxRate) dbData.tax_rate = docData.taxRate;
    if (docData.notes !== undefined) dbData.notes = docData.notes;
    if (docData.terms) dbData.terms = docData.terms;
    if (docData.lineItems) {
      if (!Array.isArray(docData.lineItems)) {
        console.error('❌ lineItems must be Array, got:', typeof docData.lineItems);
        return;
      }
      // ⚠️ TODO: line_items column needs to be created in Supabase before adding this
      // dbData.line_items = docData.lineItems;
    }
    if (docData.taxId) dbData.tax_id = docData.taxId;
    if (docData.signature) dbData.signature = docData.signature;
    if (docData.isSigned !== undefined) dbData.is_signed = docData.isSigned;
    if (docData.projectPhotos) dbData.project_photos = docData.projectPhotos;
    
    if (docData.lineItems) {
      console.log('🔄 UPDATE - lineItems found (not persisting yet):', docData.lineItems);
      // ⚠️ TODO: Uncomment when line_items column exists in Supabase
      // dbData.line_items = docData.lineItems;
    } else {
      console.log('🔄 UPDATE - NO lineItems in docData');
    }
    
    dbData.search_field = `${clientName} ${projectTitle} ${docNumber}`.toLowerCase();
    
    console.log('🔄 UPDATING document in table:', tableName);
    console.log('🔄 Update data:', dbData);
    // console.log('🔄 line_items in update:', dbData.line_items);

    const { error } = await (supabase
      .from(tableName) as any)
      .update(dbData)
      .eq('id', docId);

    if (error) {
      console.error('❌ Error updating document:', error);
    } else {
      console.log('✅ Document updated successfully');
      // console.log('✅ Updated line_items:', dbData.line_items);
      // ✅ Recargar estado desde BD
      await loadData();
      console.log('✅ Document reloaded from DB');
    }
  }, [user, documents, loadData]);

  const deleteDocument = useCallback(async (docId: string) => {
    if (!user) return;

    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;

    const tableName = docToDelete.type === 'Estimate' ? 'estimates' : 'invoices';
    
    const { error } = await (supabase
      .from(tableName) as any)
      .delete()
      .eq('id', docId);

    if (error) console.error('Error deleting document:', error);
  }, [user, documents]);

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

  const addClient = useCallback(async (clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    if (!user) return;

    // First, ensure the user exists in the users table
    const { error: userError } = await (supabase
      .from('users') as any)
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });
    
    if (userError) console.error('Error ensuring user exists:', userError);

    // Check if client already exists
    const { data: existingClient } = await (supabase
      .from('clients') as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('email', clientData.email)
      .single();

    if (existingClient) {
      console.log("Client already exists");
      return;
    }

    const { error } = await (supabase
      .from('clients') as any)
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
      // Reload all data after successful insert
      await loadData();
    }
  }, [user, loadData]);

  const signAndProcessDocument = useCallback(async (docId: string, signature: string): Promise<string | undefined> => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    if (originalDoc.type === 'Estimate') {
      console.log('🔄 SIGNING ESTIMATE AND CONVERTING TO INVOICE');
      console.log('📦 Original estimate lineItems:', originalDoc.lineItems);
      
      // ✅ Validar que lineItems es siempre Array
      const lineItems = Array.isArray(originalDoc.lineItems)
        ? originalDoc.lineItems
        : (originalDoc.lineItems ? [originalDoc.lineItems] : []);
      
      // Mark estimate as signed AND set status to Approved (so it won't appear in active estimates)
      const { error: updateError } = await (supabase
        .from('estimates') as any)
        .update({ signature, is_signed: true, status: 'Approved' })
        .eq('id', docId);
      
      if (updateError) {
        console.error('❌ Error updating estimate to signed:', updateError);
        return undefined;
      }
      console.log('✅ Estimate marked as signed');

      // Create new invoice from estimate
      const userInvoices = documents.filter(d => d.type === 'Invoice');
      const newInvoiceNumber = `INV-${(userInvoices.length + 1).toString().padStart(3, '0')}`;
      const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');

      console.log('📋 Creating new invoice from estimate');
      console.log('📊 Invoice will have lineItems:', originalDoc.lineItems?.length || 0);

      const newInvoiceData = {
        user_id: user.id,
        type: 'Invoice' as DocumentType,
        status: 'Sent' as DocumentStatus,
        company_name: companySettings.companyName || originalDoc.companyName,
        company_address: companySettings.companyAddress || originalDoc.companyAddress,
        company_email: companySettings.companyEmail || originalDoc.companyEmail,
        company_phone: companySettings.companyPhone || originalDoc.companyPhone,
        company_logo: companySettings.companyLogo || originalDoc.companyLogo,
        company_website: companySettings.companyWebsite || originalDoc.companyWebsite,
        contractor_name: companySettings.contractorName || originalDoc.contractorName,
        scheduling_url: companySettings.schedulingUrl || originalDoc.schedulingUrl,
        client_name: originalDoc.clientName,
        client_email: originalDoc.clientEmail,
        client_address: originalDoc.clientAddress,
        client_phone: originalDoc.clientPhone,
        project_title: originalDoc.projectTitle,
        issued_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
        amount: originalDoc.amount,
        tax_rate: companySettings.taxRate || originalDoc.taxRate,
        notes: originalDoc.notes,
        terms: originalDoc.terms || 'Net 30',
        tax_id: originalDoc.taxId,
        signature: signature,
        is_signed: true,
        invoice_number: newInvoiceNumber,
        project_photos: originalDoc.projectPhotos || [],
        // ⚠️ TODO: line_items column needs to be created in Supabase before adding this
        // line_items: lineItems,
        search_field: `${originalDoc.clientName} ${originalDoc.projectTitle} ${newInvoiceNumber}`.toLowerCase(),
      };

      console.log('📝 Invoice data to insert:', newInvoiceData);
      // console.log('📦 Invoice lineItems count:', newInvoiceData.line_items?.length || 0);
      // console.log('📦 Invoice lineItems content:', newInvoiceData.line_items);

      const { data, error } = await (supabase
        .from('invoices') as any)
        .insert([newInvoiceData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating invoice from estimate:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return undefined;
      }
      console.log('✅ Invoice created successfully');
      console.log('✅ New invoice ID:', data?.id);
      // console.log('✅ New invoice lineItems from DB:', data?.line_items);

      // Reload to reflect the status change
      await loadData();

      return data.id;
    } else {
      // It's an invoice - just sign it
      await (supabase
        .from('invoices') as any)
        .update({ signature, is_signed: true, status: 'Sent' })
        .eq('id', docId);
      
      // Reload to reflect the changes
      await loadData();
    }
  }, [user, documents, loadData]);

  const recordPayment = useCallback(async (invoiceId: string, payment: Omit<Payment, 'id' | 'date'>) => {
    if (!user) return;

    const invoice = documents.find(d => d.id === invoiceId);
    if (!invoice) return;

    const newPayment: Payment = {
      ...payment,
      id: crypto.randomUUID(),
      date: format(new Date(), "yyyy-MM-dd"),
    };

    const { error: paymentError } = await (supabase
      .from('payments') as any)
      .insert([{
        invoice_id: invoiceId,
        amount: newPayment.amount,
        payment_date: newPayment.date,
        method: newPayment.method,
      }]);

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return;
    }

    // Update invoice status
    const updatedPayments = [...(invoice.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    const newStatus: DocumentStatus = totalPaid >= invoice.amount ? 'Paid' : 'Partial';

    await (supabase
      .from('invoices') as any)
      .update({ status: newStatus })
      .eq('id', invoiceId);
  }, [user, documents]);

  const revertInvoiceToDraft = useCallback(async (invoiceId: string) => {
    if (!user) return;

    const { error } = await (supabase
      .from('invoices') as any)
      .update({
        status: 'Draft',
        is_signed: false,
        signature: null,
      })
      .eq('id', invoiceId);
    
    if (error) {
      console.error('❌ Error reverting invoice:', error);
      return;
    }
    
    // ✅ Recargar estado desde BD
    await loadData();
    console.log('✅ Invoice reverted and state resynced');
  }, [user, loadData]);

  const revertLastPayment = useCallback(async (invoiceId: string) => {
    if (!user) return;

    const invoice = documents.find(d => d.id === invoiceId);
    if (!invoice) return;

    // Get last payment from database
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1) as { data: any[] | null; error: any };

    if (!payments || payments.length === 0) return;

    const lastPaymentId = payments[0]?.id;
    if (!lastPaymentId) return;

    // Delete last payment
    await supabase
      .from('payments')
      .delete()
      .eq('id', lastPaymentId);

    // Recalculate invoice status
    const { data: remainingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoiceId) as { data: any[] | null; error: any };

    const totalPaid = (remainingPayments || []).reduce((acc: number, p) => acc + (p?.amount || 0), 0);
    let newStatus: DocumentStatus = 'Draft';

    if (totalPaid > 0) {
      newStatus = 'Partial';
    } else if (invoice.isSigned) {
      newStatus = 'Sent';
    }

    const { error: statusError } = await (supabase
      .from('invoices') as any)
      .update({ status: newStatus })
      .eq('id', invoiceId);
    
    if (statusError) {
      console.error('❌ Error updating invoice status:', statusError);
      return;
    }
    
    // ✅ Recargar estado desde BD
    await loadData();
    console.log('✅ Payment reverted and state resynced');
  }, [user, documents, loadData]);

  const sendDocument = useCallback(async (docId: string, type: DocumentType) => {
    if (!user) return;

    const tableName = type === 'Estimate' ? 'estimates' : 'invoices';

    const { data: docData } = await (supabase
      .from(tableName) as any)
      .select('status')
      .eq('id', docId)
      .single();

    if (docData && docData.status === 'Draft') {
      const { error } = await (supabase
        .from(tableName) as any)
        .update({ status: 'Sent' })
        .eq('id', docId);
      if (error) {
        console.error('❌ Error sending:', error);
        return;
      }
    }
    // ✅ Recargar estado inmediatamente tras update
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
