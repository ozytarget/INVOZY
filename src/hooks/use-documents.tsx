

'use client';

import { Document, Client, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import React, from 'react';
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
  const firestore = useFirestore();

  // Secure queries that filter by the logged-in user's UID
  const estimatesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'estimates'), where('userId', '==', user.uid)) : null, [firestore, user]);
  const invoicesQuery = useMemoFirebase(() => user ? query(collection(firestore, 'invoices'), where('userId', '==', user.uid)) : null, [firestore, user]);
  const clientsCollection = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'clients') : null, [firestore, user]);

  const { data: estimates, isLoading: isLoadingEstimates } = useCollection<Document>(estimatesQuery);
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Document>(invoicesQuery);
  const { data: storedClients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  const isLoading = isUserLoading || isLoadingEstimates || isLoadingInvoices || isLoadingClients;
  
  const documents = React.useMemo(() => {
    const allDocs = [...(estimates || []), ...(invoices || [])];
    return allDocs.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  }, [estimates, invoices]);

  const addDocument = React.useCallback(async (docData: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'>): Promise<string | undefined> => {
    if (!user) return undefined;
    
    const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
    const collectionName = docData.type === 'Estimate' ? 'estimates' : 'invoices';
    const collectionRef = collection(firestore, collectionName);
    
    // Instead of getting all docs, we get them once in the provider and filter here.
    const userDocs = (collectionName === 'estimates' ? estimates : invoices) || [];
    const docCount = userDocs.length;
    
    const prefix = collectionName === 'estimates' ? 'EST' : 'INV';
    const number = (docCount + 1).toString().padStart(3, '0');
    const docNumber = `${prefix}-${number}`;

    const dataToSave: Partial<Document> & { userId: string, search_field: string } = {
      // First, apply all the data from the form
      ...docData,
      // Then, ensure company and user data is correctly set, overwriting if necessary
      userId: user.uid,
      companyName: companySettings.companyName || '',
      companyAddress: companySettings.companyAddress || '',
      companyEmail: companySettings.companyEmail || '',
      companyPhone: companySettings.companyPhone || '',
      companyLogo: companySettings.companyLogo || '',
      companyWebsite: companySettings.companyWebsite || '',
      taxRate: companySettings.taxRate || 0, // Ensure taxRate is saved
      contractorName: companySettings.contractorName || '',
      schedulingUrl: companySettings.schedulingUrl || '',
      search_field: `${docData.clientName} ${docData.projectTitle} ${docNumber}`.toLowerCase(),
    };
    
    if (collectionName === 'estimates') {
        dataToSave.estimateNumber = docNumber;
    } else {
        dataToSave.invoiceNumber = docNumber;
    }

    const newDocRef = await addDoc(collectionRef, dataToSave);
    return newDocRef.id;
  }, [user, firestore, estimates, invoices]);

  const updateDocument = React.useCallback(async (docId: string, docData: Partial<Document>) => {
    if (!user) return;
    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;
    
    const collectionName = originalDoc.type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    
    const docNumber = originalDoc.type === 'Estimate' ? originalDoc.estimateNumber : originalDoc.invoiceNumber;
    const clientName = docData.clientName || originalDoc.clientName;
    const projectTitle = docData.projectTitle || originalDoc.projectTitle;

    const updatedData = {
        ...docData,
        search_field: `${clientName} ${projectTitle} ${docNumber}`.toLowerCase(),
    };

    await updateDoc(docRef, updatedData);
  }, [user, firestore, documents]);


  const deleteDocument = React.useCallback(async (docId: string) => {
    if (!user) return;
    const docToDelete = documents.find(d => d.id === docId);
    if (!docToDelete) return;
    
    const collectionName = docToDelete.type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    await deleteDoc(docRef);

  }, [firestore, user, documents]);

  const duplicateDocument = React.useCallback(async (docId: string) => {
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
  
  const addClient = React.useCallback(async (clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
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

 const signAndProcessDocument = React.useCallback(async (docId: string, signature: string): Promise<string | undefined> => {
    if (!user || !firestore) return;
    
    const batch = writeBatch(firestore);
    let newInvoiceId: string | undefined = undefined;

    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    if (originalDoc.type === 'Estimate') {
      const estimateRef = doc(firestore, 'estimates', docId);
      
      const newInvoiceRef = doc(collection(firestore, 'invoices'));
      newInvoiceId = newInvoiceRef.id;

      // Correctly get invoice count for the new number
      const userInvoices = invoices || [];
      const newInvoiceNumber = `INV-${(userInvoices.length + 1).toString().padStart(3, '0')}`;
      
      const companySettings = JSON.parse(localStorage.getItem('companySettings') || '{}');
      
      const newInvoiceData: Omit<Document, 'id'> & { id?: string } = {
          // First, spread the original document
          ...originalDoc, 
          // Then, override fields for the new invoice
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
          // Finally, ensure company settings are applied and have the last word
          companyName: companySettings.companyName || '',
          companyAddress: companySettings.companyAddress || '',
          companyEmail: companySettings.companyEmail || '',
          companyPhone: companySettings.companyPhone || '',
          companyLogo: companySettings.companyLogo || '',
          companyWebsite: companySettings.companyWebsite || '',
          taxRate: companySettings.taxRate || 0,
          contractorName: companySettings.contractorName || '',
          schedulingUrl: companySettings.schedulingUrl || '',
          search_field: `${originalDoc.clientName} ${originalDoc.projectTitle} ${newInvoiceNumber}`.toLowerCase(),
      };
      
      // CRITICAL FIX: Delete the old ID before creating the new document
      delete newInvoiceData.id; 
      
      batch.set(newInvoiceRef, newInvoiceData);
      // Now, delete the original estimate
      batch.delete(estimateRef);

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

  }, [user, firestore, documents, invoices]);

  const recordPayment = React.useCallback(async (docId: string, payment: Omit<Payment, 'id' | 'date'>) => {
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
  
  const revertInvoiceToDraft = React.useCallback(async (invoiceId: string) => {
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

  const revertLastPayment = React.useCallback(async (invoiceId: string) => {
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

  const sendDocument = React.useCallback(async (docId: string, type: DocumentType) => {
    if (!user) return;
    const collectionName = type === 'Estimate' ? 'estimates' : 'invoices';
    const docRef = doc(firestore, collectionName, docId);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status === 'Draft') {
      await updateDoc(docRef, { status: 'Sent' });
    }
  }, [user, firestore]);

  const clients = React.useMemo(() => {
    return getCombinedClients(documents, storedClients || []);
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

