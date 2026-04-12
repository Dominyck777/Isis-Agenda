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
    let channel: any;

    if (isAuthenticated) {
      // 1. Verificação inicial e setup do Realtime
      const setupMonitoring = async () => {
        const codigodev = await checkLicense();
        
        if (codigodev) {
          // 2. Configurar o Realtime para escutar mudanças no status deste cliente
          channel = supabaseControl
            .channel('license-updates')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'clientes',
                filter: `code=eq.${codigodev}`
              },
              (payload: any) => {
                const newStatus = payload.new.status;
                setLicenseStatus(prevStatus => {
                  if (newStatus === 'ativo' && prevStatus === 'pendente') {
                    toast('Acesso liberado! Bem-vindo de volta.', 'success');
                  }
                  return newStatus;
                });
              }
            )
            .subscribe();
        }
      };

      setupMonitoring();

      // 3. Fallback: Verificação automática a cada 5 minutos
      const interval = setInterval(checkLicense, 300000);
      
      return () => {
        clearInterval(interval);
        if (channel) {
          supabaseControl.removeChannel(channel);
        }
      };
    }
  }, [isAuthenticated]);

  const checkLicense = async () => {
    try {
      const userStr = localStorage.getItem('isis_user');
      if (!userStr) return null;
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
        return null;
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
        return empresa.codigodev;
      }

      if (controlData) {
        setLicenseStatus(prevStatus => {
          if (controlData.status === 'ativo' && prevStatus === 'pendente') {
            toast('Acesso liberado! Bem-vindo de volta.', 'success');
          }
          return controlData.status;
        });
      }
      
      return empresa.codigodev;
    } catch (err) {
      console.error('Erro crítico na verificação de licença:', err);
      return null;
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
