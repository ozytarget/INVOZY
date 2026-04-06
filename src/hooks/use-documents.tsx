'use client';

import { Document, Client, Subcontractor, DocumentStatus, DocumentType, Payment } from '@/lib/types';
import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { useUser } from '@/providers/auth-provider';
import { readCompanySettings, writeCompanySettings } from '@/lib/company-settings';

const DEMO_CLIENTS_STORAGE_KEY = 'demoClients';
const DEMO_DOCUMENTS_STORAGE_KEY = 'demoDocuments';
const DEMO_CLIENTS_BACKUP_STORAGE_KEY = 'demoClientsBackup';
const DEMO_DOCUMENTS_BACKUP_STORAGE_KEY = 'demoDocumentsBackup';
const DEMO_SUBCONTRACTORS_STORAGE_KEY = 'demoSubcontractors';

// Optimistic locking: track server timestamp
let lastServerUpdatedAt: string | null = null;
let _conflictRefetch: (() => Promise<void>) | null = null;

const getScopedStorageKey = (baseKey: string, userId?: string | null) => {
  return userId ? `${baseKey}:${userId}` : `${baseKey}:anonymous`;
};

const safeParseArray = <T,>(raw: string | null): T[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
};

const mergeClients = (existing: Client[], incoming: Client[]) => {
  const clientMap = new Map<string, Client>();
  existing.forEach(client => clientMap.set(client.email.toLowerCase(), client));
  incoming.forEach(client => clientMap.set(client.email.toLowerCase(), client));
  return Array.from(clientMap.values());
};

const mergeDocuments = (existing: Document[], incoming: Document[]) => {
  const documentMap = new Map<string, Document>();
  existing.forEach(document => documentMap.set(document.id, document));
  incoming.forEach(document => documentMap.set(document.id, document));
  return Array.from(documentMap.values()).sort(
    (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
  );
};

const syncRemoteState = async (userId?: string | null) => {
  if (typeof window === 'undefined' || !userId) return;

  const clientsKey = getScopedStorageKey(DEMO_CLIENTS_STORAGE_KEY, userId);
  const documentsKey = getScopedStorageKey(DEMO_DOCUMENTS_STORAGE_KEY, userId);

  const clients = safeParseArray<Client>(localStorage.getItem(clientsKey)) || [];
  const documents = safeParseArray<Document>(localStorage.getItem(documentsKey)) || [];

  const companySettings = readCompanySettings(userId);

  const subcontractorsKey = getScopedStorageKey(DEMO_SUBCONTRACTORS_STORAGE_KEY, userId);
  const subcontractors = safeParseArray<Subcontractor>(localStorage.getItem(subcontractorsKey)) || [];

  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ clients, documents, companySettings, subcontractors, updated_at: lastServerUpdatedAt }),
    });

    if (res.status === 409) {
      console.warn('[sync] Conflict detected — refetching server state');
      if (_conflictRefetch) await _conflictRefetch();
      return;
    }

    if (res.ok) {
      try {
        const putResult = await res.json();
        if (putResult.updated_at) {
          lastServerUpdatedAt = putResult.updated_at;
        }
      } catch {}
    }
  } catch (error) {
    console.error('Error syncing remote state:', error);
  }
};

const persistDemoClients = (updatedClients: Client[], userId?: string | null, merge = true, skipSync = false) => {
  if (typeof window === 'undefined') return;
  const clientsKey = getScopedStorageKey(DEMO_CLIENTS_STORAGE_KEY, userId);
  const clientsBackupKey = getScopedStorageKey(DEMO_CLIENTS_BACKUP_STORAGE_KEY, userId);
  const existing = safeParseArray<Client>(localStorage.getItem(clientsKey)) || [];
  localStorage.setItem(clientsBackupKey, JSON.stringify(existing));
  const finalClients = merge ? mergeClients(existing, updatedClients) : updatedClients;
  localStorage.setItem(clientsKey, JSON.stringify(finalClients));
  if (!skipSync) void syncRemoteState(userId);
};

