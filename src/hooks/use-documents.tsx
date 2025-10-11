'use client';

import { Document, Client } from '@/lib/types';
import { initialDocuments } from '@/lib/data';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

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
  clients: Client[];
  addClient: (client: Omit<Client, 'totalBilled' | 'documentCount'>) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [extraClients, setExtraClients] = useState<Client[]>([]);

  const addDocument = useCallback((doc: Document) => {
    setDocuments(prevDocs => [doc, ...prevDocs]);
  }, []);
  
  const addClient = useCallback((clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    setExtraClients(prevClients => {
      // Prevent adding duplicate clients based on email
      if (prevClients.some(c => c.email === clientData.email) || documents.some(d => d.clientEmail === clientData.email)) {
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
    
    return Array.from(allClientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [documents, extraClients]);


  return (
    <DocumentContext.Provider value={{ documents, addDocument, clients, addClient }}>
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
