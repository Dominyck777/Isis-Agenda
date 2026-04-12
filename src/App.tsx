import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import IsisChat from './IsisChat';
import LicenseBlock from './LicenseBlock';
import { supabase } from './lib/supabase';
import { supabaseControl } from './lib/supabaseControl';
import { ToastContainer, toast } from './Toast';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);

  useEffect(() => {
    // Basic verification of login success previously stored
    const userStr = localStorage.getItem('isis_user');
    if (userStr) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      checkLicense();
      // Verificação automática a cada 2 minutos
      const interval = setInterval(checkLicense, 120000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkLicense = async () => {
    try {
      const userStr = localStorage.getItem('isis_user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      setIsCheckingLicense(true);

      // 1. Buscar o codigodev na base principal
      const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .select('codigodev')
        .eq('codigo', user.codigo_empresa)
        .single();

      if (empError || !empresa?.codigodev) {
        console.error('Erro ao buscar codigodev:', empError);
        setIsCheckingLicense(false);
        return;
      }

      // 2. Verificar status na base de controle (Supabase Secundário)
      const { data: controlData, error: controlError } = await supabaseControl
        .from('clientes')
        .select('status')
        .eq('code', empresa.codigodev)
        .single();

      if (controlError) {
        console.error('Erro na base de controle:', controlError);
        setIsCheckingLicense(false);
        return;
      }

      if (controlData) {
        setLicenseStatus(controlData.status);
        if (controlData.status === 'ativo' && licenseStatus === 'pendente') {
           // Se acabou de regularizar, dá o feedback
           toast('Acesso liberado! Bem-vindo de volta.', 'success');
        }
      }
    } catch (err) {
      console.error('Erro crítico na verificação de licença:', err);
    } finally {
      setIsCheckingLicense(false);
    }
  };

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

  // Sequestra a Tela se o Pathname for a aba do Cliente ou um slug direto
  if (currentPath !== '/' && !currentPath.includes('.')) {
    let nomeUrl = '';
    if (currentPath.startsWith('/hidden/') || currentPath.startsWith('/hiden/')) {
      const divider = currentPath.startsWith('/hidden/') ? '/hidden/' : '/hiden/';
      nomeUrl = currentPath.split(divider)[1];
    } else {
      // Slug direto: /hairstylesalon -> hairstylesalon
      nomeUrl = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;
    }

    if (nomeUrl) {
      return (
        <>
          <IsisChat nomeAcesso={nomeUrl} />
          <ToastContainer />
        </>
      );
    }
  }

  if (licenseStatus === 'pendente') {
    return <LicenseBlock onCheckAgain={checkLicense} isChecking={isCheckingLicense} />;
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
