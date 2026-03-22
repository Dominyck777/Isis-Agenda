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
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [inputType, setInputType] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'identification' | 'registration' | 'actions'>('identification');
  const [registrationData, setRegistrationData] = useState({ nome: '', telefone: '', email: '' });
  const [isTyping, setIsTyping] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const decodedNome = decodeURIComponent(nomeAcesso).replace(/-/g, '').toLowerCase();

  useEffect(() => {
    loadCompany();

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
    setTimeout(() => scrollToBottom('smooth'), 300);
  };

  const loadCompany = async () => {
    const { data } = await supabase.from('empresas').select('*');
    if (data) {
       const matched = data.find(emp => 
          (emp.nome_exibicao || '').replace(/[\s-]/g, '').toLowerCase() === decodedNome 
          || 
          (emp.nome_fantasia || '').replace(/[\s-]/g, '').toLowerCase() === decodedNome
       );
       
       if (matched) {
          setEmpresa(matched);
          loadDependencies(matched.codigo);
          setLoadingState('premium_wait');
          setTimeout(() => {
             setLoadingState('chat');
             setIsTyping(true);
             setTimeout(() => {
                setIsTyping(false);
                startWelcomeFlow(matched);
             }, 2000);
          }, 2000);
       } else {
          setLoading(false);
       }
    } else {
       setLoading(false);
    }
  };

  const loadDependencies = async (empId: any) => {
    const { data: svcs } = await supabase
      .from('servicos')
      .select('*')
      .eq('codigo_empresa', empId)
      .eq('ativo', true)
      .order('nome', { ascending: true });
    
    const { data: profs } = await supabase
      .from('usuarios')
      .select('codigo, nome')
      .eq('codigo_empresa', empId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (svcs) setServices(svcs);
    if (profs) setProfessionals(profs);
  };

  const startWelcomeFlow = (emp: any) => {
     const greetings = [
        <>Opa! <strong>Boa noite!</strong> 🎤 <strong>Ísis</strong> aqui, sua assistente virtual da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>Vamos <strong>marcar seu horário</strong>? É rapidinho!<br/><br/>Me informa seu <strong>telefone</strong> ou <strong>e-mail</strong> para começarmos:</>,
        <>Oi! Tudo bem? ✨ Sou a <strong>Ísis</strong>, assistente oficial da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>Estou pronta para <strong>agendar seu horário</strong>. É bem simples!<br/><br/>Qual o seu <strong>telefone</strong> ou <strong>e-mail</strong>?</>,
        <>Olá! Que bom te ver por aqui! 💜 Meu nome é <strong>Ísis</strong>, e gerencio as reservas da <strong>{emp.nome_fantasia || emp.nome_exibicao}</strong>!<br/><br/>Quer <strong>garantir seu horário</strong> conosco?<br/><br/>Por favor, digite seu <strong>telefone</strong> ou <strong>e-mail</strong>:</>
     ];
     const randomMsg = greetings[Math.floor(Math.random() * greetings.length)];
     setMessages([{
        id: 1, sender: 'isis',
        time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
        content: randomMsg
     }]);
  };

  const formatMarkdown = (text: string) => {
    return text.split('**').map((item, i) => i % 2 !== 0 ? <strong key={i}>{item}</strong> : item);
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
      if (inputType === 'phone') setInputVal(applyMask(v));
      else setInputVal(v);
  };

  const handleSend = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!inputVal) return;
      
      const userMsg = inputVal;
      setMessages(prev => [...prev, {
         id: Date.now(), sender: 'user',
         time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
         content: userMsg
      }]);
      setInputVal('');
      setIsTyping(true);

      let query = supabase.from('clientes').select('*').eq('codigo_empresa', empresa.codigo);
      if (inputType === 'phone') {
          // Usamos filter direto para evitar problemas com caracteres especiais no telefone
          query = query.filter('telefone', 'eq', userMsg);
      } else {
          query = query.ilike('email', userMsg.trim());
      }

      const { data: cliData } = await query.single();
      
      setTimeout(() => {
         setIsTyping(false);
         if (cliData) {
            setStep('actions');
            const firstName = (cliData.nome || '').split(' ')[0];
            showMenu(`Que bom te ver de novo, **${firstName}**! 😊`);
         } else {
            setStep('registration');
            setTimeout(() => scrollToBottom('smooth'), 100);
            setRegistrationData({
               nome: '',
               telefone: inputType === 'phone' ? userMsg : '',
               email: inputType === 'email' ? userMsg : ''
            });

            setMessages(prev => [...prev, {
               id: Date.now() + 1, sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
               content: "Ops! Não encontrei o seu cadastro ainda. Mas não tem problema! 😊 Vamos fazer agora rapidinho para você poder agendar?"
            }]);
         }
      }, 2000);
  };

  const showMenu = (customGreeting?: string) => {
    setIsTyping(true);
    setTimeout(() => {
       setIsTyping(false);
       setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
          content: (
             <>
                {formatMarkdown(customGreeting || "O que você deseja fazer agora? Escolha uma opção abaixo:")}
                <div className="action-buttons-grid">
                   <button className="chat-action-btn" type="button" onClick={() => handleServiceSelectionFlow()}>✨ Fazer agendamento</button>
                   <button className="chat-action-btn" type="button">📝 Editar agendamento</button>
                   <button className="chat-action-btn cancel-btn" type="button">Finalizar agendamento</button>
                </div>
             </>
          )
       }]);
    }, 1000);
  };

  const handleServiceSelectionFlow = (customGreeting?: string) => {
    if (services.length === 1) {
       // Atalho: Só tem um serviço, seleciona e vai pro profissional
       handleProfessionalSelectionFlow(services[0], customGreeting);
       return;
    }

    const greetings = [
      "Qual dos nossos serviços você gostaria de agendar hoje?",
      "Agora me conta, qual serviço você está procurando?",
      "Que tal escolher o serviço que deseja realizar?",
      "Qual procedimento vamos marcar?",
      "Qual desses serviços você quer agendar?"
    ];
    const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
    const finalGreet = customGreeting ? `${customGreeting} ${randomGreet}` : randomGreet;

    setIsTyping(true);
    setTimeout(() => {
       setIsTyping(false);
       setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
          content: (
             <>
                {formatMarkdown(finalGreet)}
                <div className="action-buttons-grid">
                   {services.slice(0, 6).map(s => (
                      <button key={s.codigo} className="chat-action-btn" type="button" onClick={() => handleProfessionalSelectionFlow(s)}>
                         {s.nome} - <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>R$ {parseFloat(s.valor).toFixed(2).replace('.', ',')}</span>
                         <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>⏱ Duração: {s.duracao_minutos} min</div>
                      </button>
                   ))}
                   {services.length > 6 && <button className="chat-action-btn" type="button">Ver todos os serviços</button>}
                   <button className="chat-action-btn menu-btn" type="button" onClick={() => showMenu()}>⬅️ Voltar ao Menu</button>
                </div>
             </>
          )
       }]);
    }, 1200);
  };

  const handleProfessionalSelectionFlow = (service: any, customGreeting?: string) => {
    
    // Filtra profissionais habilitados para este serviço
    const allowedProfs = professionals.filter(p => 
       (service.profissionais_habilitados || []).includes(p.codigo)
    );

    if (allowedProfs.length === 1) {
       // Atalho: Só tem um profissional habilitado, seleciona e vai pro próximo fluxo (Data/Hora)
       handleDateTimeSelectionFlow(service, allowedProfs[0], customGreeting);
       return;
    }

    const greetPrefix = customGreeting ? `${customGreeting} ` : '';
    const finalGreet = `${greetPrefix}Você escolheu **${service.nome}**. Agora me diga, com qual **profissional** você deseja realizar o atendimento?`;

    setIsTyping(true);
    setTimeout(() => {
       setIsTyping(false);
       setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
          content: (
             <>
                {formatMarkdown(finalGreet)}
                <div className="action-buttons-grid">
                   {allowedProfs.map(p => (
                      <button key={p.codigo} className="chat-action-btn" type="button" onClick={() => handleDateTimeSelectionFlow(service, p)}>
                         {p.nome}
                      </button>
                   ))}
                   {allowedProfs.length === 0 && <div style={{ fontSize: '0.95rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>Puxa, parece que não há profissionais disponíveis para este serviço no momento. 😔</div>}
                   <button className="chat-action-btn menu-btn" type="button" onClick={() => handleServiceSelectionFlow()}>⬅️ Mudar Serviço</button>
                   <button className="chat-action-btn menu-btn" type="button" onClick={() => showMenu()}>🏠 Menu Principal</button>
                </div>
             </>
          )
       }]);
    }, 1200);
  };

  const handleDateTimeSelectionFlow = (service: any, professional: any, customGreeting?: string) => {
     
     const greetPrefix = customGreeting ? `${customGreeting} ` : '';
     const finalGreet = `${greetPrefix}Show! Você vai fazer **${service.nome}** com **${professional.nome}**. Qual **dia** fica melhor pra você?`;

     setIsTyping(true);
     setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           content: (
              <>
                 {formatMarkdown(finalGreet)}
                 <div className="action-buttons-grid">
                    <button className="chat-action-btn" type="button">Escolher Data e Hora</button>
                    <button className="chat-action-btn menu-btn" type="button" onClick={() => handleProfessionalSelectionFlow(service)}>⬅️ Mudar Profissional</button>
                 </div>
              </>
           )
        }]);
     }, 1200);
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isRegistering) return;
      if (!registrationData.nome) return;
      
      setIsRegistering(true);

      try {
         // 1. Pega o próximo código sequencial para a empresa (Igual como é feito na dashboard)
         const { data: allCli } = await supabase
            .from('clientes')
            .select('codigo')
            .eq('codigo_empresa', empresa.codigo);
         
         const nextCod = allCli && allCli.length > 0 
            ? Math.max(...allCli.map((x: any) => x.codigo || 0)) + 1 
            : 1;

         // 2. Insere o novo cliente (Removendo o select().single() p/ evitar erro de RLS e dar paridade c/ a dashboard)
         const payload = {
          codigo: nextCod,
          codigo_empresa: empresa.codigo,
          nome: registrationData.nome,
          telefone: registrationData.telefone,
          email: registrationData.email || null,
          ativo: true
         };

         const { error } = await supabase.from('clientes').insert(payload);

         if (error) throw error;

         // Adiciona um pequeno delay para a animação ser apreciada
         await new Promise(resolve => setTimeout(resolve, 800));

         // Adiciona a mensagem do usuário com os dados informados
         setMessages(prev => [...prev, {
            id: Date.now(), sender: 'user',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            content: (
               <>
                  <strong>Nome</strong>: {registrationData.nome}<br/>
                  <strong>Telefone</strong>: {registrationData.telefone}
                  {registrationData.email && <><br/><strong>E-mail</strong>: {registrationData.email}</>}
               </>
            )
         }]);

         setIsTyping(true);
         setTimeout(() => {
            setIsTyping(false);
            setStep('actions');
            const firstName = registrationData.nome.split(' ')[0];
            handleServiceSelectionFlow(`Perfeito, **${firstName}**! Cadastro realizado com sucesso. 🚀`);
            setIsRegistering(false); // Movemos para cá p/ evitar que o botão mude de volta antes de sumir
         }, 1000);

      } catch (err: any) {
         console.error('Erro detalhado ao cadastrar:', err);
         alert('Ops! Tive um problema ao salvar seu cadastro. Motivo: ' + (err.message || 'Erro no banco de dados.'));
         setIsRegistering(false);
      }
  };

  if (loadingState === 'fetching' || (!empresa && loading)) return <div className="isis-container" style={{ backgroundColor: '#0d0d0f' }}></div>;
  if (!empresa) return <div className="isis-container" style={{ justifyContent: 'center', color: '#ef4444' }}><h2>Empresa "{decodedNome}" não encontrada.</h2></div>;

  if (loadingState === 'premium_wait') {
    return (
      <div className="isis-container premium-loading">
         <div className="fluid-bg">
            <div className="fluid-blob blob-1"></div>
            <div className="fluid-blob blob-2"></div>
            <div className="fluid-blob blob-3"></div>
         </div>
         <div className="pulsing-avatar">
            <div className="isis-face"><img src="/isiscomprimentoperfil.png" alt="Ísis" /></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay"></div>
         </div>
         <h2 className="loading-text">Conectando à Ísis...</h2>
         <p style={{ color: 'var(--text-muted)', zIndex: 10 }}>Preparando a agenda da {empresa.nome_exibicao}</p>
      </div>
    );
  }

  const isInputValid = inputType === 'phone' ? inputVal.length === 15 : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal);

  return (
    <div className="isis-container" ref={containerRef}>
       <header className="isis-header">
          <div className="header-left">
             <div className="avatar-wrapper">
                <div className="isis-face small"><img src="/isiscomprimentoperfil.png" alt="Ísis" /></div>
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
                {empresa.logo_url ? <img src={empresa.logo_url} alt="Logo" /> : <div className="pill-logo-fallback">{empresa.nome_exibicao.charAt(0)}</div>}
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
                   {msg.sender === 'isis' && <div className="isis-face chat-avatar"><img src="/isisneutraperfil.png" alt="Ísis" /></div>}
                   <div className={`chat-bubble ${msg.sender}`}>
                      <div className="bubble-text">{msg.content}</div>
                      <span className="bubble-time">{msg.time}</span>
                   </div>
                </div>
             ))}
             {isTyping && (
                <div className="chat-line isis-line">
                   <div className="isis-face chat-avatar"><img src="/isisneutraperfil.png" alt="Ísis" /></div>
                   <div className="chat-bubble isis" style={{ minWidth: '60px', padding: '12px 16px' }}>
                      <div className="bubble-text"><div className="typing-dots"><span></span><span></span><span></span></div></div>
                   </div>
                </div>
             )}
             <div ref={chatEndRef} />
          </div>
       </main>

       <footer className="chat-footer">
          {step === 'identification' && (
             <>
                <form className="chat-input-wrapper" onSubmit={handleSend}>
                   {inputType === 'phone' ? <IPhone /> : <IEmail />}
                   <input type={inputType === 'phone' ? 'tel' : 'email'} placeholder={inputType === 'phone' ? "(00) 00000-0000" : "seu@email.com"} value={inputVal} onChange={handleInputChange} onFocus={handleInputFocus}/>
                   <button type="submit" className="send-btn" disabled={!isInputValid}><ISend /></button>
                </form>
                <div className="footer-options">
                   <button type="button" className="text-btn" onClick={() => { setInputType(t => t === 'phone' ? 'email' : 'phone'); setInputVal(''); }}>
                      {inputType === 'phone' ? <><IEmail /> Prefiro usar e-mail</> : <><IPhone /> Prefiro usar telefone</>}
                   </button>
                </div>
             </>
          )}

          {step === 'registration' && (
             <form className="registration-form" onSubmit={handleRegistrationSubmit}>
                <div className="form-group">
                   <input type="text" placeholder="Nome completo" value={registrationData.nome} onChange={e => setRegistrationData(d => ({ ...d, nome: e.target.value }))} required />
                </div>
                <div className="form-row">
                   <div className="form-group">
                      <input type="tel" placeholder="Telefone" value={registrationData.telefone} onChange={e => setRegistrationData(d => ({ ...d, telefone: applyMask(e.target.value) }))} required />
                      <span className="validation-text">{registrationData.telefone.length === 15 ? '✅ Válido' : '❌ Inválido'}</span>
                   </div>
                   <div className="form-group">
                      <input type="email" placeholder="E-mail (opcional)" value={registrationData.email} onChange={e => setRegistrationData(d => ({ ...d, email: e.target.value }))} />
                      <span className="validation-text">{registrationData.email ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.email) ? '✅ Válido' : '❌ Inválido') : '⚪ Opcional'}</span>
                   </div>
                </div>
                 <button 
                  type="submit" 
                  className={`chat-action-btn pri ${isRegistering ? 'is-registering' : ''}`} 
                  disabled={isRegistering} 
                  style={{ width: '100%', marginTop: '8px' }}
                >
                   {isRegistering ? 'Garantindo seu acesso...' : 'Concluir Cadastro'}
                </button>
             </form>
          )}

          {step === 'actions' && <div className="footer-status-msg">Conversa em andamento com Ísis ✨</div>}
       </footer>
    </div>
  );
}
