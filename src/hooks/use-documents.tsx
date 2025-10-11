

'use client';

import { Document, Client, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, writeBatch, getDocs, query, where, getDoc, updateDoc } from 'firebase/firestore';

// This function extracts unique clients from documents and combines with stored clients
const getCombinedClients = (documents: Document[], storedClients: Client[]): Client[] => {
  const clientsMap = new Map<string, Client>();

  // Initialize with stored clients, setting defaults
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
  addDocument: (doc: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber'>) => Promise<string | undefined>;
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

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Secure queries that filter by the logged-in user's UID
  const estimatesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'estimates'), where('userId', '==', user.uid)) : null, [firestore, user]);
  const invoicesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'invoices'), where('userId', '==', user.uid)) : null, [firestore, user]);
  const clientsCollection = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'clients') : null, [firestore, user]);

  const { data: estimates, isLoading: isLoadingEstimates } = useCollection<Document>(estimatesQuery);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Document>(invoicesQuery);
  const { data: storedClients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  const isLoading = isUserLoading || isLoadingEstimates || isLoadingInvoices || isLoadingClients;
  
  const documents = useMemo(() => {
    const allDocs = [...(estimates || []), ...(invoices || [])];
    return allDocs.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  }, [estimates, invoices]);

  const addDocument = useCallback(async (docData: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber'>): Promise<string | undefined> => {
    if (!user) return undefined;
    
    // Get company settings from local storage
    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');

    const collectionName = docData.type === 'Estimate' ? 'estimates' : 'invoices';
    const collectionRef = collection(firestore, collectionName);
    
    // Generate sequential number
    const userDocsQuery = query(collectionRef, where('userId', '==', user.uid));
    const userDocsSnapshot = await getDocs(userDocsQuery);
    const docCount = userDocsSnapshot.size;
    
    const prefix = collectionName === 'estimates' ? 'EST' : 'INV';
    const number = (docCount + 1).toString().padStart(3, '0');
    const docNumber = `${prefix}-${number}`;

    const dataToSave: Partial<Document> & { userId: string } = { 
      ...docData, 
      userId: user.uid,
      companyName: companySettings.companyName || '',
      companyAddress: companySettings.companyAddress || '',
      companyEmail: companySettings.companyEmail || '',
      companyPhone: companySettings.companyPhone || '',
      companyLogo: companySettings.companyLogo || '',
      companyWebsite: companySettings.companyWebsite || '',
      taxId: companySettings.taxId || '',
      contractorName: companySettings.contractorName || '',
      schedulingUrl: companySettings.schedulingUrl || '',
    };
    
    if (collectionName === 'estimates') {
        dataToSave.estimateNumber = docNumber;
    } else {
        dataToSave.invoiceNumber = docNumber;
    }

    const newDocRef = await addDoc(collectionRef, dataToSave);
    return newDocRef.id;
  }, [user, firestore]);

  const updateDocument = useCallback(async (docId: string, docData: Partial<Document>) => {
    if (!user) return;
    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;
    
    const collectionName = originalDoc.type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    await updateDoc(docRef, docData);
  }, [user, firestore, documents]);


  const deleteDocument = useCallback(async (docId: string) => {
    if (!user) return;
    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;
    
    const collectionName = docToDelete.type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    await deleteDoc(docRef);

  }, [firestore, user, documents]);

  const duplicateDocument = useCallback(async (docId: string) => {
    if (!user) return;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const newDoc: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber'> = {
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
     if (!user || !clientsCollection) return;
    // Check if client already exists
    const q = query(clientsCollection, where("email", "==", clientData.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log("Client already exists");
      return;
    }
    await addDoc(clientsCollection, clientData);
  }, [user, clientsCollection]);

 const signAndProcessDocument = useCallback(async (docId: string, signature: string): Promise<string | undefined> => {
    if (!user || !firestore) return;
    
    const batch = writeBatch(firestore);
    let newInvoiceId: string | undefined = undefined;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    if (originalDoc.type === 'Estimate') {
      const estimateRef = doc(firestore, 'estimates', docId);
      batch.update(estimateRef, {
        signature,
        isSigned: true,
        status: 'Approved',
      });
      
      const newInvoiceRef = doc(collection(firestore, 'invoices'));
      newInvoiceId = newInvoiceRef.id;

      const userInvoicesQuery = query(collection(firestore, 'invoices'), where('userId', '==', user.uid));
      const userInvoicesSnapshot = await getDocs(userInvoicesQuery);
      const invoiceCount = userInvoicesSnapshot.size;
      const newInvoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(3, '0')}`;
      
      const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
      
      // Corrected logic: spread original doc, then override with new/correct data
      const newInvoiceData = {
          ...originalDoc, // Start with estimate data
          type: 'Invoice' as DocumentType,
          status: 'Sent' as DocumentStatus,
          userId: user.uid,
          issuedDate: format(new Date(), "yyyy-MM-dd"),
          dueDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
          isSigned: true,
          signature: signature,
          terms: originalDoc.terms || 'Net 30',
          payments: [],
          invoiceNumber: newInvoiceNumber,
          estimateNumber: originalDoc.estimateNumber,
          // Now, ensure company settings from localStorage are applied
          companyName: companySettings.companyName || '',
          companyAddress: companySettings.companyAddress || '',
          companyEmail: companySettings.companyEmail || '',
          companyPhone: companySettings.companyPhone || '',
          companyLogo: companySettings.companyLogo || '',
          companyWebsite: companySettings.companyWebsite || '',
          taxId: companySettings.taxId || '',
          contractorName: companySettings.contractorName || '',
          schedulingUrl: companySettings.schedulingUrl || '',
      };
      delete newInvoiceData.id; // remove old id
      batch.set(newInvoiceRef, newInvoiceData);

    } else { // It's an invoice
      const invoiceRef = doc(firestore, 'invoices', docId);
      batch.update(invoiceRef, {
        signature,
        isSigned: true,
        status: 'Sent', // If an invoice is signed, it should be considered 'Sent'
      });
    }

    await batch.commit();
    return newInvoiceId;

  }, [user, firestore, documents]);

  const recordPayment = useCallback(async (docId: string, payment: Omit<Payment, 'id' | 'date'>) => {
    if (!user) return;
    const invoiceRef = doc(firestore, 'invoices', docId);
    const docSnap = await getDoc(invoiceRef);

    if (!docSnap.exists()) return;

    const docToUpdate = docSnap.data() as Document;

    const newPayment: Payment = {
        ...payment,
        id: new Date().toISOString(),
        date: format(new Date(), "yyyy-MM-dd"),
    };

    const existingPayments = docToUpdate.payments || [];
    const updatedPayments = [...existingPayments, newPayment];
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);

    let newStatus: DocumentStatus = 'Partial';
    if (totalPaid >= docToUpdate.amount) {
        newStatus = 'Paid';
    }

    const batch = writeBatch(firestore);
    batch.update(invoiceRef, {
        payments: updatedPayments,
        status: newStatus,
    });
    await batch.commit();

  }, [user, firestore]);
  
  const revertInvoiceToDraft = useCallback(async (invoiceId: string) => {
    if (!user) return;
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    const batch = writeBatch(firestore);
    batch.update(invoiceRef, {
      status: 'Draft',
      isSigned: false,
      signature: undefined,
    });
    await batch.commit();
  }, [user, firestore]);

  const revertLastPayment = useCallback(async (invoiceId: string) => {
    if (!user) return;
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    const docSnap = await getDoc(invoiceRef);
    if (!docSnap.exists()) return;
    
    const docToUpdate = docSnap.data() as Document;

    if (docToUpdate.payments && docToUpdate.payments.length > 0) {
        const updatedPayments = docToUpdate.payments.slice(0, -1);
        const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
        
        let newStatus: DocumentStatus = 'Draft';
        if (totalPaid > 0) {
            newStatus = 'Partial';
        } else if (docToUpdate.isSigned) {
            newStatus = 'Sent';
        }

        const batch = writeBatch(firestore);
        batch.update(invoiceRef, {
            payments: updatedPayments,
            status: newStatus,
        });
        await batch.commit();
    }
  }, [user, firestore]);

  const sendDocument = useCallback(async (docId: string, type: DocumentType) => {
    if (!user) return;
    const collectionName = type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status === 'Draft') {
      await updateDoc(docRef, { status: 'Sent' });
    }
  }, [user, firestore]);

  const clients = useMemo(() => {
    return getCombinedClients(documents, storedClients || []);
  }, [documents, storedClients]);


  return (
    <DocumentContext.Provider value={{ documents, addDocument, updateDocument, deleteDocument, duplicateDocument, clients, addClient, signAndProcessDocument, recordPayment, revertInvoiceToDraft, revertLastPayment, sendDocument, isLoading }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};
