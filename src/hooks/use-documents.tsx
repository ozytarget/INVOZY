

'use client';

import { Document, Client, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import { initialDocuments } from '@/lib/data';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useUser } from '@/firebase';

// This function extracts unique clients from documents
const getClientsFromDocuments = (documents: Document[]): Client[] => {
  const clientsMap = new Map<string, Client>();
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
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;
  duplicateDocument: (docId: string) => void;
  clients: Client[];
  addClient: (client: Omit<Client, 'totalBilled' | 'documentCount'>) => void;
  signAndProcessDocument: (docId: string, signature: string) => string | undefined;
  recordPayment: (docId: string, payment: Omit<Payment, 'id' | 'date'>) => void;
  revertInvoiceToDraft: (invoiceId: string) => void;
  revertLastPayment: (invoiceId: string) => void;
  isLoading: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [extraClients, setExtraClients] = useState<Client[]>([]);
  const { user, isUserLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  const getLocalStorageKey = useCallback((userId: string, key: string) => `invozzy_${userId}_${key}`, []);

  useEffect(() => {
    if (isUserLoading) {
      setIsLoading(true);
      return;
    };

    let userDocs: Document[] = [];
    let userClients: Client[] = [];

    if (user) { // Logged-in user
      const savedDocs = localStorage.getItem(getLocalStorageKey(user.uid, 'documents'));
      const savedClients = localStorage.getItem(getLocalStorageKey(user.uid, 'clients'));
      userDocs = savedDocs ? JSON.parse(savedDocs) : [];
      userClients = savedClients ? JSON.parse(savedClients) : [];
    } else { // Guest user
      userDocs = initialDocuments; // Use sample data for guests
      userClients = [];
    }

    setDocuments(userDocs);
    setExtraClients(userClients);
    setIsLoading(false);
    
  }, [user, isUserLoading, getLocalStorageKey]);

  useEffect(() => {
    if (user && !isLoading) {
      localStorage.setItem(getLocalStorageKey(user.uid, 'documents'), JSON.stringify(documents));
      localStorage.setItem(getLocalStorageKey(user.uid, 'clients'), JSON.stringify(extraClients));
    }
  }, [documents, extraClients, user, isLoading, getLocalStorageKey]);
  

  const addDocument = useCallback((doc: Document) => {
    setDocuments(prevDocs => [doc, ...prevDocs]);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
  }, []);

  const duplicateDocument = useCallback((docId: string) => {
    setDocuments(prevDocs => {
      const originalDoc = prevDocs.find(d => d.id === docId);
      if (!originalDoc) return prevDocs;

      const newId = `${originalDoc.type.slice(0,3).toUpperCase()}-${(prevDocs.filter(d => d.type === originalDoc.type).length + 1).toString().padStart(3, '0')}`;
      
      const newDoc: Document = {
        ...originalDoc,
        id: newId,
        status: 'Draft',
        issuedDate: format(new Date(), "yyyy-MM-dd"),
        dueDate: originalDoc.dueDate ? format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd") : undefined,
        isSigned: false,
        signature: undefined,
      };
      
      return [newDoc, ...prevDocs];
    });
  }, []);
  
  const addClient = useCallback((clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    setExtraClients(prevClients => {
      if (prevClients.some(c => c.email === clientData.email) || getClientsFromDocuments(documents).some(d => d.email === clientData.email)) {
        return prevClients;
      }
      const newClient: Client = {
        ...clientData,
        totalBilled: 0,
        documentCount: 0,
      };
      return [...prevClients, newClient];
    });
  }, [documents]);

 const signAndProcessDocument = useCallback((docId: string, signature: string): string | undefined => {
    let newInvoiceId: string | undefined = undefined;

    setDocuments(prevDocs => {
      const docsCopy = [...prevDocs];
      const docIndex = docsCopy.findIndex(d => d.id === docId);
      if (docIndex === -1) return prevDocs;

      const originalDoc = docsCopy[docIndex];
      
      if (originalDoc.type === 'Estimate') {
        // Mark the estimate as approved
        docsCopy[docIndex] = {
          ...originalDoc,
          signature,
          isSigned: true,
          status: 'Approved',
        };

        // Create a new invoice from the estimate
        const invoiceCount = docsCopy.filter(d => d.type === 'Invoice').length;
        newInvoiceId = `INV-${(invoiceCount + 1).toString().padStart(3, '0')}`;
        
        const newInvoice: Document = {
          ...originalDoc,
          id: newInvoiceId,
          type: 'Invoice',
          status: 'Draft',
          issuedDate: format(new Date(), "yyyy-MM-dd"),
          dueDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
          signature: undefined, // Invoice is not signed yet
          isSigned: false,
          terms: originalDoc.terms || 'Net 30',
          payments: [],
        };
        // Add the new invoice to the documents list
        return [newInvoice, ...docsCopy];

      } else if (originalDoc.type === 'Invoice') { 
        // Sign and send the invoice
        docsCopy[docIndex] = {
          ...originalDoc,
          signature,
          isSigned: true,
          status: 'Sent',
        };
        return docsCopy;
      }
      return docsCopy;
    });

    return newInvoiceId;
  }, []);

  const recordPayment = useCallback((docId: string, payment: Omit<Payment, 'id' | 'date'>) => {
    setDocuments(prevDocs => {
      const docsCopy = [...prevDocs];
      const docIndex = docsCopy.findIndex(d => d.id === docId && d.type === 'Invoice');
      if (docIndex === -1) return prevDocs;

      const docToUpdate = docsCopy[docIndex];
      
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

      docsCopy[docIndex] = {
        ...docToUpdate,
        payments: updatedPayments,
        status: newStatus,
      };

      return docsCopy;
    });
  }, []);
  
  const revertInvoiceToDraft = useCallback((invoiceId: string) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id === invoiceId && doc.type === 'Invoice') {
          return {
            ...doc,
            status: 'Draft',
            isSigned: false,
            signature: undefined,
          };
        }
        return doc;
      });
    });
  }, []);

  const revertLastPayment = useCallback((invoiceId: string) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id === invoiceId && doc.type === 'Invoice' && doc.payments && doc.payments.length > 0) {
          const updatedPayments = doc.payments.slice(0, -1);
          const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
          
          let newStatus: DocumentStatus = 'Draft'; // Default if no payments left
          if (totalPaid > 0) {
            newStatus = 'Partial';
          } else if (doc.isSigned) {
            newStatus = 'Sent';
          }

          return {
            ...doc,
            payments: updatedPayments,
            status: newStatus,
          };
        }
        return doc;
      });
    });
  }, []);

  const clients = useMemo(() => {
    const clientsFromDocs = getClientsFromDocuments(documents);
    const allClientsMap = new Map<string, Client>();

    clientsFromDocs.forEach(c => allClientsMap.set(c.email, c));

    extraClients.forEach(c => {
      if (!allClientsMap.has(c.email)) {
        allClientsMap.set(c.email, c);
      }
    });
    
    return Array.from(allClientsMap.values());
  }, [documents, extraClients]);


  return (
    <DocumentContext.Provider value={{ documents, addDocument, deleteDocument, duplicateDocument, clients, addClient, signAndProcessDocument, recordPayment, revertInvoiceToDraft, revertLastPayment, isLoading }}>
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
