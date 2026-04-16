import React, { useState, useEffect, lazy, Suspense } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import IsisChat from './IsisChat';
import LicenseBlock from './LicenseBlock';
import { supabase } from './lib/supabase';
import { supabaseControl } from './lib/supabaseControl';
import { ToastContainer } from './Toast';
import './App.css';

// Carregamento dinâmico seguro: Se o arquivo não existir (como em produção/Github), retorna nulo
const LocalDevTools = lazy(() => 
  import('./DeveloperTools').catch(() => ({ default: () => null }))
);

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
                    window.location.reload();
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
            window.location.reload();
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
  const [hostname] = useState(window.location.hostname);

  // ROTA DE FERRAMENTAS DO DESENVOLVEDOR (Localhost apenas e carregamento seguro)
  if (hostname === 'localhost' && currentPath === '/sql-generator') {
    return (
      <Suspense fallback={null}>
        <LocalDevTools />
        <ToastContainer />
      </Suspense>
    );
  }

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isis_user');
    setIsAuthenticated(false);
  };

  // Lógica de Subdomínio Wildcard
  let subdomain = '';
  const hostParts = hostname.split('.');
  
  // LOG PARA DIAGNÓSTICO
  console.log('DEBUG HOSTNAME:', hostname, 'PARTS:', hostParts);

  // Detecta se estamos em um subdomínio (ex: empresa.isisagenda.com ou empresa.localhost)
  // Ajustado para capturar qualquer coisa que venha ANTES de isisagenda.com
  if (hostParts.length >= 3 && hostname.includes('isisagenda.com')) {
    const index = hostParts.indexOf('isisagenda');
    if (index > 0 && hostParts[0] !== 'www') {
      subdomain = hostParts[0];
    }
  } else if (hostname.includes('localhost') && hostParts.length > 1) {
    subdomain = hostParts[0];
  }

  console.log('DEBUG SUBDOMAIN DETECTED:', subdomain);

  // Sequestra a Tela se houver subdomínio ou se o Pathname for a aba do Cliente ou um slug direto
  if (subdomain || (currentPath !== '/' && !currentPath.includes('.'))) {
    let nomeUrl = subdomain;
    
    if (!nomeUrl) {
      if (currentPath.startsWith('/hidden/') || currentPath.startsWith('/hiden/')) {
        const divider = currentPath.startsWith('/hidden/') ? '/hidden/' : '/hiden/';
        nomeUrl = currentPath.split(divider)[1];
      } else {
        // Slug direto: /hairstylesalon -> hairstylesalon
        nomeUrl = currentPath.startsWith('/') ? currentPath.slice(1) : currentPath;
      }
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
