import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export interface PayPalLogPayload {
  action: string;
  payerRole?: 'guest' | 'host' | 'admin';
  payerEmail?: string | null;
  receiverRole?: 'guest' | 'host' | 'admin';
  receiverEmail?: string | null;
  amountPHP?: number;
  amountCentavos?: number;
  bookingId?: string | null;
  transactionId?: string | null;
  notes?: Record<string, unknown>;
  status?: 'pending' | 'completed' | 'failed';
  paypalResponse?: unknown;
}

export const logPayPalEvent = async (payload: PayPalLogPayload) => {
  const entry = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (import.meta.env.DEV) {
    console.log('🧾 PayPal Log Entry:', entry);
  }

  try {
    await addDoc(collection(db, 'logs'), entry);
  } catch (error) {
    console.warn('⚠️ Failed to persist PayPal log entry:', error);
  }
};

