import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
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

  const handleLogout = () => {
    localStorage.removeItem('isis_user');
    setIsAuthenticated(false);
  };

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
