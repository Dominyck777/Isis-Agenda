import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { toast } from './Toast';
import CryptoJS from 'crypto-js';
import SettingsPanel from './Settings';
import ServicesPanel from './Services';
import AppointmentModal from './AppointmentModal';
import './Dashboard.css';

const mobileStyles = `
  @media (max-width: 768px) {
    .hide-on-mobile { display: none !important; }
    .show-on-mobile { display: flex !important; }
    .dash-sidebar.mobile-open {
       position: fixed;
       top: 0; left: 0; bottom: 0;
       width: 280px;
       z-index: 9999;
       background: var(--surface-color);
       transform: translateX(0);
       transition: transform 0.3s ease;
       box-shadow: 4px 0 15px rgba(0,0,0,0.5);
       display: flex !important;
    }
    .dash-sidebar {
       position: fixed;
       top: 0; left: 0; bottom: 0;
       width: 280px;
       z-index: 9999;
       background: var(--surface-color);
       transform: translateX(-100%);
       transition: transform 0.3s ease;
       display: flex !important;
    }
  }
  @media (min-width: 769px) {
    .show-on-mobile { display: none !important; }
    .dash-sidebar { transform: none !important; }
  }
`;

function hashPassword(password: string) {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

const IVoid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IPlus = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

const ISettings = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ILogout = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
const IFolder = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const formatMonthYear = (date: Date) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const getDaysOfWeek = (startDate: Date) => {
  const daysList = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const todayStr = new Date().toDateString();
  
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startDate, i);
    return { name: daysList[d.getDay()], dateNum: d.getDate(), fullDate: d, isToday: d.toDateString() === todayStr };
  });
};

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode] = useState<'day' | 'week' | 'month'>('week');
  const [configAgenda, setConfigAgenda] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [dicServicos, setDicServicos] = useState<any>({});
  const [dicPrecos, setDicPrecos] = useState<any>({});
  const [dicClientes, setDicClientes] = useState<any>({});
  const [dicProfs, setDicProfs] = useState<any>({});
  const [filterProf, setFilterProf] = useState('');
  const [filterServ, setFilterServ] = useState('');
  const [tempFilterProf, setTempFilterProf] = useState('');
  const [tempFilterServ, setTempFilterServ] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAgendamentosListOpen, setIsAgendamentosListOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [apptBaseDate, setApptBaseDate] = useState<Date | null>(null);
  const [apptBaseHour, setApptBaseHour] = useState<number | null>(null);
  const [editingAppt, setEditingAppt] = useState<any>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isConfigAuthOpen, setIsConfigAuthOpen] = useState(false);
  const [configPassword, setConfigPassword] = useState('');
  const [configError, setConfigError] = useState('');
  const [isGooeyActive, setIsGooeyActive] = useState(false);
  const [isModalBorderActive, setIsModalBorderActive] = useState(false);
  const [gooeyParticles, setGooeyParticles] = useState<any[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showServicesPanel, setShowServicesPanel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isisNotifications, setIsisNotifications] = useState<any[]>([]);
  const [showModalDatePicker, setShowModalDatePicker] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [finStart, setFinStart] = useState("");
  const [finEnd, setFinEnd] = useState("");
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFinStart(firstDay.toISOString().split('T')[0]);
    setFinEnd(lastDay.toISOString().split('T')[0]);
  }, []);

  const handleGridScroll = useCallback(() => {
    if (gridScrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = gridScrollRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        setZoomFactor(prev => {
          const next = prev + (delta > 0 ? 0.1 : -0.1);
          return Math.min(Math.max(next, 1.0), 5.0);
        });
      }
    };
    grid.addEventListener('wheel', handleWheel, { passive: false });
    return () => grid.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const loadUser = () => {
      const data = localStorage.getItem('isis_user');
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        if (parsed && !parsed.is_admin && parsed.codigo) {
          setFilterProf(parsed.codigo.toString());
        }
      }
    };
    loadUser();
    window.addEventListener('isis_user_updated', loadUser);
    return () => window.removeEventListener('isis_user_updated', loadUser);
  }, []);

  useEffect(() => {
    if (user && !showSettingsPanel) {
      supabase.from('configuracoes_agenda').select('*').eq('codigo_empresa', user.codigo_empresa).single().then(({data: cfg}) => {
        if (cfg) setConfigAgenda(cfg);
      });
    }
  }, [showSettingsPanel, user]);

  let earliest = 9;
  let latest = 18;
  if (configAgenda?.horarios) {
    const openDays = configAgenda.horarios.filter((h: any) => h.aberto);
    if (openDays.length > 0) {
      earliest = Math.min(...openDays.map((h: any) => parseInt(h.inicio?.split(':')[0] || '9')));
      latest = Math.max(...openDays.map((h: any) => {
        const [hh, mm] = (h.fim || '18:00').split(':').map(Number);
        return hh + (mm > 0 ? 1 : 0);
      }));
    }
  }

  const hoursArray = Array.from({ length: Math.max(8, (latest - earliest) + 1) }, (_, i) => i + earliest);
  const startOfWeekDate = getStartOfWeek(currentDate);
  const currentWeekDays = getDaysOfWeek(startOfWeekDate); 

  const [baseColWidth, setBaseColWidth] = useState(140);
  useEffect(() => {
    const calcBase = () => {
      const w = window.innerWidth;
      const targetWidth = Math.max(w * 0.16, 120);
      const minToFill = (w - 45) / (currentWeekDays.length || 7);
      setBaseColWidth(Math.max(targetWidth, minToFill));
    };
    calcBase();
    window.addEventListener('resize', calcBase);
    return () => window.removeEventListener('resize', calcBase);
  }, [currentWeekDays.length]);

  const currentColWidth = baseColWidth * zoomFactor;
  const totalGridWidth = 45 + (currentWeekDays.length * currentColWidth) + 1;

  const filteredAgendamentos = React.useMemo(() => {
     return agendamentos.filter(ag => {
         if (ag.status === 'cancelado') return false;
         if (user && !user.is_admin && String(ag.codigo_profissional) !== String(user.codigo)) return false;
         if (filterProf && ag.codigo_profissional.toString() !== filterProf) return false;
         if (filterServ && ag.codigo_servico.toString() !== filterServ) return false;
         return true;
     });
  }, [agendamentos, filterProf, filterServ, user]);

  const agStyles = React.useMemo(() => {
    const styles: Record<string, { colIndex: number, numCols: number }> = {};
    if (!filteredAgendamentos || !currentWeekDays) return styles;
    const porDia: Record<number, any[]> = {};
    filteredAgendamentos.forEach(ag => {
       const ini = new Date(ag.data_hora_inicio);
       const dIdx = currentWeekDays.findIndex(d => d.fullDate.toDateString() === ini.toDateString());
       if (dIdx !== -1) {
          if (!porDia[dIdx]) porDia[dIdx] = [];
          porDia[dIdx].push(ag);
       }
    });
    Object.values(porDia).forEach(dayAgs => {
        const sorted = dayAgs.sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
        const clusters: any[][] = [];
        let currentCluster: any[] = [];
        let clusterEndTime = 0;
        sorted.forEach(ag => {
            const start = new Date(ag.data_hora_inicio).getTime();
            const end = new Date(ag.data_hora_fim).getTime();
            if (currentCluster.length === 0) {
                currentCluster.push(ag);
                clusterEndTime = end;
            } else {
                if (start < clusterEndTime) {
                    currentCluster.push(ag);
                    if (end > clusterEndTime) clusterEndTime = end;
                } else {
                    clusters.push([...currentCluster]);
                    currentCluster = [ag];
                    clusterEndTime = end;
                }
            }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);
        clusters.forEach(cluster => {
            const columns: any[][] = [];
            cluster.forEach(ag => {
                let placed = false;
                const start = new Date(ag.data_hora_inicio).getTime();
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i];
                    if (new Date(col[col.length - 1].data_hora_fim).getTime() <= start) {
                        col.push(ag);
                        styles[ag.id] = { colIndex: i, numCols: 1 };
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    styles[ag.id] = { colIndex: columns.length, numCols: 1 };
                    columns.push([ag]);
                }
            });
            const numCols = columns.length;
            cluster.forEach(ag => { if (styles[ag.id]) styles[ag.id].numCols = numCols; });
        });
    });
    return styles;
  }, [filteredAgendamentos, currentWeekDays]);

  const reloadDashboardGrid = async () => {
     if (!user) return;
     const startOfWk = currentWeekDays[0].fullDate;
     const endOfWk = currentWeekDays[currentWeekDays.length - 1].fullDate;
     const { data: ags } = await supabase.from('agendamentos')
         .select('*')
         .eq('codigo_empresa', user.codigo_empresa)
         .gte('data_hora_inicio', startOfWk.toISOString())
         .lte('data_hora_fim', new Date(endOfWk.getTime() + 86400000).toISOString());
     if (ags) {
        const nowMs = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
        ags.forEach(ag => {
             if (ag.status === 'cancelado' || ag.status === 'finalizado') return;
             const start = new Date(ag.data_hora_inicio).getTime();
             const end = new Date(ag.data_hora_fim).getTime();
             let newStatus = ag.status;
             if (nowMs >= end && ag.status !== 'finalizado') newStatus = 'finalizado';
             else if (nowMs >= start && nowMs < end && ag.status !== 'em andamento') newStatus = 'em andamento';
             if (newStatus !== ag.status) {
                 ag.status = newStatus;
                 supabase.from('agendamentos').update({ status: newStatus }).eq('id', ag.id).then();
             }
        });
        setAgendamentos([...ags]);
        const svcIds = [...new Set(ags.map(x => x.codigo_servico))];
        const cliIds = [...new Set(ags.map(x => x.codigo_cliente))];
        const profIds = [...new Set(ags.map(x => x.codigo_profissional))];
        if (svcIds.length > 0) {
            supabase.from('servicos').select('codigo, nome, valor').in('codigo', svcIds).then(({data}) => {
               const mapN: any = {}; const mapP: any = {};
               data?.forEach((s:any) => { mapN[s.codigo] = s.nome; mapP[s.codigo] = s.valor; });
               setDicServicos((prev:any) => ({...prev, ...mapN}));
               setDicPrecos((prev:any) => ({...prev, ...mapP}));
            });
        }
        if (cliIds.length > 0) {
            supabase.from('clientes').select('id, nome').in('id', cliIds).then(({data}) => {
               const map: any = {}; data?.forEach((c:any) => map[c.id] = c.nome);
               setDicClientes((prev:any) => ({...prev, ...map}));
            });
        }
        if (profIds.length > 0) {
            supabase.from('usuarios').select('codigo, nome').in('codigo', profIds).then(({data}) => {
               const map: any = {}; data?.forEach((p:any) => map[p.codigo] = p.nome);
               setDicProfs((prev:any) => ({...prev, ...map}));
            });
        }
     }
  };

  useEffect(() => { reloadDashboardGrid(); }, [user, currentDate]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const nowMs = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getTime();
      setAgendamentos(prevAgs => {
         let changed = false;
         const newAgs = prevAgs.map(ag => {
             if (ag.status === 'cancelado' || ag.status === 'finalizado') return ag;
             const start = new Date(ag.data_hora_inicio).getTime();
             const end = new Date(ag.data_hora_fim).getTime();
             let newStatus = ag.status;
             if (nowMs >= end && ag.status !== 'finalizado') newStatus = 'finalizado';
             else if (nowMs >= start && nowMs < end && ag.status !== 'em andamento') newStatus = 'em andamento';
             if (newStatus !== ag.status) {
                 changed = true;
                 supabase.from('agendamentos').update({ status: newStatus }).eq('id', ag.id).then();
                 return { ...ag, status: newStatus };
             }
             return ag;
         });
         return changed ? newAgs : prevAgs;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('isis-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agendamentos' }, (payload: any) => {
        const isMinhaEmpresa = String(payload.new.codigo_empresa) === String(user.codigo_empresa);
        const isCriadoPelaIsis = payload.new.isis_criou === true || payload.new.isis_criou === 'true';
        if (isMinhaEmpresa && isCriadoPelaIsis) {
          const id = Date.now() + Math.random();
          setIsisNotifications(p => [...p, { id, ...payload.new, timestamp: Date.now() }]);
          reloadDashboardGrid();
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (isisNotifications.length === 0) return;
    const timers = isisNotifications.map(n => {
       if (!n.exiting) {
          return setTimeout(() => {
             setIsisNotifications(p => p.map(x => x.id === n.id ? { ...x, exiting: true } : x));
             setTimeout(() => { setIsisNotifications(p => p.filter(x => x.id !== n.id)); }, 600);
          }, Math.max(0, 30000 - (Date.now() - n.timestamp)));
       }
       return null;
    });
    return () => timers.forEach(t => t && clearTimeout(t));
  }, [isisNotifications.length]);

  const handlePrevRange = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextRange = () => setCurrentDate(addDays(currentDate, 7));
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());
  const handleMiniCalClick = (dayStr: number) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayStr));

  const openSlotModal = (day: Date, hour: number) => { setApptBaseDate(day); setApptBaseHour(hour); setEditingAppt(null); setIsApptModalOpen(true); };
  const openEditAgendamento = (ag: any) => { setApptBaseDate(null); setApptBaseHour(null); setEditingAppt(ag); setIsApptModalOpen(true); };
  const openFilterModal = () => { setIsMobileSidebarOpen(false); setTempFilterProf(filterProf); setTempFilterServ(filterServ); setIsFilterModalOpen(true); };

  const handleSettingsClick = () => {
    if (!user) return;
    if (user.is_admin) { setShowSettingsPanel(true); return; }
    setConfigPassword(''); setConfigError(''); setIsConfigAuthOpen(true);
  };

  const handleConfigAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const hashedInput = hashPassword(configPassword);
    const { data: admins } = await supabase.from('usuarios').select('senha').eq('codigo_empresa', user.codigo_empresa).eq('is_admin', true).eq('ativo', true);
    if (admins?.some(a => a.senha === hashedInput) || (user.is_admin && hashedInput === user.senha)) {
      setIsConfigAuthOpen(false);
      setShowSettingsPanel(true);
    } else { toast('Acesso negado: Senha incorreta.', 'error'); setConfigError('Senha incorreta!'); }
  };

  const renderMiniCalendar = () => {
    const miniGridBlanks = Array.from({ length: getFirstDayOfMonth(currentDate) });
    const miniGridDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);
    return (
      <div className="mini-calendar" onClick={e => e.stopPropagation()}>
        <div className="mini-cal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems:'center' }}>
          <h4 style={{ margin: 0, fontSize:'1rem' }}>{formatMonthYear(currentDate)}</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ cursor: 'pointer', padding: '0 8px', fontSize:'1.1rem' }} onClick={handlePrevMonth}>❮</span>
            <span style={{ cursor: 'pointer', padding: '0 8px', fontSize:'1.1rem' }} onClick={handleNextMonth}>❯</span>
          </div>
        </div>
        <div className="mini-grid">
          {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="mini-day-header">{d}</span>)}
          {miniGridBlanks.map((_, i) => <span key={`blank-${i}`}></span>)}
          {miniGridDays.map((dNum) => {
            const trd = new Date(currentDate.getFullYear(), currentDate.getMonth(), dNum);
            const isToday = trd.toDateString() === new Date().toDateString();
            const isSel = trd.toDateString() === currentDate.toDateString();
            return <span key={dNum} className={`mini-day ${isSel ? 'active' : ''} ${isToday ? 'mini-today' : ''}`} onClick={() => { handleMiniCalClick(dNum); setShowDatePicker(false); setShowModalDatePicker(false); }}>{dNum}</span>;
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{mobileStyles}</style>
      <div className="dash-layout">
        <header className="dash-header">
          <div className="left" style={{ gap: '12px', minWidth: 'fit-content' }}>
            <div className="show-on-mobile" style={{ fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setIsMobileSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user?.empresas?.logo_url ? <img src={user.empresas.logo_url} alt="Logo" style={{ width: '44px', height: '44px', borderRadius: '8px', border: '2px solid #0ea5e9' }} /> : <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0ea5e9' }}>{user?.empresas?.nome_exibicao?.charAt(0) || 'I'}</div>}
              <span className="hide-on-mobile" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.empresas?.nome_exibicao || 'Sua Empresa'}</span>
            </div>
          </div>
          <div className="center">
            <button className="btn-today" onClick={handleToday}>Hoje</button>
            <div className="nav-arrows">
              <button className="icon-btn" onClick={handlePrevRange}>❮</button>
              <button className="icon-btn" onClick={handleNextRange}>❯</button>
            </div>
            <h2 className="month" onClick={() => setShowDatePicker(!showDatePicker)} style={{ position:'relative', cursor:'pointer' }}>
              {formatMonthYear(currentDate)} <span style={{fontSize: '0.6rem', opacity: 0.7}}>▼</span>
              {showDatePicker && (
                <div className="floating-datepicker" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-color)', padding: '16px', borderRadius: '12px', zIndex: 1000, border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', marginTop: '12px' }}>
                  {renderMiniCalendar()}
                </div>
              )}
            </h2>
          </div>
          <div className="right">
            <button className="btn-pri" onClick={() => { setEditingAppt(null); setIsApptModalOpen(true); }}><IPlus /> <span className="hide-on-mobile">Novo</span></button>
            <button className="btn-sec icon-only" onClick={openFilterModal} title="Filtros"><IFolder /></button>
            <button className="btn-sec icon-only" onClick={handleSettingsClick} title="Configurações"><ISettings /></button>
            <button className="btn-sec icon-only" onClick={() => setIsLogoutModalOpen(true)} title="Sair"><ILogout /></button>
          </div>
        </header>

        <div className="dash-container">
          <aside className={`dash-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop:'16px' }}>
              <button className="btn-sec" style={{ width: '100%', justifyContent:'flex-start', padding:'12px 16px' }} onClick={() => { setIsMobileSidebarOpen(false); setIsAgendamentosListOpen(true); }}>
                📅 Agendamentos do Dia
              </button>
              <button className="btn-sec" style={{ width: '100%', justifyContent:'flex-start', padding:'12px 16px' }} onClick={() => { setIsMobileSidebarOpen(false); setIsFinancialModalOpen(true); }}>
                💰 Resumo Financeiro
              </button>
            </div>
          </aside>

          <main className="dash-main" ref={gridScrollRef} onScroll={handleGridScroll} style={{ '--current-col-width': `${currentColWidth}px`, '--total-grid-width': `${totalGridWidth}px` } as any}>
            <div className="cal-header-row" ref={headerScrollRef}>
              <div className="header-inner" style={{ width: `${totalGridWidth}px` }}>
                <div style={{ width: '45px', flex: 'none', position: 'sticky', left: 0, zIndex: 100, backgroundColor: 'var(--surface-color)', borderRight: '1px solid var(--border-color)' }}></div>
                {currentWeekDays.map((day, i) => (
                  <div key={i} className={`cal-day-header ${day.isToday ? 'today' : ''}`} style={{ width: `${currentColWidth}px` }}>
                    <span className="day-name">{day.name}</span>
                    <span className="day-num">{day.dateNum}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="cal-grid-body" style={{ width: `${totalGridWidth}px` }}>
              <div className="time-col">
                {hoursArray.map(h => <div key={h} className="time-cell">{h}:00</div>)}
              </div>
              {currentWeekDays.map((day, dIdx) => (
                <div key={dIdx} className="day-col" style={{ width: `${currentColWidth}px` }}>
                  {hoursArray.map(h => {
                    const isAlmoco = configAgenda?.horarios?.find((x:any) => x.dia === day.fullDate.getDay())?.inicio_almoco === `${h}:00`;
                    return <div key={h} className="grid-cell" onClick={() => openSlotModal(day.fullDate, h)}>{isAlmoco && <span className="lunch-label">☕ Almoço</span>}</div>;
                  })}
                  {filteredAgendamentos.filter(ag => new Date(ag.data_hora_inicio).toDateString() === day.fullDate.toDateString()).map(ag => {
                    const style = agStyles[ag.id]; if (!style) return null;
                    const ini = new Date(ag.data_hora_inicio); const fim = new Date(ag.data_hora_fim);
                    const top = (ini.getHours() - earliest + ini.getMinutes()/60) * 80;
                    const height = ((fim.getTime() - ini.getTime()) / 3600000) * 80;
                    const cardWidth = (currentColWidth - 10) / (style.numCols || 1);
                    const cardLeft = 5 + (style.colIndex * cardWidth);
                    const colorBase = ag.status === 'cancelado' ? '#ef4444' : ag.status === 'finalizado' ? '#10b981' : ag.status === 'em andamento' ? '#f59e0b' : '#0ea5e9';
                    return (
                      <div key={ag.id} className="appt-card" style={{ position: 'absolute', top, height, left: cardLeft, width: cardWidth, borderLeft: `3px solid ${colorBase}`, background: `${colorBase}15`, padding: '4px', borderRadius: '4px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); openEditAgendamento(ag); }}>
                        <strong style={{ fontSize: '0.75rem', color: colorBase }}>{dicServicos[ag.codigo_servico] || 'Serviço'}</strong>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{dicClientes[ag.codigo_cliente] || 'Cliente'}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {isAgendamentosListOpen && (
        <div className="modal-overlay" onClick={() => setIsAgendamentosListOpen(false)} style={{ zIndex: 4000 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%', minHeight: '520px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div className="nav-arrows" style={{ display:'flex', gap:'4px' }}>
                   <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, -1))} style={{ padding:'4px 8px' }}>❮</button>
                   <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))} style={{ padding:'4px 8px' }}>❯</button>
                 </div>
                 <div style={{ position:'relative' }}>
                    <h3 style={{ margin: 0, fontSize:'1.1rem' }}>Agendamentos do Dia</h3>
                    <p onClick={() => setShowModalDatePicker(!showModalDatePicker)} style={{ cursor: 'pointer', margin:0, fontSize:'0.85rem', color:'var(--text-muted)' }}>
                      {currentDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })} ▼
                    </p>
                    {showModalDatePicker && (
                      <div className="floating-datepicker" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 5000, background:'var(--surface-color)', padding:'16px', borderRadius:'12px', border:'1px solid var(--border-color)', boxShadow:'0 10px 30px rgba(0,0,0,0.5)', marginTop:'8px' }}>
                        {renderMiniCalendar()}
                      </div>
                    )}
                 </div>
              </div>
              <button style={{ background:'transparent', border:'none', color:'var(--text-muted)', fontSize:'1.2rem', cursor:'pointer', padding:'8px' }} onClick={() => setIsAgendamentosListOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agendamentos.filter(ag => new Date(ag.data_hora_inicio).toDateString() === currentDate.toDateString()).sort((a,b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime()).map(ag => (
                <div key={ag.id} style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '12px', borderLeft: `4px solid ${ag.status === 'cancelado' ? '#ef4444' : ag.status === 'finalizado' ? '#10b981' : '#0ea5e9'}`, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'transform 0.2s ease' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: ag.status === 'cancelado' ? '#ef4444' : '#fff' }}>
                      {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} - {dicServicos[ag.codigo_servico] || 'Serviço'}
                    </strong>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop:'2px' }}>
                      {dicClientes[ag.codigo_cliente] || 'Cliente'} 
                      {ag.isis_criou && (
                        <span style={{ 
                          color: '#0ea5e9', 
                          fontWeight: 700, 
                          fontSize:'0.75rem', 
                          background:'rgba(14,165,233,0.1)', 
                          padding:'2px 6px', 
                          borderRadius:'4px', 
                          marginLeft:'8px' 
                        }}>
                          ✨ Ísis
                        </span>
                      )}
                      {ag.status === 'cancelado' && <span style={{ color:'#ef4444', marginLeft:'8px' }}>(Cancelado)</span>}
                    </div>
                  </div>
                  <button className="btn-sec" style={{ margin: 0, padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => { setIsAgendamentosListOpen(false); openEditAgendamento(ag); }}>Ver</button>
                </div>
              ))}
              {agendamentos.filter(ag => new Date(ag.data_hora_inicio).toDateString() === currentDate.toDateString()).length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', background:'var(--input-bg)', borderRadius:'12px' }}>Nenhum agendamento para este dia.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isFinancialModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFinancialModalOpen(false)} style={{ zIndex: 6000 }}>
           <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%', padding:'28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize:'1.2rem' }}>Resumo Financeiro</h3>
                <button style={{ background:'transparent', border:'none', color:'var(--text-muted)', fontSize:'1.4rem', cursor:'pointer' }} onClick={() => setIsFinancialModalOpen(false)}>✕</button>
              </div>
              <div style={{ margin: '0 0 24px 0', display: 'flex', gap: '12px' }}>
                <div style={{ flex:1 }}><label style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'block', marginBottom:'4px' }}>Data Início</label><input type="date" value={finStart} onChange={e => setFinStart(e.target.value)} style={{ width:'100%', padding: '10px', borderRadius: '8px', background: 'var(--input-bg)', color:'#fff', border:'1px solid var(--border-color)' }} /></div>
                <div style={{ flex:1 }}><label style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'block', marginBottom:'4px' }}>Data Fim</label><input type="date" value={finEnd} onChange={e => setFinEnd(e.target.value)} style={{ width:'100%', padding: '10px', borderRadius: '8px', background: 'var(--input-bg)', color:'#fff', border:'1px solid var(--border-color)' }} /></div>
              </div>
              {(() => {
                const s = new Date(finStart); s.setHours(0,0,0,0);
                const e = new Date(finEnd); e.setHours(23,59,59,999);
                const filtered = agendamentos.filter(ag => { const d = new Date(ag.data_hora_inicio); return d >= s && d <= e; });
                const rec = filtered.filter(ag => ag.status === 'finalizado').reduce((acc, ag) => acc + (parseFloat(dicPrecos[ag.codigo_servico]) || 0), 0);
                const pend = filtered.filter(ag => ag.status !== 'cancelado' && ag.status !== 'finalizado').reduce((acc, ag) => acc + (parseFloat(dicPrecos[ag.codigo_servico]) || 0), 0);
                const total = rec + pend;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border:'1px solid rgba(16,185,129,0.15)' }}>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight:600, marginBottom:'4px' }}>Recebido (Finalizados)</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{rec.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '12px', border:'1px solid rgba(14,165,233,0.15)' }}>
                      <div style={{ color: '#0ea5e9', fontSize: '0.85rem', fontWeight:600, marginBottom:'4px' }}>A Receber (Ativos)</div>
                      <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{pend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <div style={{ padding: '20px', background: 'var(--input-bg)', borderRadius: '12px', border:'1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom:'4px' }}>Total Projetado</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color:'var(--primary-color)' }}>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <button className="btn-pri" style={{ width:'100%', margin:'8px 0 0 0', height:'48px', fontSize:'1rem' }} onClick={() => setIsFinancialModalOpen(false)}>Fechar Relatório</button>
                  </div>
                );
              })()}
           </div>
        </div>
      )}

      {isApptModalOpen && (
        <AppointmentModal
          isOpen={isApptModalOpen}
          onClose={() => { setIsApptModalOpen(false); reloadDashboardGrid(); }}
          user={user}
          baseDate={apptBaseDate}
          baseHour={apptBaseHour}
          editingAppt={editingAppt}
        />
      )}

      <div className="isis-notifications-container">
        {isisNotifications.map(n => (
          <div key={n.id} className={`isis-notif-card ${n.exiting ? 'exiting' : ''}`} onClick={() => { setIsisNotifications(p => p.filter(x => x.id !== n.id)); openEditAgendamento(n); }}>
            <div className="isis-notif-avatar"><img src="/isisneutraperfil.png" alt="Ísis" /></div>
            <div className="isis-notif-content">
              <strong style={{ display:'block', marginBottom:'2px' }}>Novo via Ísis ✨</strong>
              <p style={{ margin:0, fontSize:'0.85rem', opacity:0.9 }}>{dicServicos[n.codigo_servico] || 'Serviço'}</p>
            </div>
            <div className="notif-progress-container"><div className="notif-progress-bar" /></div>
          </div>
        ))}
      </div>

      {isConfigAuthOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-card" style={{ maxWidth: '360px', width: '90%', padding:'32px' }}>
            <h3 style={{ textAlign: 'center', marginBottom:'12px' }}>Acesso Restrito</h3>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom:'24px' }}>Confirme sua senha de administrador para acessar as configurações.</p>
            <form onSubmit={handleConfigAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="password" placeholder="Senha" value={configPassword} onChange={e => setConfigPassword(e.target.value)} autoFocus style={{ width:'100%', padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }} />
              {configError && <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{configError}</div>}
              <div style={{ display:'flex', gap:'12px' }}>
                <button type="button" className="btn-sec" style={{ flex:1, margin:0 }} onClick={() => setIsConfigAuthOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-pri" style={{ flex:1, margin:0 }}>Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsPanel && user && (
        <SettingsPanel 
          isOpen={showSettingsPanel} 
          onClose={() => setShowSettingsPanel(false)} 
          codigoEmpresa={user.codigo_empresa} 
        />
      )}

      <svg style={{ position: 'absolute', width: 0, height: 0 }}><defs><filter id="gooey-filter"><feGaussianBlur stdDeviation="6" /><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" /></filter></defs></svg>
      {isLogoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)} style={{ zIndex: 10000 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth:'340px', textAlign:'center', padding:'32px' }}>
            <h3 style={{ marginBottom:'12px' }}>Sair do Sistema</h3>
            <p style={{ color:'var(--text-muted)', marginBottom:'24px' }}>Deseja realmente encerrar sua sessão atual?</p>
            <div style={{ display:'flex', gap:'12px' }}>
              <button className="btn-sec" style={{ flex:1, margin:0 }} onClick={() => setIsLogoutModalOpen(false)}>Não</button>
              <button className="btn-pri" style={{ flex:1, margin:0, background:'#ef4444' }} onClick={onLogout}>Sim, Sair</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
