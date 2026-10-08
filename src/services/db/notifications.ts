import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification, OperationType, handleFirestoreError } from './types';
import { defaultSeedNotifications } from './initialData';

const LOCAL_STORAGE_NOTIFS_KEY = 'sibtq_notifications_v1';

function getLocalNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const seeded = defaultSeedNotifications.map((n, i) => ({
      ...n,
      id: `notif_seed_${i + 1}`
    }));
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return defaultSeedNotifications.map((n, i) => ({
      ...n,
      id: `notif_seed_${i + 1}`
    }));
  }
}

function saveLocalNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.warn("Could not save notifications to localStorage", e);
  }
}

export function getStoredNotifications(): AppNotification[] {
  return getLocalNotifications();
}

/**
 * Real-time listener for notifications from Firestore
 * Fallbacks seamlessly to localStorage if Firestore is empty or offline
 */
export function subscribeNotifications(
  userIdentifier: string,
  userRole: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const notifCollectionRef = collection(db, 'notifications');
  const q = query(notifCollectionRef, orderBy('createdAt', 'desc'));

  let isFirstSnap = true;

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      if (!snapshot.empty) {
        const notifs: AppNotification[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            message: data.message || '',
            type: data.type || 'info',
            targetRole: data.targetRole || 'all',
            link: data.link || '',
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'Admin'
          };
        });

        // Filter based on target role
        const filtered = notifs.filter(n => 
          n.targetRole === 'all' || 
          n.targetRole === userRole || 
          (userRole === 'admin')
        );

        saveLocalNotifications(notifs);
        onUpdate(filtered);
      } else {
        // If collection in Firestore is empty on first snapshot, seed default notifications to Firestore
        if (isFirstSnap) {
          isFirstSnap = false;
          try {
            for (const item of defaultSeedNotifications) {
              await addDoc(notifCollectionRef, item);
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'notifications');
          }
        }
        
        const local = getLocalNotifications();
        const filtered = local.filter(n => 
          n.targetRole === 'all' || 
          n.targetRole === userRole || 
          (userRole === 'admin')
        );
        onUpdate(filtered);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      // Offline fallback
      const local = getLocalNotifications();
      const filtered = local.filter(n => 
        n.targetRole === 'all' || 
        n.targetRole === userRole || 
        (userRole === 'admin')
      );
      onUpdate(filtered);
    }
  );

  return unsubscribe;
}

/**
 * Creates and dispatches a new real-time notification
 */
export async function createNotification(
  notif: Omit<AppNotification, 'id'>
): Promise<string> {
  const newNotif = {
    ...notif,
    readBy: notif.readBy || [],
    createdAt: notif.createdAt || new Date().toISOString()
  };

  // 1. Update local cache immediately
  const local = getLocalNotifications();
  const tempId = `notif_${Date.now()}`;
  const updatedLocal = [{ id: tempId, ...newNotif }, ...local];
  saveLocalNotifications(updatedLocal);

  // 2. Persist to Firestore
  try {
    const docRef = await addDoc(collection(db, 'notifications'), newNotif);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'notifications');
    return tempId;
  }
}

/**
 * Mark a single notification as read by the current user
 */
export async function markNotificationAsRead(
  notifId: string,
  userIdentifier: string
): Promise<void> {
  if (!userIdentifier || !notifId) return;

  // 1. Update local
  const local = getLocalNotifications();
  const target = local.find(n => n.id === notifId);
  if (target && !target.readBy.includes(userIdentifier)) {
    target.readBy.push(userIdentifier);
    saveLocalNotifications(local);
  }

  // 2. Update Firestore
  try {
    const docRef = doc(db, 'notifications', notifId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const currentReadBy: string[] = snap.data().readBy || [];
      if (!currentReadBy.includes(userIdentifier)) {
        await updateDoc(docRef, {
          readBy: [...currentReadBy, userIdentifier]
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

/**
 * Mark all visible notifications as read by the current user
 */
export async function markAllNotificationsAsRead(
  notifIds: string[],
  userIdentifier: string
): Promise<void> {
  if (!userIdentifier || notifIds.length === 0) return;

  // 1. Update local
  const local = getLocalNotifications();
  local.forEach(n => {
    if (notifIds.includes(n.id) && !n.readBy.includes(userIdentifier)) {
      n.readBy.push(userIdentifier);
    }
  });
  saveLocalNotifications(local);

  // 2. Update Firestore documents
  for (const notifId of notifIds) {
    try {
      const docRef = doc(db, 'notifications', notifId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const currentReadBy: string[] = snap.data().readBy || [];
        if (!currentReadBy.includes(userIdentifier)) {
          await updateDoc(docRef, {
            readBy: [...currentReadBy, userIdentifier]
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
    }
  }
}

/**
 * Delete a notification (Admin feature)
 */
export async function deleteNotification(notifId: string): Promise<void> {
  // 1. Update local
  const local = getLocalNotifications();
  const filtered = local.filter(n => n.id !== notifId);
  saveLocalNotifications(filtered);

  // 2. Update Firestore
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}
