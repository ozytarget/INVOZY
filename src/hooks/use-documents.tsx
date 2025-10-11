'use client';

import { Document, Client } from '@/lib/types';
import { initialDocuments } from '@/lib/data';
import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

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

  const addDocument = (doc: Document) => {
    setDocuments(prevDocs => [doc, ...prevDocs]);
  };
  
  const addClient = (client: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    const newClient: Client = {
      ...client,
      totalBilled: 0,
      documentCount: 0,
    };
    setExtraClients(prev => [...prev, newClient]);
  };
  
  const clients = useMemo(() => {
    const clientsFromDocs = getClientsFromDocuments(documents);
    const allClientsMap = new Map<string, Client>();

    // Add clients from documents first
    clientsFromDocs.forEach(c => allClientsMap.set(c.email, c));

    // Add manually created clients, updating existing ones if necessary
    extraClients.forEach(c => {
      const existing = allClientsMap.get(c.email);
      if (!existing) {
        allClientsMap.set(c.email, c);
      }
    });
    
    return Array.from(allClientsMap.values());
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
