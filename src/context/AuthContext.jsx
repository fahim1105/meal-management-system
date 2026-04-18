import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from '../firebase/config';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL;

  const getAuthHeaders = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        return { Authorization: `Bearer ${token}` };
      } catch {
        return {};
      }
    }
    return {};
  };

  const register = async (email, password, name) => {
    if (!auth) {
      burgerToast.error('Firebase not configured. Please set up Firebase first.');
      throw new Error('Firebase not configured');
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      const response = await axios.post(`${API_URL}/auth/register`, 
        { name, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setUserData(response.data.user);
      return response.data.user;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      burgerToast.error(errorMessage);
      throw error;
    }
  };

  const login = async (email, password) => {
    if (!auth) {
      burgerToast.error('Firebase not configured. Please set up Firebase first.');
      throw new Error('Firebase not configured');
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      burgerToast.success('Login successful!');
    } catch (error) {
      burgerToast.error(error.message);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) return;
    
    try {
      await signOut(auth);
      setUserData(null);
      burgerToast.success('Logged out successfully');
    } catch (error) {
      burgerToast.error(error.message);
    }
  };

  const fetchUserData = async (user) => {
    if (!user) return;
    setUserDataLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/auth/me`, { headers });
      setUserData(response.data.user);
    } catch {
      // silently fail
    } finally {
      setUserDataLoading(false);
    }
  };

  const updateProfileData = async ({ name, photoFile }) => {
    try {
      const headers = await getAuthHeaders();
      let photoURL = userData?.photoURL || null;

      if (photoFile) {
        const formData = new FormData();
        formData.append('image', photoFile);
        const imgbbRes = await axios.post(
          `https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`,
          formData
        );
        photoURL = imgbbRes.data.data.url;
      }

      const res = await axios.put(`${API_URL}/auth/profile`, { name, photoURL }, { headers });
      setUserData(res.data.user);
      burgerToast.success('Profile updated');
    } catch (error) {
      burgerToast.error('Failed to update profile');
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      burgerToast.success('Password changed successfully');
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        burgerToast.error('Current password is incorrect');
      } else {
        burgerToast.error('Failed to change password');
      }
      throw error;
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserData(user);
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    getAuthHeaders,
    fetchUserData,
    userDataLoading,
    updateProfileData,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
