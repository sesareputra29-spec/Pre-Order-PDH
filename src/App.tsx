import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { PanitiaLayout } from './components/PanitiaLayout';
import { MahasiswaLayout } from './components/MahasiswaLayout';
import { api } from './services/apiClient';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Check saved session on mount and restore without logging out
    const restoreSession = async () => {
      const savedUser = api.getUser() || (() => {
        const raw = sessionStorage.getItem('pdh_user_session');
        return raw ? JSON.parse(raw) : null;
      })();

      if (savedUser) {
        setUser(savedUser);
        // Verify token with backend
        try {
          const verify = await api.verifySession();
          if (verify.success && verify.data) {
            setUser(verify.data);
          }
        } catch {
          // If network is offline, keep the locally saved session
        }
      }
      setIsCheckingSession(false);
    };

    restoreSession();
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    api.setUser(loggedInUser);
    sessionStorage.setItem('pdh_user_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    api.clearAuth();
    setUser(null);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Memulihkan Sesi...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-900">
      <Navbar
        user={user}
        onLogout={handleLogout}
      />

      {user.role === 'PANITIA' ? (
        <PanitiaLayout
          user={user}
        />
      ) : (
        <MahasiswaLayout user={user} />
      )}
    </div>
  );
}