const persistDemoDocuments = (updatedDocuments: Document[], userId?: string | null, merge = true, skipSync = false) => {
  if (typeof window === 'undefined') return;
  const documentsKey = getScopedStorageKey(DEMO_DOCUMENTS_STORAGE_KEY, userId);
  const documentsBackupKey = getScopedStorageKey(DEMO_DOCUMENTS_BACKUP_STORAGE_KEY, userId);
  const existing = safeParseArray<Document>(localStorage.getItem(documentsKey)) || [];
  localStorage.setItem(documentsBackupKey, JSON.stringify(existing));
  const finalDocuments = merge ? mergeDocuments(existing, updatedDocuments) : updatedDocuments;
  localStorage.setItem(documentsKey, JSON.stringify(finalDocuments));
  if (!skipSync) void syncRemoteState(userId);
};

const getDemoSeedData = () => {
  return {
    clients: [] as Client[],
    documents: [] as Document[],
  };
};

const loadDemoData = (userId?: string | null) => {
  const seed = getDemoSeedData();

  if (typeof window === 'undefined') {
    return seed;
  }

  try {
    const clientsKey = getScopedStorageKey(DEMO_CLIENTS_STORAGE_KEY, userId);
    const clientsBackupKey = getScopedStorageKey(DEMO_CLIENTS_BACKUP_STORAGE_KEY, userId);
    const documentsKey = getScopedStorageKey(DEMO_DOCUMENTS_STORAGE_KEY, userId);
    const documentsBackupKey = getScopedStorageKey(DEMO_DOCUMENTS_BACKUP_STORAGE_KEY, userId);

    const legacyClients = userId
      ? safeParseArray<Client>(localStorage.getItem(DEMO_CLIENTS_STORAGE_KEY))
      : null;
    const legacyDocuments = userId
      ? safeParseArray<Document>(localStorage.getItem(DEMO_DOCUMENTS_STORAGE_KEY))
      : null;

    const clients =
      safeParseArray<Client>(localStorage.getItem(clientsKey)) ||
      safeParseArray<Client>(localStorage.getItem(clientsBackupKey)) ||
      legacyClients ||
      [];

    const documents =
      safeParseArray<Document>(localStorage.getItem(documentsKey)) ||
      safeParseArray<Document>(localStorage.getItem(documentsBackupKey)) ||
      legacyDocuments ||
      [];

    const finalClients = clients.length > 0 ? clients : seed.clients;
    const finalDocuments = documents.length > 0 ? documents : seed.documents;

    if (clients.length === 0) {
      persistDemoClients(finalClients, userId, false);
    }

    if (documents.length === 0) {
      persistDemoDocuments(finalDocuments, userId, false);
    }

    if (userId && (legacyClients?.length || legacyDocuments?.length)) {
      persistDemoClients(finalClients, userId, false);
      persistDemoDocuments(finalDocuments, userId, false);
    }

    return {
      clients: finalClients,
      documents: finalDocuments,
    };
  } catch (error) {
    console.error('Error loading demo data:', error);
    return seed;
  }
};

// Generate cryptographically secure UUID for share tokens
const generateShareToken = (): string => {
  return crypto.randomUUID();
};

