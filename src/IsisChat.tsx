import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import './IsisChat.css';

const ISend = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const IEmail = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;

const IPhone = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.273-3.973-6.869-6.869l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;

export default function IsisChat({ nomeAcesso }: { nomeAcesso: string }) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<'fetching' | 'premium_wait' | 'chat'>('fetching');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [inputType, setInputType] = useState<'phone' | 'email'>(window.innerWidth < 768 ? 'email' : 'phone');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pega a URL string e tira - pra facilitar fallback
  const decodedNome = decodeURIComponent(nomeAcesso).replace(/-/g, '').toLowerCase();

  useEffect(() => {
    loadCompany();

    // Ajuste dinâmico de altura para mobile (Teclado)
    const vv = window.visualViewport;
    if (vv) {
      const handleResize = () => {
        if (containerRef.current) {
          containerRef.current.style.height = `${vv.height}px`;
          scrollToBottom('smooth');
        }
      };
      vv.addEventListener('resize', handleResize);
      return () => vv.removeEventListener('resize', handleResize);
    }
  }, []);
  
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const handleInputFocus = () => {
    // Aguarda o teclado subir e o viewport redimensionar no mobile
    setTimeout(() => scrollToBottom('smooth'), 300);
  };

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
             setIsTyping(true);
             setTimeout(() => {
                setIsTyping(false);
                startWelcomeFlow(matched);
             }, 4000);
          }, 4000);
       } else {
          setLoading(false); // NotFound
       }
    } else {
       setLoading(false); // NotFound
    }
  };

  const startWelcomeFlow = (emp: any) => {
     const greetings = [
        <>
           Opa! <strong>Boa noite!</strong> 🎤 <strong>Ísis</strong> aqui, sua assistente virtual da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
           Vamos <strong>marcar seu horário</strong>? É rapidinho!<br/><br/>
           Me informa seu <strong>telefone</strong> ou <strong>e-mail</strong> para começarmos:
        </>,
        <>
           Oi! Tudo bem? ✨ Sou a <strong>Ísis</strong>, assistente oficial da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
           Estou pronta para <strong>agendar seu horário</strong>. É bem simples!<br/><br/>
           Qual o seu <strong>telefone</strong> ou <strong>e-mail</strong>?
        </>,
        <>
           Olá! Que bom te ver por aqui! 💜 Meu nome é <strong>Ísis</strong>, e gerencio as reservas da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
           Quer <strong>garantir seu horário</strong> conosco?<br/><br/>
           Por favor, digite seu <strong>telefone</strong> ou <strong>e-mail</strong>:
        </>,
        <>
           Boas-vindas! 👋 Eu sou a <strong>Ísis</strong>, a inteligência da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
           Vamos organizar seu <strong>agendamento</strong> agora mesmo?<br/><br/>
           Para iniciar, me manda o seu <strong>telefone</strong> ou <strong>e-mail</strong>:
        </>,
        <>
           Pronto, conectamos! 🚀 <strong>Ísis</strong> falando! Sou a sua assistente aqui na <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>
           Vamos logo <strong>salvar o seu horário</strong> na agenda!<br/><br/>
           Me passe seu <strong>telefone</strong> ou <strong>e-mail</strong>:
        </>
     ];
     const randomMsg = greetings[Math.floor(Math.random() * greetings.length)];

     setMessages([
        {
           id: 1,
           sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           content: randomMsg
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
      const v = e.target.value;
      if (inputType === 'phone') {
         setInputVal(applyMask(v));
      } else {
         setInputVal(v);
      }
  };

  const handleSend = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!inputVal) return;
      
      const userMsg = inputVal;
      setMessages(prev => [...prev, {
         id: Date.now(),
         sender: 'user',
         time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
         content: userMsg
      }]);
      setInputVal('');
      setIsTyping(true);

      // Busca o cliente na base de dados (Por email ou por telefone)
      let query = supabase.from('clientes').select('*').eq('codigo_empresa', empresa.codigo);
      if (inputType === 'phone') {
          query = query.eq('telefone', userMsg);
      } else {
          query = query.ilike('email', userMsg.trim());
      }

      const { data: cliData } = await query.single();
      
      setTimeout(() => {
         setIsTyping(false);
         if (cliData) {
            const firstName = cliData.nome.split(' ')[0];
            const greetClient = [
               `Que bom te ver de novo, **${firstName}**! 😊 O que vamos fazer hoje?`,
               `Olá, **${firstName}**! Tudo certinho? ✨ Como posso te ajudar hoje?`,
               `Bem-vindo(a) de volta, **${cliData.nome}**! 💜 Qual sua necessidade agora?`,
               `É maravilhoso ter você aqui, **${firstName}**! 🚀 O que faremos?`,
               `Oi, **${firstName}**! Já puxei sua ficha aqui! 📋 O que deseja fazer?`
            ];
            const finalGreeting = greetClient[Math.floor(Math.random() * greetClient.length)];
            
            // Formatando asteriscos para Strong nativamente
            const formattedGreeting = finalGreeting.split('**').map((text, i) => i % 2 !== 0 ? <strong key={i}>{text}</strong> : text);

            setMessages(prev => [...prev, {
               id: Date.now() + 1,
               sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
               content: (
                  <>
                    {formattedGreeting}
                    <div className="action-buttons-grid">
                       <button className="chat-action-btn" type="button">Fazer agendamento</button>
                       <button className="chat-action-btn" type="button">Editar agendamento</button>
                       <button className="chat-action-btn" type="button" onClick={() => window.location.reload()}>Informei o numero errado</button>
                       <button className="chat-action-btn cancel-btn" type="button">Finalizar atendimento</button>
                    </div>
                  </>
               )
            }]);
         } else {
            setMessages(prev => [...prev, {
               id: Date.now() + 1,
               sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
               content: `Não encontrei esse ${inputType === 'phone' ? 'telefone' : 'e-mail'} no nosso sistema. Qual o seu nome completo?`
            }]);
         }
      }, 4000);
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

  const isInputValid = inputType === 'phone' 
     ? inputVal.length === 15 
     : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal);

  return (
    <div className="isis-container" ref={containerRef}>
       <header className="isis-header">
          <div className="header-left">
             <div className="avatar-wrapper">
                <div className="isis-face small">
                   <img src="/isiscomprimentoperfil.png" alt="Ísis" />
                </div>
                <div className="online-dot"></div>
             </div>
             <div className="isis-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <h2 className="isis-name-title" style={{ margin: 0, fontSize: '1.1rem', color: '#fff', lineHeight: 1 }}>Ísis</h2>
               <span className="badge-chat">
                  <span className="badge-glow-dot" style={{ display: 'inline-block', width: '5px', height: '5px', background: '#38bdf8', borderRadius: '50%', boxShadow: '0 0 5px #38bdf8' }}></span>
                  CHAT
               </span>
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
                         <img src="/isisneutraperfil.png" alt="Ísis" />
                      </div>
                   )}
                   <div className={`chat-bubble ${msg.sender}`}>
                      <div className="bubble-text">{msg.content}</div>
                      <span className="bubble-time">{msg.time}</span>
                   </div>
                </div>
             ))}
             {isTyping && (
                <div className="chat-line isis-line">
                   <div className="isis-face chat-avatar">
                      <img src="/isisneutraperfil.png" alt="Ísis" />
                   </div>
                   <div className="chat-bubble isis" style={{ minWidth: '60px', padding: '12px 16px' }}>
                      <div className="bubble-text">
                         <div className="typing-dots"><span></span><span></span><span></span></div>
                      </div>
                   </div>
                </div>
             )}
             <div ref={chatEndRef} />
          </div>
       </main>

       <footer className="chat-footer">
          <form className="chat-input-wrapper" onSubmit={handleSend}>
             {inputType === 'phone' ? <IPhone /> : <IEmail />}
             <input 
                type={inputType === 'phone' ? 'tel' : 'email'} 
                placeholder={inputType === 'phone' ? "(00) 00000-0000" : "seu@email.com"} 
                value={inputVal}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
             />
             <button type="submit" className="send-btn" disabled={!isInputValid}>
                <ISend />
             </button>
          </form>
          <div className="footer-options">
             <button type="button" className="text-btn" onClick={() => { setInputType(t => t === 'phone' ? 'email' : 'phone'); setInputVal(''); }}>
                {inputType === 'phone' ? <><IEmail /> Prefiro usar e-mail</> : <><IPhone /> Prefiro usar telefone</>}
             </button>
          </div>
       </footer>
    </div>
  );
}
