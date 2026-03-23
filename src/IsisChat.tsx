import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { toast } from './Toast';
import './IsisChat.css';

const ISend = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const IEmail = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
const IPhone = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.273-3.973-6.869-6.869l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
const ICalendar = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const IArrowLeft = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const IArrowRight = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

const Calendar = ({ value, onChange, onClose }: any) => {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const days = [];
  const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const startOffset = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
    const isPast = d < today;
    const isSelected = value === d.toISOString().split('T')[0];
    const isToday = d.getTime() === today.getTime();

    days.push(
      <div 
        key={i} 
        className={`calendar-day ${isPast ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'is-today' : ''}`}
        onClick={() => !isPast && (onChange(d.toISOString().split('T')[0]), onClose())}
      >
        {i}
      </div>
    );
  }

  return (
    <div className="custom-calendar" onClick={e => e.stopPropagation()}>
      <div className="calendar-header">
        <button type="button" onClick={() => changeMonth(-1)}><IArrowLeft /></button>
        <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button type="button" onClick={() => changeMonth(1)}><IArrowRight /></button>
      </div>
      <div className="calendar-weekdays">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="calendar-grid">
        {days}
      </div>
    </div>
  );
};

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
  const [cliente, _setCliente] = useState<any>(null);
  const clienteRef = useRef<any>(null);
  const [editingAg, setEditingAg] = useState<any>(null);

  const setCliente = (val: any) => {
    _setCliente(val);
    clienteRef.current = val;
  };

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
        text: randomMsg
     }]);
  };

  const addUserMessage = (content: React.ReactNode) => {
    setMessages(prev => [...prev, {
       id: Date.now(),
       sender: 'user',
       time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
       text: content
    }]);
    setTimeout(() => scrollToBottom('smooth'), 100);
  };

  const clearLastIsisActions = () => {
    setMessages(prev => {
       const newMsgs = [...prev];
       for (let i = newMsgs.length - 1; i >= 0; i--) {
          if (newMsgs[i].sender === 'isis' && newMsgs[i].actions) {
             newMsgs[i] = { ...newMsgs[i], actions: null };
             break;
          }
       }
       return newMsgs;
    });
  };

  const formatMarkdown = (text: any) => {
    if (!text || typeof text !== 'string') return text;
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
         text: userMsg
      }]);
      setInputVal('');
      setIsTyping(true);
      setTimeout(() => scrollToBottom('smooth'), 100);

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
            setCliente(cliData); // Added this line
            setStep('actions');
            const firstName = (cliData.nome || '').split(' ')[0];
            
            const greetings = [
              `Que bom te ver de novo, **${firstName}**! 😊`,
              `Que alegria te ver por aqui de novo, **${firstName}**! 😊`,
              `Oi **${firstName}**, que bom que você voltou! Vamos agendar algo novo? 💜`,
              `Seja bem-vindo(a) de volta, **${firstName}**! Como posso te ajudar hoje? ✨`,
              `Olá **${firstName}**, é um prazer te atender novamente! 😊`
            ];
            const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
            showMenu(randomGreet);
         } else {
            setCliente(null);
            setEditingAg(null);
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
               text: "Ops! Não encontrei o seu cadastro ainda. Mas não tem problema! 😊 Vamos fazer agora rapidinho para você poder agendar?",
               actions: <div style={{ height: '8px' }}></div>
            }]);
         }
      }, 2000);
  };

  const handleWrongNumber = () => {
    setCliente(null);
    setEditingAg(null);
    setStep('identification');
    setInputVal('');
    if (empresa) startWelcomeFlow(empresa);
  };

  const showMenu = (customGreeting?: string) => {
    setEditingAg(null);
    setIsTyping(true);
    setTimeout(() => {
       setIsTyping(false);
       setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
          text: customGreeting || "O que você deseja fazer agora? Escolha uma opção abaixo:",
          actions: (
            <div className="action-buttons-grid">
               <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('✨ Fazer agendamento'); handleServiceSelectionFlow(); }}>✨ Fazer agendamento</button>
               <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('📅 Revisar Agendamentos'); handleEditAppointmentFlow(); }}>📅 Revisar Agendamentos</button>
               <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('📱 Informei o número errado'); handleWrongNumber(); }}>📱 Informei o número errado</button>
               <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('👋 Finalizar atendimento'); handleFinalizeAtendimento(); }}>👋 Finalizar atendimento</button>
            </div>
          )
       }]);
       setTimeout(() => scrollToBottom('smooth'), 100);
    }, 1000);
  };

  const handleServiceSelectionFlow = (customGreeting?: string) => {
    if (services.length === 1) {
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
    const finalGreet = customGreeting || randomGreet;

    setIsTyping(true);
    setTimeout(() => {
       setIsTyping(false);
       setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
          text: finalGreet,
          actions: (
            <div className="action-buttons-grid">
               {services.slice(0, 10).map(s => (
                  <button key={s.codigo} className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage(`Vou querer ${s.nome}`); handleProfessionalSelectionFlow(s); }}>
                     {s.nome} - <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>R$ {parseFloat(s.valor).toFixed(2).replace('.', ',')}</span>
                     <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>⏱ Duração: {s.duracao_minutos} min</div>
                  </button>
               ))}
               {services.length > 10 && <button className="chat-action-btn" type="button">Ver todos os serviços</button>}
               <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('⬅️ Voltar ao Menu'); showMenu(); }}>⬅️ Voltar ao Menu</button>
            </div>
          )
       }]);
       setTimeout(() => scrollToBottom('smooth'), 100);
    }, 1200);
  };

  const handleProfessionalSelectionFlow = (service: any, customGreeting?: string) => {
    
    // Filtra profissionais habilitados para este serviço
    const allowedProfs = professionals.filter(p => 
       (service.profissionais_habilitados || []).map(String).includes(String(p.codigo))
    );

    if (allowedProfs.length === 1) {
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
          text: finalGreet,
          actions: (
            <div className="action-buttons-grid">
               {allowedProfs.map((p: any) => (
                  <button key={p.codigo} className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage(`Quero com ${p.nome}`); handleDateTimeSelectionFlow(service, p); }}>
                     {p.nome}
                  </button>
               ))}
               {allowedProfs.length === 0 && <div style={{ fontSize: '0.95rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>Puxa, parece que não há profissionais disponíveis para este serviço no momento. 😔</div>}
               <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('⬅️ Mudar Serviço'); handleServiceSelectionFlow(); }}>⬅️ Mudar Serviço</button>
               <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('🏠 Menu Principal'); showMenu(); }}>🏠 Menu Principal</button>
            </div>
          )
       }]);
       setTimeout(() => scrollToBottom('smooth'), 100);
    }, 1200);
  };

  const loadAvailableTimes = async (date: string, service: any, professional: any) => {
     setIsTyping(true);
     
     try {
        // --- TRATAMENTO DE TIMEZONE (Horário de Brasília: UTC-3) ---
        // Helper para criar data em UTC-3
        const getBrasiliaDate = (base?: string | Date) => {
           const d = base ? new Date(base) : new Date();
           // Converte para o tempo de Brasília compensando o fuso local do dispositivo
           const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
           return new Date(utc + (3600000 * -3));
        };

        const now = new Date();
        const nowBR = getBrasiliaDate();
        
        // 1. Busca configurações da empresa
        const { data: config } = await supabase.from('configuracoes_agenda').select('*').eq('codigo_empresa', empresa.codigo).single();
        
        // 2. Busca agendamentos do dia (usando range de 24h em Brasília)
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;
        
        const { data: appts } = await supabase.from('agendamentos')
           .select('*')
           .eq('codigo_empresa', empresa.codigo)
           .eq('codigo_profissional', professional.codigo)
           .neq('status', 'cancelado')
           .gte('data_hora_inicio', startOfDay)
           .lte('data_hora_inicio', endOfDay);
        
        // 3. Determina dia da semana (Brasília)
        const [y, m, d] = date.split('-').map(Number);
        const slotDayDate = new Date(y, m - 1, d, 12, 0, 0); 
        const dayOfWeek = slotDayDate.getDay(); 

        const dayConfig = (config?.horarios || []).find((h: any) => h.dia === dayOfWeek);

        if (!dayConfig || !dayConfig.aberto) {
           setMessages(prev => [...prev, {
              id: Date.now(),
              sender: 'isis',
              time: nowBR.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
              text: `Puxa, o estabelecimento ou o profissional não atende aos **${dayConfig?.nome || 'domingos'}**. 😕 Deseja escolher outro dia?`,
              actions: (
                 <div className="action-buttons-grid">
                    <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); handleDateTimeSelectionFlow(service, professional); }}>📅 Escolher outro dia</button>
                 </div>
              )
           }]);
           return;
        }

        const slots: string[] = [];
        let curTimeStr = dayConfig.inicio || '07:00';
        const endTimeStr = dayConfig.fim || '22:00';
        const duracaoSvc = service.duracao_minutos || 30;

        const timeToMinutes = (t: string) => {
           const [h, min] = t.split(':').map(Number);
           return h * 60 + min;
        };

        const minutesToTime = (min: number) => {
           const h = Math.floor(min / 60);
           const minRem = min % 60;
           return `${h.toString().padStart(2, '0')}:${minRem.toString().padStart(2, '0')}`;
        };

        let currentMinutes = timeToMinutes(curTimeStr);
        const endMinutes = timeToMinutes(endTimeStr);

        while (currentMinutes + duracaoSvc <= endMinutes) {
           const tStr = minutesToTime(currentMinutes);
           const slotStart = new Date(`${date}T${tStr}:00-03:00`);
           const slotEnd = new Date(slotStart.getTime() + duracaoSvc * 60000);

           // Regra 1: Horário já passou (comparado no tempo real)?
           if (slotStart <= now) {
              currentMinutes += 15;
              continue;
           }

           // Regra 2: Conflito com agendamentos?
           const hasConflict = appts?.some(ag => {
              const agStart = new Date(ag.data_hora_inicio);
              const agEnd = new Date(ag.data_hora_fim);
              return (slotStart < agEnd && slotEnd > agStart);
           });

           if (!hasConflict) {
              slots.push(tStr);
           }
           
           currentMinutes += 15;
        }

        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           time: nowBR.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: `Encontrei estes horários disponíveis para **${service.nome}** com **${professional.nome}** no dia **${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}**:`,
           actions: (
              <div className="action-buttons-grid">
                 {slots.length > 0 ? (
                    <div className="select-slot-wrapper">
                       <select 
                          className="chat-action-select" 
                          defaultValue="" 
                          onChange={(e) => {
                             const val = e.target.value;
                             if (val) {
                                clearLastIsisActions();
                                addUserMessage(`Quero para às ${val}`);
                                handleConfirmAppointmentFlow(service, professional, date, val);
                             }
                          }}
                       >
                          <option value="" disabled>Selecione um horário...</option>
                          {slots.map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                    </div>
                 ) : (
                    <div style={{ fontSize: '0.9rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                       Puxa, não encontrei nenhum horário livre para este dia. 😔<br/>
                       <small style={{ opacity: 0.8 }}>Horário atual em Brasília: {nowBR.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small>
                    </div>
                 )}
                 <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); handleDateTimeSelectionFlow(service, professional, "Escolha outro dia:"); }}>📅 Mudar Dia</button>
              </div>
           )
        }]);
        setTimeout(() => scrollToBottom('smooth'), 100);

     } catch (err) {
        console.error('Erro ao carregar horários:', err);
        toast('Ops! Tive um problema ao carregar os horários. Tente novamente.', 'error');
     } finally {
        setIsTyping(false);
     }
  };



  const handleDateTimeSelectionFlow = (service: any, professional: any, customGreeting?: string) => {
     const greetPrefix = customGreeting ? `${customGreeting} ` : '';
     const finalGreet = `${greetPrefix}Show! Você escolheu **${service.nome}** com **${professional.nome}**. Qual **dia** fica melhor pra você?`;

     setIsTyping(true);
     setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: finalGreet,
           actions: <DateActions service={service} professional={professional} />
        }]);
        setTimeout(() => scrollToBottom('smooth'), 100);
     }, 1200);
  };

  const DateActions = ({ service, professional }: any) => {
     const [showCustom, setShowCustom] = useState(false);
     const [showCalendar, setShowCalendar] = useState(false);
     const [dateInput, setDateInput] = useState('');
     const [dateError, setDateError] = useState('');

     // Filtra profissionais habilitados para este serviço para saber se mostramos o botão de mudar
     const allowedProfsCount = professionals.filter(p => 
        (service.profissionais_habilitados || []).map(String).includes(String(p.codigo))
     ).length;

     const handleQuickDate = (days: number, label: string) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const iso = d.toLocaleDateString('en-CA');
        clearLastIsisActions();
        addUserMessage(label);
        loadAvailableTimes(iso, service, professional);
     };

     const validateDate = (dateStr: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
        
        const selected = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);

        if (selected < today) {
           setDateError("Puxa, essa data já passou! 😅 Escolha uma data de hoje em diante.");
           return false;
        }
        setDateError('');
        return true;
     };

     const handleCustomDateSubmit = (dateStr: string) => {
        if (!validateDate(dateStr)) return;

        clearLastIsisActions();
        addUserMessage(`Escolhi o dia ${new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')}`);
        loadAvailableTimes(dateStr, service, professional);
     };

     if (!showCustom) {
        return (
           <div className="action-buttons-grid">
              <button className="chat-action-btn" type="button" onClick={() => handleQuickDate(0, 'Hoje')}>Hoje</button>
              <button className="chat-action-btn" type="button" onClick={() => handleQuickDate(1, 'Amanhã')}>Amanhã</button>
              <button className="chat-action-btn" type="button" onClick={() => setShowCustom(true)}>📅 Outro dia</button>
              
              {allowedProfsCount > 1 && (
                 <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('⬅️ Mudar Profissional'); handleProfessionalSelectionFlow(service); }}>⬅️ Mudar Profissional</button>
              )}
              
              <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('🏠 Menu Principal'); showMenu(); }}>🏠 Menu Principal</button>
           </div>
        );
     }

     return (
        <div className="action-buttons-grid">
           <div className="date-input-container" style={{ position: 'relative' }}>
              <input 
                 type="text" 
                 className="chat-action-btn date-input-field" 
                 placeholder="Digite a data: DD/MM/AAAA"
                 value={dateInput}
                 onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 8) v = v.slice(0, 8);
                    if (v.length > 4) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
                    else if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`;
                    setDateInput(v);
                    
                    if (v.length === 10) {
                       const [d, m, y] = v.split('/');
                       validateDate(`${y}-${m}-${d}`);
                    } else {
                       setDateError('');
                    }
                 }} 
              />
              <button type="button" className="calendar-trigger-btn" onClick={() => setShowCalendar(!showCalendar)}>
                 <ICalendar />
              </button>
              {dateInput.length === 10 && !dateError && (
                 <button type="button" className="confirm-date-btn" onClick={() => {
                    const [d, m, y] = dateInput.split('/');
                    handleCustomDateSubmit(`${y}-${m}-${d}`);
                 }}>
                    Confirmar
                 </button>
              )}

              {showCalendar && (
                 <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, zIndex: 1001, width: '100%' }}>
                     <Calendar 
                        value={dateInput.length === 10 ? `${dateInput.split('/')[2]}-${dateInput.split('/')[1]}-${dateInput.split('/')[0]}` : new Date().toLocaleDateString('en-CA')} 
                       onChange={(d: string) => { 
                          const [y, m, day] = d.split('-');
                          setDateInput(`${day}/${m}/${y}`); 
                          handleCustomDateSubmit(d); 
                       }}
                       onClose={() => setShowCalendar(false)}
                    />
                 </div>
              )}
           </div>
           
           {dateError && <div className="date-error-msg">{dateError}</div>}

           <button className="chat-action-btn menu-btn" type="button" onClick={() => { setShowCustom(false); setDateError(''); setDateInput(''); }}>⬅️ Voltar</button>
           <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('🏠 Menu Principal'); showMenu(); }}>🏠 Menu Principal</button>
        </div>
     );
  };

  const handleConfirmAppointmentFlow = (service: any, professional: any, date: string, time: string) => {
     setIsTyping(true);
     setTimeout(() => {
        setIsTyping(false);
        const valorFormatado = parseFloat(service.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: (
              <>
                 Confirmando seu agendamento:<br/><br/>
                 📅 <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong>{time}</strong><br/>
                 ✨ <strong>{service.nome}</strong><br/>
                 👤 <strong>{professional.nome}</strong><br/>
                 💰 Valor: <strong>{valorFormatado}</strong><br/><br/>
                 Posso confirmar?
              </>
           ),
           actions: (
              <div className="action-buttons-grid">
                 <button className="chat-action-btn pri" type="button" onClick={() => { 
                    clearLastIsisActions(); 
                    addUserMessage('Sim, pode confirmar! ✅'); 
                    handleCompleteAppointment(service, professional, date, time);
                 }}>✅ Confirmar Agendamento</button>
                 <button className="chat-action-btn cancel-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('Não, quero mudar algo.'); showMenu('Sem problemas! O que deseja mudar?'); }}>❌ Mudar/Cancelar</button>
              </div>
           )
        }]);
        setTimeout(() => scrollToBottom('smooth'), 100);
     }, 1200);
  };

  const handleCompleteAppointment = async (service: any, professional: any, date: string, time: string) => {
     setIsTyping(true);
     
     // 1. Preparar Payload para o Banco
     const startObj = new Date(`${date}T${time}:00`);
     const duracao = service.duracao_minutos || 30;
     const endObj = new Date(startObj.getTime() + duracao * 60000);

     const currentCliente = cliente || clienteRef.current;

      if (!currentCliente) {
         console.error('Erro: Cliente não identificado no momento da conclusão.');
         toast('Ops! Tivemos um problema para identificar seu cadastro. Pode tentar informar seu telefone novamente?', 'error');
         setStep('identification');
         setIsTyping(false);
         return;
      }

      try {
         let error;
         if (editingAg) {
            const { error: err } = await supabase.from('agendamentos').update({
               codigo_servico: service.codigo,
               codigo_profissional: professional.codigo,
               data_hora_inicio: startObj.toISOString(),
               data_hora_fim: endObj.toISOString(),
               observacao: '✨ Agendamento alterado via Assistente Ísis',
            }).eq('id', editingAg.id);
            error = err;
         } else {
            // Gerar próximo código seqüencial para a empresa
            const { data: allAgend } = await supabase.from('agendamentos').select('codigo').eq('codigo_empresa', empresa.codigo);
            const nextCod = allAgend && allAgend.length > 0 ? Math.max(...allAgend.map((x:any)=>x.codigo)) + 1 : 1;

            const { error: err } = await supabase.from('agendamentos').insert({
               codigo: nextCod,
               codigo_empresa: empresa.codigo,
               codigo_servico: service.codigo,
               codigo_cliente: currentCliente.id,
               codigo_profissional: professional.codigo,
               data_hora_inicio: startObj.toISOString(),
               data_hora_fim: endObj.toISOString(),
               status: 'agendado',
               observacao: '✨ Agendamento realizado via Assistente Ísis',
               isis_criou: true
            });
            error = err;
         }

        if (error) {
           console.error('Erro ao gravar agendamento:', error);
           toast('Puxa, tive um probleminha técnico ao salvar seu horário. Por favor, tente novamente em instantes.', 'error');
           setIsTyping(false);
           return;
        }

        setIsTyping(false);
        const valorFormatado = parseFloat(service.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           status: 'success',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: (
              <>
                 ✨ <strong>Agendamento confirmado com sucesso!</strong> 🎉<br/><br/>
                 Resumo final:<br/>
                 📅 <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às <strong>{time}</strong><br/>
                 ✨ <strong>{service.nome}</strong><br/>
                 👤 <strong>{professional.nome}</strong><br/>
                 💰 Valor: <strong>{valorFormatado}</strong><br/>
                 {empresa.endereco && (
                    <>📍 Endereço: <strong>{empresa.endereco}</strong></>
                 )}
                 <br/>
                 Te esperamos lá! 😊
              </>
           ),
           actions: (
              <div className="action-buttons-grid">
                  <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu('Deseja algo mais?'); }}>🏠 Menu Principal</button>
                  <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('📅 Revisar Agendamentos'); handleEditAppointmentFlow(); }}>📅 Revisar Agendamentos</button>
                  <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('👋 Finalizar atendimento'); handleFinalizeAtendimento(); }}>👋 Finalizar atendimento</button>
              </div>
           )
         }]);
        setTimeout(() => scrollToBottom('smooth'), 100);

     } catch (err) {
        console.error('Critical Error:', err);
        setIsTyping(false);
     }
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
            text: (
               <>
                  <strong>Nome</strong>: {registrationData.nome}<br/>
                  <strong>Telefone</strong>: {registrationData.telefone}
                  {registrationData.email && <><br/><strong>E-mail</strong>: {registrationData.email}</>}
               </>
            )
         }]);

         setIsTyping(true);
         setTimeout(() => scrollToBottom('smooth'), 100);
          setTimeout(async () => { // Made this async
              // Busca o cliente recém criado para ter o ID correto
              const { data: newCli } = await supabase.from('clientes').select('*').eq('codigo_empresa', empresa.codigo).eq('codigo', nextCod).single();
              if (newCli) setCliente(newCli); // Added this line

             setIsTyping(false);
             clearLastIsisActions(); // Limpa as ações (pergunta) da Isis após o cadastro
             setStep('actions');
             const firstName = registrationData.nome.split(' ')[0];

             const greetings = [
              `Perfeito, **${firstName}**! Cadastro realizado com sucesso. 🚀`,
              `Tudo pronto, **${firstName}**! Seu cadastro foi feito. 😊`,
              `Show, **${firstName}**! Agora você já pode agendar seus horários. ✨`,
              `Maravilha! **${firstName}**, seu cadastro está confirmadíssimo. 👍`
             ];
             const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
             handleServiceSelectionFlow(randomGreet);
             setIsRegistering(false); 
          }, 1000);

      } catch (err: any) {
         console.error('Erro detalhado ao cadastrar:', err);
         alert('Ops! Tive um problema ao salvar seu cadastro. Motivo: ' + (err.message || 'Erro no banco de dados.'));
         setIsRegistering(false);
      }
  };

   const handleFinalizeAtendimento = () => {
      setIsTyping(true);
      setTimeout(() => {
         setIsTyping(false);
         setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'isis',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            text: <>Foi um prazer te atender! Se precisar de algo mais, é só me chamar. Tenha um ótimo dia! 😊✨<br/><br/><strong>{empresa.nome_fantasia || empresa.nome_exibicao}</strong> agradece a preferência!</>
         }]);
         setTimeout(() => scrollToBottom('smooth'), 100);
      }, 1000);
   };

   const handleCancelAppointmentFlow = async (ag: any) => {
      setIsTyping(true);
      setTimeout(async () => {
         const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', ag.id);
         setIsTyping(false);
         if (error) {
            toast('Erro ao cancelar agendamento.', 'error');
            return;
         }
         setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'isis',
            status: 'success',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            text: "Seu agendamento foi **cancelado com sucesso**. ✅",
            actions: (
               <div className="action-buttons-grid">
                  <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu('Deseja algo mais?'); }}>🏠 Menu Principal</button>
               </div>
            )
         }]);
         setTimeout(() => scrollToBottom('smooth'), 100);
      }, 1000);
   };

   const handleEditAppointmentFlow = async () => {
      const currentCli = cliente || clienteRef.current;
      if (!currentCli) return;

      setIsTyping(true);
      const now = new Date().toISOString();

      // 1. Fetch agendamentos (Simple query to avoid 400 join error)
      const { data: rawAgs } = await supabase.from('agendamentos')
         .select('*')
         .eq('codigo_cliente', currentCli.id)
         .eq('codigo_empresa', empresa.codigo)
         .not('status', 'eq', 'cancelado')
         .gte('data_hora_inicio', now)
         .order('data_hora_inicio', { ascending: true });

      setTimeout(async () => {
         setIsTyping(false);
         if (!rawAgs || rawAgs.length === 0) {
            setMessages(prev => [...prev, {
               id: Date.now(),
               sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
               text: "Você não tem nenhum agendamento futuro no momento. 😕 Deseja fazer um novo?",
               actions: (
                  <div className="action-buttons-grid">
                     <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('✨ Fazer agendamento'); handleServiceSelectionFlow(); }}>✨ Fazer agendamento</button>
                     <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu(); }}>🏠 Menu Principal</button>
                  </div>
               )
            }]);
            return;
         }

         // 2. Fetch dependencies manually
         const svcIds = [...new Set(rawAgs.map(ag => ag.codigo_servico))];
         const profIds = [...new Set(rawAgs.map(ag => ag.codigo_profissional))];

         const { data: svcs } = await supabase.from('servicos').select('*').in('codigo', svcIds);
         const { data: profs } = await supabase.from('usuarios').select('*').in('codigo', profIds);

         // 3. Map dependencies
         const ags = rawAgs.map(ag => ({
            ...ag,
            servicos: svcs?.find(s => s.codigo === ag.codigo_servico),
            usuarios: profs?.find(p => p.codigo === ag.codigo_profissional)
         }));

         if (ags.length === 1) {
            handleReviewAppointmentFlow(ags[0]);
         } else {
            setMessages(prev => [...prev, {
               id: Date.now(),
               sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
               text: "Você tem mais de um agendamento. Qual deles você deseja **revisar**?",
               actions: (
                  <div className="action-buttons-grid">
                     {ags.map((ag: any) => (
                        <button key={ag.id} className="chat-action-btn" type="button" onClick={() => { 
                           clearLastIsisActions(); 
                           addUserMessage(`Revisar: ${new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')} - ${ag.servicos?.nome}`);
                           handleReviewAppointmentFlow(ag);
                        }}>
                           {new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')} às {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} - {ag.servicos?.nome}
                        </button>
                     ))}
                     <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu(); }}>🏠 Menu Principal</button>
                  </div>
               )
            }]);
         }
         setTimeout(() => scrollToBottom('smooth'), 100);
      }, 1000);
   };

   const handleReviewAppointmentFlow = (ag: any) => {
      setEditingAg(ag);
      setIsTyping(true);
      setTimeout(() => {
         setIsTyping(false);
         const svc = ag.servicos;
         const prof = ag.usuarios;
         const valorFormatado = parseFloat(svc?.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

         setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'isis',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            text: (
               <>
                  Perfeito! Vamos revisar seu agendamento:<br/><br/>
                  📅 <strong>{new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}</strong> às <strong>{new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</strong><br/>
                  ✨ <strong>{svc?.nome}</strong><br/>
                  👤 <strong>{prof?.nome}</strong><br/>
                  💰 Valor: <strong>{valorFormatado}</strong><br/><br/>
                  O que você deseja fazer agora?
               </>
            ),
            actions: (
               <div className="action-buttons-grid">
                  <button className="chat-action-btn pri" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('Tudo certo! ✅'); showMenu('Maravilha! Agendamento revisado. Deseja algo mais?'); }}>Tudo certo! ✅</button>
                  <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('📝 Editar agendamento'); handleServiceSelectionFlow("Vamos ajustar seu agendamento. Qual serviço você prefere agora?"); }}>📝 Editar agendamento</button>
                  <button className="chat-action-btn cancel-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('❌ Cancelar agendamento'); handleCancelAppointmentFlow(ag); }}>❌ Cancelar agendamento</button>
                  <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu(); }}>🏠 Menu Principal</button>
               </div>
            )
         }]);
         setTimeout(() => scrollToBottom('smooth'), 100);
      }, 1000);
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
                    <div className={`chat-bubble ${msg.sender} ${msg.status || ''}`}>
                       <div className="bubble-text">{formatMarkdown(msg.text)}</div>
                       {msg.actions && msg.actions}
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
