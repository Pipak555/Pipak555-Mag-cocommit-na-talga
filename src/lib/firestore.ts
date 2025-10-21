import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Listing, Booking, Review, Message, Transaction } from '@/types';

// Listings
export const createListing = async (data: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'listings'), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const updateListing = async (id: string, data: Partial<Listing>) => {
  await updateDoc(doc(db, 'listings', id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteListing = async (id: string) => {
  await deleteDoc(doc(db, 'listings', id));
};

export const getListing = async (id: string) => {
  const docSnap = await getDoc(doc(db, 'listings', id));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Listing;
  }
  return null;
};

export const getListings = async (filters?: { category?: string; status?: string; hostId?: string }) => {
  let q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
  
  if (filters?.category) {
    q = query(q, where('category', '==', filters.category));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.hostId) {
    q = query(q, where('hostId', '==', filters.hostId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
};

// Bookings
export const createBooking = async (data: Omit<Booking, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'bookings'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const updateBooking = async (id: string, data: Partial<Booking>) => {
  await updateDoc(doc(db, 'bookings', id), data);
};

export const getBookings = async (filters?: { guestId?: string; hostId?: string; status?: string }) => {
  let q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
  
  if (filters?.guestId) {
    q = query(q, where('guestId', '==', filters.guestId));
  }
  if (filters?.hostId) {
    q = query(q, where('hostId', '==', filters.hostId));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

// Reviews
export const createReview = async (data: Omit<Review, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'reviews'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getListingReviews = async (listingId: string) => {
  const q = query(
    collection(db, 'reviews'), 
    where('listingId', '==', listingId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
};

// Messages
export const sendMessage = async (data: Omit<Message, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getMessages = async (userId: string) => {
  const q = query(
    collection(db, 'messages'),
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
};

// Transactions
export const createTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const getUserTransactions = async (userId: string) => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
};

// Storage
export const uploadImage = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const uploadListingImages = async (files: File[], listingId: string) => {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], `listings/${listingId}/${i}`);
    urls.push(url);
  }
  return urls;
};

// User favorites
export const toggleFavorite = async (userId: string, listingId: string, favorites: string[]) => {
  const newFavorites = favorites.includes(listingId)
    ? favorites.filter(id => id !== listingId)
    : [...favorites, listingId];
  
  await updateDoc(doc(db, 'users', userId), { favorites: newFavorites });
  return newFavorites;
};
