import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import IsisChat from './IsisChat';
import { ToastContainer } from './Toast';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Basic verification of login success previously stored
    const user = localStorage.getItem('isis_user');
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isis_user');
    setIsAuthenticated(false);
  };

  // Sequestra a Tela se o Pathname for a aba do Cliente
  if (currentPath.startsWith('/hidden/') || currentPath.startsWith('/hiden/')) {
    const divider = currentPath.startsWith('/hidden/') ? '/hidden/' : '/hiden/';
    const nomeUrl = currentPath.split(divider)[1];
    return (
      <>
        <IsisChat nomeAcesso={nomeUrl} />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onSuccess={() => setIsAuthenticated(true)} />
      )}
      <ToastContainer />
    </>
  );
}

export default App;
