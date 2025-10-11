'use client';

import { Document } from '@/lib/types';
import { initialDocuments } from '@/lib/data';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DocumentContextType {
  documents: Document[];
  addDocument: (doc: Document) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const addDocument = (doc: Document) => {
    setDocuments(prevDocs => [doc, ...prevDocs]);
  };

  return (
    <DocumentContext.Provider value={{ documents, addDocument }}>
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
