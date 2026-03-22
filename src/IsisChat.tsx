import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import './IsisChat.css';

const ISend = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const IEmail = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;

const IPhone = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.273-3.973-6.869-6.869l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;

export default function IsisChat({ nomeAcesso }: { nomeAcesso: string }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<'fetching' | 'premium_wait' | 'chat'>('fetching');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState('');

  // Pega a URL string e tira - pra facilitar fallback
  const decodedNome = decodeURIComponent(nomeAcesso).replace(/-/g, '').toLowerCase();

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    // Busca todas as empresas (são poucas) para fazer um match flexível ignorando espaços
    const { data } = await supabase.from('empresas').select('*');
    if (data) {
       const matched = data.find(emp => 
          (emp.nome_exibicao || '').replace(/[\s-]/g, '').toLowerCase() === decodedNome 
          || 
          (emp.nome_fantasia || '').replace(/[\s-]/g, '').toLowerCase() === decodedNome
       );
       
       if (matched) {
          setEmpresa(matched);
          setLoadingState('premium_wait');
       
          // Simulando o Loading Premium da Ísis por uns segundinhos
          setTimeout(() => {
             setLoadingState('chat');
             startWelcomeFlow(matched);
          }, 2500);
       } else {
          setLoading(false); // NotFound
       }
    } else {
       setLoading(false); // NotFound
    }
  };

  const startWelcomeFlow = (emp: any) => {
     setMessages([
        {
           id: 1,
           sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           content: (
              <>
                 Opa! <strong>Boa noite!</strong> 🎤 <strong>Ísis</strong> aqui, sua assistente virtual da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
                 Vamos <strong>marcar seu horário</strong>? É rapidinho!<br/><br/>
                 Me informa seu <strong>telefone</strong> ou <strong>e-mail</strong>:
              </>
           )
        }
     ]);
  };

  const applyMask = (v: string) => {
    let r = v.replace(/\D/g, '');
    if (r.length > 11) r = r.slice(0, 11);
    if (r.length > 10) return `(${r.slice(0,2)}) ${r.slice(2,7)}-${r.slice(7)}`;
    if (r.length > 6) return `(${r.slice(0,2)}) ${r.slice(2,6)}-${r.slice(6)}`;
    if (r.length > 2) return `(${r.slice(0,2)}) ${r.slice(2)}`;
    return r;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Se for numero padroniza pra phone mask, senao deixa escrever email livre
      const v = e.target.value;
      if (v.length > 0 && /^[0-9() -]+$/.test(v)) {
         setInputVal(applyMask(v));
      } else {
         setInputVal(v);
      }
  };

  const handleSend = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!inputVal) return;
      // Proximos passos do fluxo serao adicionados aqui.
      setMessages(prev => [...prev, {
         id: Date.now(),
         sender: 'user',
         time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
         content: inputVal
      }]);
      setInputVal('');
  };

  if (loadingState === 'fetching' || (!empresa && loading)) {
    return <div className="isis-container" style={{ backgroundColor: '#0d0d0f' }}></div>;
  }

  if (!empresa) {
    return <div className="isis-container" style={{ justifyContent: 'center', color: '#ef4444' }}><h2>Empresa "{decodedNome}" não encontrada.</h2></div>;
  }

  if (loadingState === 'premium_wait') {
    return (
      <div className="isis-container premium-loading">
         <div className="fluid-bg">
            <div className="fluid-blob blob-1"></div>
            <div className="fluid-blob blob-2"></div>
            <div className="fluid-blob blob-3"></div>
         </div>
         
         <div className="pulsing-avatar">
            <div className="isis-face">
               <img src="/isiscomprimentoperfil.png" alt="Ísis" />
            </div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay"></div>
         </div>
         <h2 className="loading-text">Conectando à Ísis...</h2>
         <p style={{ color: 'var(--text-muted)', zIndex: 10 }}>Preparando a agenda da {empresa.nome_exibicao}</p>
      </div>
    );
  }

  return (
    <div className="isis-container">
       <header className="isis-header">
          <div className="header-left">
             <div className="avatar-wrapper">
                <div className="isis-face small">
                   <img src="/isiscomprimentoperfil.png" alt="Ísis" />
                </div>
                <div className="online-dot"></div>
             </div>
             <div className="isis-info">
               <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Ísis</h2>
               <span className="badge-chat">💬 chat • •</span>
             </div>
          </div>

          <div className="header-center">
             <div className="pill-company">
                {empresa.logo_url ? (
                   <img src={empresa.logo_url} alt="Logo" />
                ) : (
                   <div className="pill-logo-fallback">{empresa.nome_exibicao.charAt(0)}</div>
                )}
                <span>{empresa.nome_fantasia || empresa.nome_exibicao}</span>
             </div>
          </div>

          <div className="header-right">
             <div className="company-watermark" style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/fluxo7teamcut.png" alt="Fluxo7" style={{ height: '64px', objectFit: 'contain', opacity: 0.9 }} />
             </div>
          </div>
       </header>

       <main className="chat-window">
          <div className="chat-content">
             {messages.map(msg => (
                <div key={msg.id} className={`chat-line ${msg.sender === 'user' ? 'user-line' : 'isis-line'}`}>
                   {msg.sender === 'isis' && (
                      <div className="isis-face chat-avatar">
                         <img src="/isiscomprimentoperfil.png" alt="Ísis" />
                      </div>
                   )}
                   <div className={`chat-bubble ${msg.sender}`}>
                      <div className="bubble-text">{msg.content}</div>
                      <span className="bubble-time">{msg.time}</span>
                   </div>
                </div>
             ))}
          </div>
       </main>

       <footer className="chat-footer">
          <form className="chat-input-wrapper" onSubmit={handleSend}>
             <IPhone />
             <input 
                type="text" 
                placeholder="(00) 00000-0000" 
                value={inputVal}
                onChange={handleInputChange}
             />
             <button type="submit" className="send-btn" disabled={!inputVal}>
                <ISend />
             </button>
          </form>
          <div className="footer-options">
             <button type="button" className="text-btn">
                <IEmail /> Prefiro usar e-mail
             </button>
          </div>
       </footer>
    </div>
  );
}
