import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { PanitiaLayout } from './components/PanitiaLayout';
import { MahasiswaLayout } from './components/MahasiswaLayout';
import { GASExporterModal } from './components/GASExporterModal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGASExporterOpen, setIsGASExporterOpen] = useState(false);

  useEffect(() => {
    // Check saved session
    const saved = sessionStorage.getItem('pdh_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (e) {
        sessionStorage.removeItem('pdh_user_session');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    sessionStorage.setItem('pdh_user_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pdh_user_session');
    setUser(null);
  };

  if (!user) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenGASExporter={() => setIsGASExporterOpen(true)}
        />
        <GASExporterModal
          isOpen={isGASExporterOpen}
          onClose={() => setIsGASExporterOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-900">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenGASExporter={() => setIsGASExporterOpen(true)}
      />

      {user.role === 'PANITIA' ? (
        <PanitiaLayout
          user={user}
          onOpenGASExporter={() => setIsGASExporterOpen(true)}
        />
      ) : (
        <MahasiswaLayout user={user} />
      )}

      <GASExporterModal
        isOpen={isGASExporterOpen}
        onClose={() => setIsGASExporterOpen(false)}
      />
    </div>
  );
}
