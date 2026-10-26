import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { mockMentors } from '../services/mockData';
import { getStoredSchoolConfig } from '../services/schoolConfig';

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
    let isMounted = true;

    // Listener untuk pembaruan profil instan
    const handleProfileUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      setUserData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: detail.name || prev.name,
          signature: detail.signature !== undefined ? detail.signature : prev.signature,
          nip: detail.nip !== undefined ? detail.nip : prev.nip,
        };
      });
    };
    window.addEventListener('user_profile_updated', handleProfileUpdated);

    // Safety timeout: ensure loading state never hangs indefinitely
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      try {
        if (user && user.email) {
          setCurrentUser(user);
          const emailLower = user.email.toLowerCase();
          
          // Check if admin (hardcoded admin email or fetch from users collection)
          if (emailLower === 'admin@smpn102.sch.id' || emailLower.startsWith('admin@')) {
            setUserRole('admin');
            const schoolCfg = getStoredSchoolConfig();
            setUserData({ 
              name: schoolCfg.coordinatorName || 'Administrator', 
              email: user.email, 
              role: 'admin',
              nip: schoolCfg.coordinatorNip || '',
              signature: schoolCfg.coordinatorSignature || ''
            });
          } else {
            // Check mock mentors first as immediate fallback
            const matchedMentor = mockMentors.find(m => m.email.toLowerCase() === emailLower);
            
            // Extract alumni number if applicable
            const username = emailLower.split('@')[0];
            const matchAlumni = username.match(/\d+/);
            const alumniNum = matchAlumni ? parseInt(matchAlumni[0], 10) : 1;
            const defaultGroupId = `g${alumniNum}`;
            const defaultMentorName = username.startsWith('alumni') ? `Kak Alumni ${alumniNum}` : `Ustadz/ah ${username.charAt(0).toUpperCase() + username.slice(1)}`;

            try {
              // Cek dokumen di collection mentors terlebih dahulu untuk mendapatkan nama dan tanda tangan kustom
              let mentorDocData: any = null;
              try {
                const mentorDocRef = doc(db, 'mentors', `m${alumniNum}`);
                const mentorSnap = await getDoc(mentorDocRef);
                if (mentorSnap.exists()) {
                  mentorDocData = mentorSnap.data();
                }
              } catch {}

              const q = query(collection(db, 'users'), where('email', '==', user.email));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                const data = snapshot.docs[0].data() as any;
                const uData = { 
                  id: snapshot.docs[0].id, 
                  ...data,
                  name: mentorDocData?.name || data.name || defaultMentorName,
                  signature: mentorDocData?.signature || data.signature || ''
                };
                if (!uData.groupId) uData.groupId = defaultGroupId;
                setUserData(uData);
                setUserRole(uData?.role || 'mentor');
              } else if (mentorDocData) {
                setUserData({
                  id: `m${alumniNum}`,
                  name: mentorDocData.name || (matchedMentor ? matchedMentor.name : defaultMentorName),
                  email: user.email,
                  role: 'mentor',
                  groupId: defaultGroupId,
                  signature: mentorDocData.signature || ''
                });
                setUserRole('mentor');
              } else if (matchedMentor) {
                setUserData({ ...matchedMentor, role: 'mentor' });
                setUserRole('mentor');
              } else {
                // Generic mentor
                setUserData({
                  id: `m_${username}`,
                  name: defaultMentorName,
                  email: user.email,
                  role: 'mentor',
                  groupId: defaultGroupId,
                  signature: ''
                });
                setUserRole('mentor');
              }
            } catch (error) {
              console.warn("Firestore offline or query error, using local mentor profile:", error);
              if (matchedMentor) {
                setUserData({ ...matchedMentor, role: 'mentor' });
                setUserRole('mentor');
              } else {
                setUserData({
                  id: `m_${username}`,
                  name: defaultMentorName,
                  email: user.email,
                  role: 'mentor',
                  groupId: defaultGroupId,
                  signature: ''
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
      } catch (err) {
        console.error("Auth state handling error:", err);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('user_profile_updated', handleProfileUpdated);
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#172033] gap-4 select-none">
          <div className="animate-spin w-9 h-9 border-4 border-[#0362D0] border-t-transparent rounded-full shadow-md"></div>
          <span className="text-xs font-bold text-slate-300 tracking-wider">Memverifikasi Sesi...</span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