// Mark past-due sent/partial invoices as Overdue
const applyOverdueStatus = (docs: Document[]): Document[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return docs.map(doc => {
    if (doc.type === 'Invoice' && (doc.status === 'Sent' || doc.status === 'Partial') && doc.dueDate) {
      const dueDate = new Date(doc.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        return { ...doc, status: 'Overdue' as DocumentStatus };
      }
    }
    return doc;
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
  updateClient: (email: string, updates: Partial<Omit<Client, 'totalBilled' | 'documentCount'>>) => Promise<void>;
  subcontractors: Subcontractor[];
  addSubcontractor: (sub: Omit<Subcontractor, 'id'>) => void;
  updateSubcontractor: (id: string, updates: Partial<Omit<Subcontractor, 'id'>>) => void;
  deleteSubcontractor: (id: string) => void;
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
  const [storedSubcontractors, setStoredSubcontractors] = useState<Subcontractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const previousDocsRef = useRef<Document[]>([]);

  // Load documents and clients from custom backend (with local fallback)
  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!user) {
      setStoredClients([]);
      setStoredSubcontractors([]);
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
        setIsLoading(true);
      }
      try {
        const response = await fetch('/api/state', { method: 'GET', credentials: 'include' });
        if (response.ok) {
          const payload = await response.json();
          const remoteClients = Array.isArray(payload.clients) ? (payload.clients as Client[]) : [];
          const remoteDocuments = Array.isArray(payload.documents) ? (payload.documents as Document[]) : [];
          const remoteSettings = payload?.companySettings && typeof payload.companySettings === 'object'
            ? payload.companySettings
            : {};
          const remoteSubcontractors = Array.isArray(payload.subcontractors) ? (payload.subcontractors as Subcontractor[]) : [];

          // Track server timestamp for optimistic locking
          lastServerUpdatedAt = payload.updated_at || null;

          setStoredClients(remoteClients);
          setStoredSubcontractors(remoteSubcontractors);

          // Server is the source of truth when it responds successfully.
          // Do NOT merge with localStorage — that would resurrect documents
          // deleted server-side (e.g. estimate→invoice conversion via public sign).
          const localDocsKey = getScopedStorageKey(DEMO_DOCUMENTS_STORAGE_KEY, user.id);
          setDocuments(applyOverdueStatus(remoteDocuments.sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime())));

          writeCompanySettings(user.id, remoteSettings);

          persistDemoClients(remoteClients, user.id, false, true);
          // Overwrite localStorage with server state
          localStorage.setItem(localDocsKey, JSON.stringify(remoteDocuments));
          const subKey = getScopedStorageKey(DEMO_SUBCONTRACTORS_STORAGE_KEY, user.id);
          localStorage.setItem(subKey, JSON.stringify(remoteSubcontractors));
          if (!silent) {
            setIsLoading(false);
          }
          return;
        }
      } catch (error) {
        console.error('Error loading backend state:', error);
      }

      const demoData = loadDemoData(user.id);
      setStoredClients(demoData.clients);
      setDocuments(applyOverdueStatus(demoData.documents));
      const subKey = getScopedStorageKey(DEMO_SUBCONTRACTORS_STORAGE_KEY, user.id);
      setStoredSubcontractors(safeParseArray<Subcontractor>(localStorage.getItem(subKey)) || []);
      if (!silent) {
        setIsLoading(false);
      }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Register conflict refetch callback for optimistic locking
  useEffect(() => {
    _conflictRefetch = () => loadData({ silent: true });
    return () => { _conflictRefetch = null; };
  }, [loadData]);

  // Detect external changes and notify user
  useEffect(() => {
    const detectChanges = () => {
      if (previousDocsRef.current.length === 0) {
        previousDocsRef.current = documents;
        return;
      }

      const changedDocs = documents.filter(newDoc => {
        const oldDoc = previousDocsRef.current.find(d => d.id === newDoc.id);
        if (!oldDoc) return false; // New doc, not external change
        return JSON.stringify(oldDoc) !== JSON.stringify(newDoc);
      });

      if (changedDocs.length > 0) {
        console.warn('⚠️ External changes detected:', changedDocs);
        // Could emit a toast here if needed:
        // toast({
        //   title: "Documents Updated",
        //   description: `${changedDocs.length} document(s) were updated elsewhere.`,
        // });
      }

      previousDocsRef.current = documents;
    };

    detectChanges();
  }, [documents]);

  useEffect(() => {
    if (!user) return;

    // Disable polling while editing to prevent data loss
    const isEditingMode = typeof window !== 'undefined' && window.location.pathname.includes('/edit/');
    if (isEditingMode) {
      console.log('⏸️ Polling disabled while editing');
      return;
    }

    const refresh = () => {
      void loadData({ silent: true });
    };

    // Keep dashboard in sync when clients sign/open docs from public links.
    const interval = window.setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [user, loadData]);

  const addDocument = useCallback(async (docData: Omit<Document, 'id' | 'userId' | 'estimateNumber' | 'invoiceNumber' | 'search_field'>): Promise<string | undefined> => {
    const currentDocs = typeof window !== 'undefined'
      ? (() => {
          try {
            const scopedDocumentsKey = getScopedStorageKey(DEMO_DOCUMENTS_STORAGE_KEY, user?.id);
            const scopedRaw = localStorage.getItem(scopedDocumentsKey);
            return scopedRaw ? (JSON.parse(scopedRaw) as Document[]) : documents;
          } catch {
            return documents;
          }
        })()
      : documents;

    const docCount = currentDocs.filter(d => d.type === docData.type).length;
    const prefix = docData.type === 'Estimate' ? 'EST' : 'INV';
    const number = (docCount + 1).toString().padStart(3, '0');
    const docNumber = `${prefix}-${number}`;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `demo-${docData.type.toLowerCase()}-${Date.now()}`;

    const newDoc: Document = {
      ...docData,
      id: newId,
      userId: user?.id || 'demo-user',
      share_token: generateShareToken(),
      estimateNumber: docData.type === 'Estimate' ? docNumber : undefined,
      invoiceNumber: docData.type === 'Invoice' ? docNumber : undefined,
      search_field: `${docData.clientName} ${docData.projectTitle} ${docNumber}`.toLowerCase(),
    };

    const updatedDocs = [newDoc, ...currentDocs].sort(
      (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
    );

    setDocuments(updatedDocs);

    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }

    return newId;
  }, [user, documents]);

  const updateDocument = useCallback(async (docId: string, docData: Partial<Document>) => {
    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const docNumber = originalDoc.type === 'Estimate' ? originalDoc.estimateNumber : originalDoc.invoiceNumber;
    const clientName = docData.clientName || originalDoc.clientName;
    const projectTitle = docData.projectTitle || originalDoc.projectTitle;

    const updatedDocs = documents.map(doc => {
      if (doc.id !== docId) return doc;
      return {
        ...doc,
        ...docData,
        search_field: `${clientName} ${projectTitle} ${docNumber}`.toLowerCase(),
      };
    });

    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const deleteDocument = useCallback(async (docId: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== docId);
    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, false, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const duplicateDocument = useCallback(async (docId: string) => {
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
  }, [documents, addDocument]);

  const addClient = useCallback(async (clientData: Omit<Client, 'totalBilled' | 'documentCount'>) => {
    const normalizedEmail = clientData.email.toLowerCase();
    const alreadyExists = storedClients.some(c => c.email.toLowerCase() === normalizedEmail);

    if (alreadyExists) {
      console.log('Client already exists');
      return;
    }

    const newClient: Client = {
      ...clientData,
      totalBilled: 0,
      documentCount: 0,
    };

    const updatedClients = [...storedClients, newClient];
    setStoredClients(updatedClients);

    if (typeof window !== 'undefined') {
      persistDemoClients(updatedClients, user?.id);
    }
  }, [user, storedClients]);

  const signAndProcessDocument = useCallback(async (docId: string, signature: string): Promise<string | undefined> => {
    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    if (originalDoc.type !== 'Estimate') {
        const updatedDocs = documents.map(doc =>
          doc.id === docId
            ? { ...doc, signature, isSigned: true, status: 'Approved' as DocumentStatus }
            : doc
        );

        setDocuments(updatedDocs);
        if (typeof window !== 'undefined') {
          persistDemoDocuments(updatedDocs, user?.id, true, true);
          await syncRemoteState(user?.id);
        }
        return undefined;
      }

      const invoiceCount = documents.filter(d => d.type === 'Invoice').length;
      const newInvoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(3, '0')}`;
      const newInvoiceId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `demo-invoice-${Date.now()}`;

      const newInvoice: Document = {
        ...originalDoc,
        id: newInvoiceId,
        userId: 'demo-user',
        share_token: generateShareToken(),
        type: 'Invoice',
        status: 'Sent',
        signature,
        isSigned: true,
        issuedDate: format(new Date(), "yyyy-MM-dd"),
        dueDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), "yyyy-MM-dd"),
        invoiceNumber: newInvoiceNumber,
        estimateNumber: undefined,
        search_field: `${originalDoc.clientName} ${originalDoc.projectTitle} ${newInvoiceNumber}`.toLowerCase(),
      };

      // Remove the original estimate and add the invoice
      const updatedDocs = [
        ...documents.filter(doc => doc.id !== docId),
        newInvoice,
      ].sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());

      setDocuments(updatedDocs);
      if (typeof window !== 'undefined') {
        persistDemoDocuments(updatedDocs, user?.id, true, true);
        await syncRemoteState(user?.id);
      }

      return newInvoiceId;
  }, [user, documents]);

  const recordPayment = useCallback(async (invoiceId: string, payment: Omit<Payment, 'id' | 'date'>) => {
    const invoice = documents.find(d => d.id === invoiceId);
    if (!invoice) return;

    const newPayment: Payment = {
      ...payment,
      id: crypto.randomUUID(),
      date: format(new Date(), "yyyy-MM-dd"),
    };

    const updatedDocs = documents.map(doc => {
      if (doc.id !== invoiceId) return doc;

      const updatedPayments = [...(doc.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newStatus: DocumentStatus = totalPaid >= doc.amount ? 'Paid' : 'Partial';

      return {
        ...doc,
        payments: updatedPayments,
        status: newStatus,
      };
    });

    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const revertInvoiceToDraft = useCallback(async (invoiceId: string) => {
    const updatedDocs = documents.map(doc => {
      if (doc.id !== invoiceId || doc.type !== 'Invoice') return doc;
      return {
        ...doc,
        status: 'Draft' as DocumentStatus,
        isSigned: false,
        signature: undefined,
        payments: [],
      };
    });

    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const revertLastPayment = useCallback(async (invoiceId: string) => {
    const invoice = documents.find(d => d.id === invoiceId && d.type === 'Invoice');
    if (!invoice) return;

    const existingPayments = invoice.payments || [];
    if (existingPayments.length === 0) return;

    const updatedPayments = existingPayments.slice(0, -1);
    const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    let newStatus: DocumentStatus = 'Draft';
    if (totalPaid > 0) {
      newStatus = 'Partial';
    } else if (invoice.isSigned) {
      newStatus = 'Sent';
    }

    const updatedDocs = documents.map(doc => {
      if (doc.id !== invoiceId || doc.type !== 'Invoice') return doc;
      return {
        ...doc,
        payments: updatedPayments,
        status: newStatus,
      };
    });

    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const sendDocument = useCallback(async (docId: string, type: DocumentType) => {
    const updatedDocs = documents.map(doc => {
      if (doc.id !== docId || doc.type !== type) return doc;
      if (doc.status !== 'Draft') return doc;
      return {
        ...doc,
        status: 'Sent' as DocumentStatus,
      };
    });

    setDocuments(updatedDocs);
    if (typeof window !== 'undefined') {
      persistDemoDocuments(updatedDocs, user?.id, true, true);
      await syncRemoteState(user?.id);
    }
  }, [user, documents]);

  const clients = useMemo(() => {
    return getCombinedClients(documents, storedClients);
  }, [documents, storedClients]);

  const updateClient = useCallback(async (email: string, updates: Partial<Omit<Client, 'totalBilled' | 'documentCount'>>) => {
    const updatedClients = storedClients.map(c =>
      c.email === email ? { ...c, ...updates } : c
    );
    // If the client wasn't in storedClients yet (derived from docs), add it
    if (!updatedClients.find(c => c.email === email)) {
      const fromDoc = documents.find(d => d.clientEmail === email);
      if (fromDoc) {
        updatedClients.push({
          name: fromDoc.clientName, email: fromDoc.clientEmail,
          phone: fromDoc.clientPhone, address: fromDoc.clientAddress,
          totalBilled: 0, documentCount: 0,
          ...updates,
        });
      }
    }
    setStoredClients(updatedClients);
    persistDemoClients(updatedClients, user?.id, false);
  }, [storedClients, documents, user?.id]);

  const persistSubcontractors = useCallback((subs: Subcontractor[]) => {
    if (typeof window === 'undefined') return;
    const key = getScopedStorageKey(DEMO_SUBCONTRACTORS_STORAGE_KEY, user?.id);
    localStorage.setItem(key, JSON.stringify(subs));
    void syncRemoteState(user?.id);
  }, [user?.id]);

  const addSubcontractor = useCallback((sub: Omit<Subcontractor, 'id'>) => {
    const newSub: Subcontractor = {
      ...sub,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`,
    };
    const updated = [...storedSubcontractors, newSub];
    setStoredSubcontractors(updated);
    persistSubcontractors(updated);
  }, [storedSubcontractors, persistSubcontractors]);

  const updateSubcontractor = useCallback((id: string, updates: Partial<Omit<Subcontractor, 'id'>>) => {
    const updated = storedSubcontractors.map(s => s.id === id ? { ...s, ...updates } : s);
    setStoredSubcontractors(updated);
    persistSubcontractors(updated);
  }, [storedSubcontractors, persistSubcontractors]);

  const deleteSubcontractor = useCallback((id: string) => {
    const updated = storedSubcontractors.filter(s => s.id !== id);
    setStoredSubcontractors(updated);
    persistSubcontractors(updated);
  }, [storedSubcontractors, persistSubcontractors]);

  return (
    <DocumentContext.Provider value={{ documents, addDocument, updateDocument, deleteDocument, duplicateDocument, clients, addClient, updateClient, subcontractors: storedSubcontractors, addSubcontractor, updateSubcontractor, deleteSubcontractor, signAndProcessDocument, recordPayment, revertInvoiceToDraft, revertLastPayment, sendDocument, isLoading }}>
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
