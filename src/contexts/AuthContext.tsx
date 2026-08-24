import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { mockMentors } from '../services/mockData';

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  userData: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  userData: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser(user);
        const emailLower = user.email.toLowerCase();
        
        // Check if admin (hardcoded admin email or fetch from users collection)
        if (emailLower === 'admin@smpn102.sch.id' || emailLower.startsWith('admin@')) {
          setUserRole('admin');
          setUserData({ name: 'Administrator', email: user.email, role: 'admin' });
        } else {
          // Check mock mentors first as immediate fallback
          const matchedMentor = mockMentors.find(m => m.email.toLowerCase() === emailLower);
          
          try {
            const q = query(collection(db, 'users'), where('email', '==', user.email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data() as any;
              const uData = { id: snapshot.docs[0].id, ...data };
              setUserData(uData);
              setUserRole(uData?.role || 'mentor');
            } else if (matchedMentor) {
              setUserData({ ...matchedMentor, role: 'mentor' });
              setUserRole('mentor');
            } else {
              // Generic mentor
              const username = emailLower.split('@')[0];
              const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
              setUserData({
                id: `m_${username}`,
                name: `Ustadz/ah ${formattedName}`,
                email: user.email,
                role: 'mentor',
                groupId: 'g1'
              });
              setUserRole('mentor');
            }
          } catch (error) {
            console.warn("Firestore offline or query error, using local mentor profile:", error);
            if (matchedMentor) {
              setUserData({ ...matchedMentor, role: 'mentor' });
              setUserRole('mentor');
            } else {
              const username = emailLower.split('@')[0];
              const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
              setUserData({
                id: `m_${username}`,
                name: `Ustadz/ah ${formattedName}`,
                email: user.email,
                role: 'mentor',
                groupId: 'g1'
              });
              setUserRole('mentor');
            }
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

