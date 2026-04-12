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
  const [editingAg, _setEditingAg] = useState<any>(null);
  const editingAgRef = useRef<any>(null);

  const setCliente = (val: any) => {
    _setCliente(val);
    clienteRef.current = val;
  };

  const setEditingAg = (val: any) => {
    _setEditingAg(val);
    editingAgRef.current = val;
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

  // Retorna apenas nome + sobrenome (primeiras 2 palavras)
  const shortName = (nome: string) => {
    if (!nome) return '';
    const parts = nome.trim().split(/\s+/);
    return parts.slice(0, 2).join(' ');
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
      setStep('actions'); // Sumir input imediatamente
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

    const messages_wrong = [
      "Sem problemas! Acontece. 😊 Por favor, me informe o número ou e-mail correto para que eu possa te encontrar:",
      "Não tem problema! ✨ Digite agora o seu telefone ou e-mail certinho para começarmos o agendamento:",
      "Tudo certo! 💜 Vamos corrigir isso. Me diz qual o seu telefone ou e-mail de cadastro:"
    ];
    const randomMsg = messages_wrong[Math.floor(Math.random() * messages_wrong.length)];
    
    setMessages([{
       id: Date.now(),
       sender: 'isis',
       time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
       text: randomMsg
    }]);
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

  // ===== HELPER: gera slots disponíveis para um profissional num dado dia =====
  const generateAvailableSlots = async (date: string, serviceCode: string, professionalCode: string): Promise<string[]> => {
    const service = services.find((s: any) => String(s.codigo) === String(serviceCode));
    if (!service) return [];

    const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const minToTime = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;

    const { data: config } = await supabase.from('configuracoes_agenda').select('*').eq('codigo_empresa', empresa.codigo).single();
    const [y, mo, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, mo - 1, d, 12).getDay();
    const dayCfg = (config?.horarios || []).find((h: any) => h.dia === dayOfWeek);
    if (!dayCfg || !dayCfg.aberto) return [];

    const { data: appts } = await supabase.from('agendamentos')
      .select('*')
      .eq('codigo_empresa', empresa.codigo)
      .eq('codigo_profissional', professionalCode)
      .neq('status', 'cancelado')
      .gte('data_hora_inicio', `${date}T00:00:00-03:00`)
      .lte('data_hora_inicio', `${date}T23:59:59-03:00`);

    const now = new Date();
    const duracaoSvc = service.duracao_minutos || 30;
    const hasLunch = dayCfg.almoco_ativo;
    const lunchStart = hasLunch ? timeToMin(dayCfg.almoco_inicio) : 0;
    const lunchEnd   = hasLunch ? timeToMin(dayCfg.almoco_fim)   : 0;
    let cur = timeToMin(dayCfg.inicio || '07:00');
    const end = timeToMin(dayCfg.fim || '22:00');
    const slots: string[] = [];

    while (cur + duracaoSvc <= end) {
      const tStr = minToTime(cur);
      const slotStart = new Date(`${date}T${tStr}:00-03:00`);
      const slotEnd   = new Date(slotStart.getTime() + duracaoSvc * 60000);

      if (hasLunch && cur < lunchEnd && cur + duracaoSvc > lunchStart) { cur = lunchEnd; continue; }
      if (slotStart <= now) { cur += 15; continue; }
      const conflict = (appts || []).some(ag => {
        const as = new Date(ag.data_hora_inicio), ae = new Date(ag.data_hora_fim);
        return slotStart < ae && slotEnd > as;
      });
      if (!conflict) slots.push(tStr);
      cur += 15;
    }
    return slots;
  };

  // ===== WIDGET: DatePickerWidget (escolha de data antes dos serviços) =====
  const DatePickerWidget = ({ onDateSelected, onBack }: { onDateSelected: (d: string) => void, onBack: () => void }) => {
    const [showCal, setShowCal] = useState(false);
    const [dateInput, setDateInput] = useState('');
    const [dateError, setDateError] = useState('');

    const validate = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      const sel = new Date(y, m - 1, d);
      if (sel.getFullYear() !== y || sel.getMonth() !== m - 1 || sel.getDate() !== d) {
        setDateError('Essa data não parece correta! 🧐'); return false;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (sel < today) { setDateError('Essa data já passou! 😅'); return false; }
      setDateError(''); return true;
    };

    const submit = (iso: string) => { if (validate(iso)) onDateSelected(iso); };

    const quickDate = (days: number) => {
      const d = new Date(); d.setDate(d.getDate() + days);
      submit(d.toLocaleDateString('en-CA'));
    };

    return (
      <div className="action-buttons-grid">
        <button className="chat-action-btn" type="button" onClick={() => quickDate(0)}>Hoje</button>
        <button className="chat-action-btn" type="button" onClick={() => quickDate(1)}>Amanhã</button>
        <div className="date-input-container" style={{ position: 'relative' }}>
          <input
            type="text" className="chat-action-btn date-input-field" placeholder="Ex: 25/03/2026"
            value={dateInput}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '');
              if (v.length > 8) v = v.slice(0, 8);
              if (v.length > 4) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
              else if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`;
              setDateInput(v);
              if (v.length === 10) { const [d,m,y] = v.split('/'); validate(`${y}-${m}-${d}`); } else setDateError('');
            }}
          />
          <button type="button" className="calendar-trigger-btn" onClick={() => setShowCal(!showCal)}><ICalendar /></button>
          {dateInput.length === 10 && !dateError && (
            <button type="button" className="confirm-date-btn" onClick={() => { const [d,m,y] = dateInput.split('/'); submit(`${y}-${m}-${d}`); }}>Confirmar</button>
          )}
          {showCal && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, zIndex: 1001, width: '100%' }}>
              <Calendar
                value={dateInput.length === 10 ? `${dateInput.split('/')[2]}-${dateInput.split('/')[1]}-${dateInput.split('/')[0]}` : new Date().toLocaleDateString('en-CA')}
                onChange={(d: string) => { const [y,m,day]=d.split('-'); setDateInput(`${day}/${m}/${y}`); submit(d); }}
                onClose={() => setShowCal(false)}
              />
            </div>
          )}
        </div>
        {dateError && <div className="date-error-msg">{dateError}</div>}
        <button className="chat-action-btn menu-btn" type="button" onClick={onBack}>⬅️ Voltar ao Menu</button>
      </div>
    );
  };

  // ===== WIDGET: ServiceSelectionWidget com horário por linha =====
  type RowState = { serviceCode: string; professionalCode: string; timeSlot: string; availableSlots: string[]; loadingSlots: boolean; };

  const ServiceSelectionWidget = ({
    date, onConfirm, onBack, onChangeDate
  }: {
    date: string;
    onConfirm: (rows: { service: any; professional: any; timeSlot: string }[]) => void;
    onBack: () => void;
    onChangeDate: () => void;
  }) => {
    const [rows, setRows] = React.useState<RowState[]>([
      { serviceCode: '', professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false }
    ]);

    const minToTime = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;

    // Calcula o horário ideal de início para a linha `index` baseando-se sempre no final do ÚLTIMO serviço.
    const getSuggestedStart = (index: number, currentRows: RowState[]): string | null => {
      if (index === 0) return null;
      const prev = currentRows[index - 1];
      if (!prev.timeSlot || !prev.serviceCode) return null;
      const [h, m] = prev.timeSlot.split(':').map(Number);
      const svc = services.find((s: any) => String(s.codigo) === String(prev.serviceCode));
      const dur = svc ? (svc.duracao_minutos || 0) : 0;
      return minToTime(h * 60 + m + dur);
    };

    const triggerLoad = async (index: number, serviceCode: string, professionalCode: string, currentRows: RowState[]) => {
      if (!serviceCode || !professionalCode) return;
      setRows(prev => prev.map((r, i) => i === index ? { ...r, loadingSlots: true, timeSlot: '', availableSlots: [] } : r));
      try {
        let slots = await generateAvailableSlots(date, serviceCode, professionalCode);
        const suggested = getSuggestedStart(index, currentRows);
        
        let autoSlot = '';
        if (suggested) {
            slots = slots.filter(s => s >= suggested);
            autoSlot = slots.length > 0 ? slots[0] : '';
        } else if (index === 0 && slots.length > 0) {
            autoSlot = '';
        }
        setRows(prev => prev.map((r, i) => i === index ? { ...r, loadingSlots: false, availableSlots: slots, timeSlot: autoSlot } : r));
      } catch {
        setRows(prev => prev.map((r, i) => i === index ? { ...r, loadingSlots: false } : r));
      }
    };

    const getEnabledProfs = (serviceCode: string) => {
      if (!serviceCode) return [];
      const svc = services.find((s: any) => String(s.codigo) === String(serviceCode));
      if (!svc) return [];
      return professionals.filter((p: any) => (svc.profissionais_habilitados || []).map(String).includes(String(p.codigo)));
    };

    const handleServiceChange = (index: number, val: string) => {
      const truncated = rows.slice(0, index + 1);
      const updated = truncated.map((r, i) => i === index ? { ...r, serviceCode: val, professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false } : r);
      const profs = getEnabledProfs(val);
      if (profs.length === 1) updated[index].professionalCode = String(profs[0].codigo);
      setRows(updated);
      if (profs.length === 1) triggerLoad(index, val, String(profs[0].codigo), updated);
    };

    const handleProfChange = (index: number, val: string) => {
      const truncated = rows.slice(0, index + 1);
      const updated = truncated.map((r, i) => i === index ? { ...r, professionalCode: val, timeSlot: '', availableSlots: [], loadingSlots: false } : r);
      setRows(updated);
      if (val && updated[index].serviceCode) triggerLoad(index, updated[index].serviceCode, val, updated);
    };

    const handleTimeChange = (index: number, val: string) => {
      const truncated = rows.slice(0, index + 1);
      const updated = truncated.map((r, i) => i === index ? { ...r, timeSlot: val } : r);
      setRows(updated);
    };

    const addRow = () => setRows(prev => [...prev, { serviceCode: '', professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false }]);
    const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

    const isValid = rows[0]?.serviceCode !== '' && rows[0]?.professionalCode !== '' && rows[0]?.timeSlot !== '';

    const handleConfirmClick = () => {
      const valid = rows.filter(r => r.serviceCode && r.professionalCode && r.timeSlot);
      if (!valid.length) return;
      const resolved = valid.map(r => ({
        service: services.find((s: any) => String(s.codigo) === String(r.serviceCode)),
        professional: professionals.find((p: any) => String(p.codigo) === String(r.professionalCode)),
        timeSlot: r.timeSlot
      })).filter(r => r.service && r.professional) as { service: any; professional: any; timeSlot: string }[];
      onConfirm(resolved);
    };

    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

    return (
      <div className="service-selection-widget">
        <div className="widget-date-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span>📅 <strong>{dateLabel}</strong></span>
          <button type="button" className="chat-action-btn" onClick={onChangeDate} style={{ margin: 0, padding: '4px 12px', fontSize: '0.85rem', background: 'var(--primary-color)', color: '#fff', border: 'none' }}>📅 Mudar Data</button>
        </div>
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '8px 12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>
          💡 <span>Selecione os serviços na <strong>ordem exata</strong> em que serão realizados.</span>
        </div>

        {rows.map((row, index) => {
          const profs = getEnabledProfs(row.serviceCode);
          const svc = services.find((s: any) => String(s.codigo) === String(row.serviceCode));
          const suggested = getSuggestedStart(index, rows);

          return (
            <div key={index} className="service-row" style={{ position: 'relative', marginTop: index > 0 ? '16px' : '0' }}>
              <div style={{ position: 'absolute', top: '-10px', left: '12px', background: 'var(--surface-color)', padding: '0 6px', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 'bold', zIndex: 1, borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                {index + 1}º Serviço
              </div>
              <div className="service-row-selects" style={{ paddingTop: '12px' }}>

                {/* Serviço */}
                <div className="service-select-group">
                  <select className="chat-action-select" value={row.serviceCode} onChange={e => handleServiceChange(index, e.target.value)}>
                    <option value="">✨ Serviço</option>
                    {services.map((s: any) => (
                      <option key={s.codigo} value={s.codigo}>{s.nome} — R$ {parseFloat(s.valor).toFixed(2).replace('.', ',')}</option>
                    ))}
                  </select>
                  {svc && <div className="service-meta">⏱ {svc.duracao_minutos} min</div>}
                </div>

                {/* Profissional */}
                <div className="service-select-group">
                  <select
                    className="chat-action-select"
                    value={row.professionalCode}
                    onChange={e => handleProfChange(index, e.target.value)}
                    disabled={!row.serviceCode || profs.length === 0}
                    style={{ opacity: row.serviceCode ? 1 : 0.5 }}
                  >
                    <option value="">
                      {!row.serviceCode ? 'Escolha o serviço' : profs.length === 0 ? 'Sem profissionais' : '👤 Profissional'}
                    </option>
                    {profs.map((p: any) => <option key={p.codigo} value={p.codigo}>{shortName(p.nome)}</option>)}
                  </select>
                </div>

                {/* Horário */}
                <div className="service-select-group">
                  {row.loadingSlots ? (
                    <div className="slots-loading">⏳ Buscando...</div>
                  ) : (
                    <>
                      <select
                        className="chat-action-select"
                        value={row.timeSlot}
                        onChange={e => handleTimeChange(index, e.target.value)}
                        disabled={!row.professionalCode || row.availableSlots.length === 0}
                        style={{ opacity: row.professionalCode ? 1 : 0.5 }}
                      >
                        <option value="">
                          {!row.professionalCode ? 'Escolha o profissional'
                            : row.availableSlots.length === 0 ? 'Sem horários disponíveis'
                            : '🕐 Horário'}
                        </option>
                        {row.availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {index > 0 && suggested && row.availableSlots.length > 0 && !row.availableSlots.find(s => s >= suggested) && (
                        <div className="slot-warning">⚠️ Sem horário após o serviço anterior. Escolha manualmente.</div>
                      )}
                      {index > 0 && suggested && row.timeSlot && row.timeSlot >= suggested && (
                        <div className="service-meta">✔ Sugerido após {suggested}</div>
                      )}
                    </>
                  )}
                </div>

              </div>

              {index > 0 && (
                <button type="button" className="service-remove-btn" onClick={() => removeRow(index)} title="Remover">✕</button>
              )}
            </div>
          );
        })}

        <button type="button" className="chat-action-btn add-service-btn" onClick={addRow}>
          ➕ Adicionar outro serviço
        </button>

        <button
          type="button"
          className={`chat-action-btn pri confirm-services-btn ${!isValid ? 'disabled-btn' : ''}`}
          onClick={handleConfirmClick}
          disabled={!isValid}
        >
          ✅ Confirmar agendamento
        </button>

        <button type="button" className="chat-action-btn menu-btn" onClick={onBack}>
          ⬅️ Voltar ao Menu
        </button>
      </div>
    );
  };

  // ===== Fluxo: pergunta data primeiro, depois mostra o widget =====
  const handleServiceSelectionFlow = (customGreeting?: string) => {
    const greetings = [
      'Qual **dia** você prefere para o atendimento?',
      'Vamos marcar! Me diz qual **data** fica melhor:',
      'Primeira coisa: qual **dia** você gostaria?',
      'Me conta qual **dia** funciona para você!',
    ];
    const finalGreet = customGreeting || greetings[Math.floor(Math.random() * greetings.length)];

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(), sender: 'isis',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: finalGreet,
        actions: (
          <DatePickerWidget
            onDateSelected={(date) => {
              clearLastIsisActions();
              addUserMessage(`Dia ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}`);
              showServiceWidgetForDate(date);
            }}
            onBack={() => { clearLastIsisActions(); addUserMessage('⬅️ Voltar ao Menu'); showMenu(); }}
          />
        )
      }]);
      setTimeout(() => scrollToBottom('smooth'), 100);
    }, 1200);
  };

  const showServiceWidgetForDate = async (date: string) => {
    const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    setIsTyping(true);

    const { data: config } = await supabase.from('configuracoes_agenda').select('*').eq('codigo_empresa', empresa.codigo).single();
    const [y, mo, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, mo - 1, d, 12).getDay();
    const dayCfg = (config?.horarios || []).find((h: any) => h.dia === dayOfWeek);

    setTimeout(() => {
      setIsTyping(false);

      if (!dayCfg || !dayCfg.aberto) {
        setMessages(prev => [...prev, {
          id: Date.now(), sender: 'isis',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          text: `Infelizmente não abrimos nesse dia da semana! 😔 Vamos tentar marcar em outra data?`,
          actions: (
            <DatePickerWidget
              onDateSelected={(newDate) => {
                clearLastIsisActions();
                addUserMessage(`Dia ${new Date(newDate + 'T12:00:00').toLocaleDateString('pt-BR')}`);
                showServiceWidgetForDate(newDate);
              }}
              onBack={() => { clearLastIsisActions(); addUserMessage('⬅️ Voltar ao Menu'); showMenu(); }}
            />
          )
        }]);
        setTimeout(() => scrollToBottom('smooth'), 100);
        return;
      }

      setMessages(prev => [...prev, {
        id: Date.now(), sender: 'isis',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: `Ótimo! Escolha os serviços para a **${dateLabel}**:`,
        actions: (
          <ServiceSelectionWidget
            date={date}
            onConfirm={(resolved) => {
              clearLastIsisActions();
              const summary = resolved.map(r => `${r.service.nome} c/ ${shortName(r.professional.nome)} às ${r.timeSlot}`).join(', ');
              addUserMessage(`Escolhi: ${summary}`);
              handleConfirmAppointmentFlow(resolved, date);
            }}
            onBack={() => { clearLastIsisActions(); addUserMessage('⬅️ Voltar ao Menu'); showMenu(); }}
            onChangeDate={() => { clearLastIsisActions(); addUserMessage('📅 Mudar data'); handleServiceSelectionFlow(); }}
          />
        )
      }]);
      setTimeout(() => scrollToBottom('smooth'), 100);
    }, 1000);
  };


  const handleConfirmAppointmentFlow = (selections: { service: any; professional: any; timeSlot: string }[], date: string) => {
     setIsTyping(true);
     setTimeout(() => {
        setIsTyping(false);
        const currentEditingAg = editingAg || editingAgRef.current;
        const totalValor = selections.reduce((acc, s) => acc + parseFloat(s.service.valor || 0), 0);
        const totalFormatado = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Calcula o fim do agendamento (último serviço termina em:)
        let maxEndMs = 0;
        for (const sel of selections) {
          const st = new Date(`${date}T${sel.timeSlot}:00`).getTime();
          const en = st + (sel.service.duracao_minutos || 30) * 60000;
          if (en > maxEndMs) maxEndMs = en;
        }
        const endTimeStr = new Date(maxEndMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [...prev, {
           id: Date.now(), sender: 'isis',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: (
              <>
                 {currentEditingAg && <div style={{ marginBottom: '8px', fontSize: '0.85rem', opacity: 0.9 }}>📍 Editando: <strong>#{currentEditingAg.codigo}</strong></div>}
                 Confirmando seu agendamento:<br/><br/>
                 📅 <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong><br/><br/>
                 {selections.map((sel, i) => (
                   <React.Fragment key={i}>
                     ✨ <strong>{sel.service.nome}</strong> — 👤 <strong>{shortName(sel.professional.nome)}</strong> — 🕐 <strong>{sel.timeSlot}</strong><br/>
                   </React.Fragment>
                 ))}
                 <br/>⏱ Término previsto: <strong>{endTimeStr}</strong><br/>
                 💰 Total: <strong>{totalFormatado}</strong><br/><br/>
                 Posso confirmar?
              </>
           ),
           actions: (
              <div className="action-buttons-grid">
                 <button className="chat-action-btn pri" type="button" onClick={() => {
                    clearLastIsisActions();
                    addUserMessage('Sim, pode confirmar! ✅');
                    handleCompleteAppointment(selections, date);
                 }}>✅ Confirmar agendamento</button>
                 <button className="chat-action-btn" type="button" onClick={() => {
                     clearLastIsisActions();
                     addUserMessage('✏️ Editar agendamento');
                     handleServiceSelectionFlow();
                  }}>✏️ Editar agendamento</button>
                  <button className="chat-action-btn cancel-btn" type="button" onClick={() => {
                     clearLastIsisActions();
                     addUserMessage('❌ Cancelar');
                     showMenu('Agendamento cancelado. Como posso te ajudar agora?');
                  }}>❌ Cancelar</button>
              </div>
           )
        }]);
        setTimeout(() => scrollToBottom('smooth'), 100);
     }, 1200);
  };


  const handleCompleteAppointment = async (selections: { service: any; professional: any; timeSlot: string }[], date: string) => {
     setIsTyping(true);

     const startObj = new Date(`${date}T${selections[0].timeSlot}:00`);
     let maxEndMs = startObj.getTime();
     for (const sel of selections) {
       const st = new Date(`${date}T${sel.timeSlot}:00`).getTime();
       const en = st + (sel.service.duracao_minutos || 30) * 60000;
       if (en > maxEndMs) maxEndMs = en;
     }
     const endObj = new Date(maxEndMs);
     const totalValor = selections.reduce((acc, s) => acc + parseFloat(s.service.valor || 0), 0);

     const currentCliente = cliente || clienteRef.current;
     if (!currentCliente) {
        toast('Ops! Problema ao identificar seu cadastro. Tente novamente.', 'error');
        setStep('identification'); setIsTyping(false); return;
     }

      try {
         let error;
         let finalCodigo = '';
         const currentEditingAg = editingAg || editingAgRef.current;
         const primarySvc = selections[0].service;
         const primaryProf = selections[0].professional;
         const profissionaisVinculo = selections.map(s => ({ serviceCode: String(s.service.codigo), professionalCode: String(s.professional.codigo) }));
         const servicosSelecionados = JSON.stringify(selections.map(s => s.service.codigo));

         if (currentEditingAg) {
            finalCodigo = currentEditingAg.codigo;
            const { error: err } = await supabase.from('agendamentos').update({
               codigo_servico: primarySvc.codigo,
               codigo_profissional: primaryProf.codigo,
               servicos_selecionados: servicosSelecionados,
               profissionais_vinculo: profissionaisVinculo,
               valor_total: totalValor,
               data_hora_inicio: startObj.toISOString(),
               data_hora_fim: endObj.toISOString(),
               observacao: '✨ Agendamento alterado via Assistente Ísis',
            }).eq('id', currentEditingAg.id);
            error = err;
         } else {
            const { data: allAgend } = await supabase.from('agendamentos').select('codigo').eq('codigo_empresa', empresa.codigo);
            const nextCod = allAgend && allAgend.length > 0 ? Math.max(...allAgend.map((x:any)=>x.codigo)) + 1 : 1;
            finalCodigo = nextCod.toString();

            const payload = {
               codigo: nextCod,
               codigo_empresa: empresa.codigo,
               codigo_servico: primarySvc.codigo,
               codigo_cliente: currentCliente.id,
               codigo_profissional: primaryProf.codigo,
               servicos_selecionados: servicosSelecionados,
               profissionais_vinculo: profissionaisVinculo,
               valor_total: totalValor,
               data_hora_inicio: startObj.toISOString(),
               data_hora_fim: endObj.toISOString(),
               status: 'agendado',
               observacao: '✨ Agendamento realizado via Assistente Ísis',
               isis_criou: true
            };

            console.log('--- ÍSIS CHAT: TENTANDO GRAVAR AGENDAMENTO ---', payload);
            const { error: err } = await supabase.from('agendamentos').insert(payload);
            error = err;
          }

        if (error) {
           console.error('--- ÍSIS CHAT: ERRO AO GRAVAR ---', error);
           toast('Poxa, tive um probleminha técnico ao salvar seu horário. Por favor, tente novamente em instantes.', 'error');
           setIsTyping(false);
           return;
        }

        console.log('--- ÍSIS CHAT: AGENDAMENTO GRAVADO COM SUCESSO! ---');

        setIsTyping(false);
        const totalFormatado = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const endTimeStr = endObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, {
           id: Date.now(),
           sender: 'isis',
           status: 'success',
           time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
           text: (
              <>
                 ✨ <strong>Agendamento confirmado com sucesso!</strong> 🎉<br/>
                 Código: <strong>#{finalCodigo}</strong><br/><br/>
                 Resumo final:<br/>
                 📅 <strong>{new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> das <strong>{selections[0].timeSlot}</strong> às <strong>{endTimeStr}</strong><br/><br/>
                 {selections.map((sel, i) => (
                   <React.Fragment key={i}>
                     ✨ <strong>{sel.service.nome}</strong> — 👤 <strong>{sel.professional.nome}</strong><br/>
                   </React.Fragment>
                 ))}
                 <br/>💰 Total: <strong>{totalFormatado}</strong><br/>
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

   const handleConfirmCancelFlow = (ag: any) => {
      setIsTyping(true);
      setTimeout(() => {
         setIsTyping(false);
         setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'isis',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            text: "Você tem certeza que deseja **cancelar** seu agendamento?",
            actions: (
               <div className="action-buttons-grid">
                  <button className="chat-action-btn cancel-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('Sim, desejo cancelar'); handleCancelAppointmentFlow(ag); }}>Sim, desejo cancelar</button>
                  <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('Não, voltar'); handleReviewAppointmentFlow(ag); }}>Não, voltar</button>
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

         const duracao = svc?.duracao_minutos || 30;
         const startObj = new Date(ag.data_hora_inicio);
         const endObj = new Date(startObj.getTime() + duracao * 60000);
         const startStr = startObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
         const endStr = endObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

         setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'isis',
            time: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
            text: (
               <>
                  Perfeito! Vamos revisar seu agendamento **#{ag.codigo}**:<br/><br/>
                  📅 <strong>{new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}</strong> das <strong>{startStr}</strong> às <strong>{endStr}</strong><br/>
                  ✨ <strong>{svc?.nome}</strong><br/>
                  👤 <strong>{prof?.nome}</strong><br/>
                  💰 Valor: <strong>{valorFormatado}</strong><br/>
                  {empresa.endereco && <>📍 Endereço: <strong>{empresa.endereco}</strong><br/></>}
                  <br/>
                  O que você deseja fazer agora?
               </>
            ),
            actions: (
               <div className="action-buttons-grid">
                  <button className="chat-action-btn pri" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('Tudo certo! ✅'); showMenu('Maravilha! Agendamento revisado. Deseja algo mais?'); }}>Tudo certo! ✅</button>
                  <button className="chat-action-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('📝 Editar agendamento'); handleServiceSelectionFlow("Qual serviço você quer?"); }}>📝 Editar agendamento</button>
                  <button className="chat-action-btn cancel-btn" type="button" onClick={() => { clearLastIsisActions(); addUserMessage('❌ Cancelar agendamento'); handleConfirmCancelFlow(ag); }}>❌ Cancelar agendamento</button>
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
       <div className="isis-footer-brand">
          <img src="/fluxo7teamcut.png" alt="Fluxo7" />
       </div>
    </div>
  );
}
