
'use client';

import { Document, Client, DocumentStatus, DocumentType } from '@/lib/types';
import { initialDocuments } from '@/lib/data';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { format } from 'date-fns';

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
  signAndProcessDocument: (docId: string, signature: string) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [extraClients, setExtraClients] = useState<Client[]>([]);

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
      // Prevent adding duplicate clients based on email
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

  const signAndProcessDocument = useCallback((docId: string, signature: string) => {
    setDocuments(prevDocs => {
      const docsCopy = [...prevDocs];
      const docIndex = docsCopy.findIndex(d => d.id === docId);
      if (docIndex === -1) return prevDocs;

      const originalDoc = docsCopy[docIndex];
      
      // Update the original document
      docsCopy[docIndex] = {
        ...originalDoc,
        signature,
        isSigned: true,
        status: originalDoc.type === 'Estimate' ? 'Approved' : 'Paid',
      };

      // If it's an estimate, create a new invoice
      if (originalDoc.type === 'Estimate') {
        const invoiceCount = docsCopy.filter(d => d.type === 'Invoice').length;
        const newInvoice: Document = {
          ...originalDoc,
          id: `INV-${(invoiceCount + 1).toString().padStart(3, '0')}`,
          type: 'Invoice',
          status: 'Draft', // New invoice starts as a draft
          issuedDate: format(new Date(), "yyyy-MM-dd"),
          dueDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
          isSigned: false, // The new invoice is not signed yet
          signature: undefined, // No signature on the new invoice
          terms: originalDoc.terms || 'Net 30',
        };
        // Add the new invoice to the beginning of the documents array
        return [newInvoice, ...docsCopy];
      }

      return docsCopy;
    });
  }, []);
  
  const clients = useMemo(() => {
    const clientsFromDocs = getClientsFromDocuments(documents);
    const allClientsMap = new Map<string, Client>();

    // Add clients from documents first, as they contain billing info
    clientsFromDocs.forEach(c => allClientsMap.set(c.email, c));

    // Add manually created clients, only if they don't already exist from docs
    extraClients.forEach(c => {
      if (!allClientsMap.has(c.email)) {
        allClientsMap.set(c.email, c);
      }
    });
    
    // Removed sorting to prevent hydration errors. Sorting will be done in the component.
    return Array.from(allClientsMap.values());
  }, [documents, extraClients]);


  return (
    <DocumentContext.Provider value={{ documents, addDocument, deleteDocument, duplicateDocument, clients, addClient, signAndProcessDocument }}>
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
