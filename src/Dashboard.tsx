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

// FunÃ§Ã£o auxiliar para re-autenticaÃ§Ã£o admin
function hashPassword(password: string) {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

// Ãcones SVG minimalistas
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

// Helpers de Data
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
  const months = ['Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const getDaysOfWeek = (startDate: Date) => {
  const daysList = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÃB'];
  const todayStr = new Date().toDateString();
  
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startDate, i);
    return { name: daysList[d.getDay()], dateNum: d.getDate(), fullDate: d, isToday: d.toDateString() === todayStr };
  });
};

/* Ocultado preventivamente para passar no Vercel Build (noUnusedLocals)
const getDayArray = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const daysList = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÃB'];
  const todayStr = new Date().toDateString();
  return [{ name: daysList[d.getDay()], dateNum: d.getDate(), fullDate: d, isToday: d.toDateString() === todayStr }];
};

const getMonthArray = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysList = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÃB'];
  const todayStr = new Date().toDateString();

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay()); 

  const endDate = new Date(lastDay);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
  }

  const arr = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    arr.push({
      name: daysList[current.getDay()],
      dateNum: current.getDate(),
      fullDate: new Date(current),
      isToday: current.toDateString() === todayStr,
      isCurrentMonth: current.getMonth() === month
    });
    current.setDate(current.getDate() + 1);
  }
  return arr;
};
*/

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode] = useState<'day' | 'week' | 'month'>('week'); // Mantido como 'week' por padrÃ£o
  // Base Rules
  const [configAgenda, setConfigAgenda] = useState<any>(null);
  
  // Agendamentos Motor Central
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [dicServicos, setDicServicos] = useState<any>({});
  const [dicClientes, setDicClientes] = useState<any>({});
  const [dicProfs, setDicProfs] = useState<any>({});

  // Filtros da Grade
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

  // Settings / Admin Auth
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

  const [zoomFactor, setZoomFactor] = useState(1.0);
  const lastPinchDistRef = useRef<number>(0);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

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

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastPinchDistRef.current = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistRef.current > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const delta = dist - lastPinchDistRef.current;
        
        if (Math.abs(delta) > 2) {
          setZoomFactor(prev => {
            const next = prev + (delta > 0 ? 0.05 : -0.05);
            return Math.min(Math.max(next, 1.0), 5.0);
          });
          lastPinchDistRef.current = dist;
        }
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistRef.current = 0;
    };

    grid.addEventListener('wheel', handleWheel, { passive: false });
    grid.addEventListener('touchstart', handleTouchStart, { passive: true });
    grid.addEventListener('touchmove', handleTouchMove, { passive: false });
    grid.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      grid.removeEventListener('wheel', handleWheel);
      grid.removeEventListener('touchstart', handleTouchStart);
      grid.removeEventListener('touchmove', handleTouchMove);
      grid.removeEventListener('touchend', handleTouchEnd);
    };
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
  
  // Hoisting fix: removed temporary placement here

  if (configAgenda?.horarios) {
    const openDays = configAgenda.horarios.filter((h: any) => h.aberto);
    if (openDays.length > 0) {
      // Pega o menor horÃ¡rio de inÃ­cio e o maior de fim entre todos os dias configurados para definir a "Janela do Grid"
      earliest = Math.min(...openDays.map((h: any) => {
        if (!h.inicio) return 9;
        const part = h.inicio.split(':')[0];
        return part ? parseInt(part) : 9;
      }));
      
      const latestFromHours = openDays.map((h: any) => {
        if (!h.fim) return 18;
        const [hh, mm] = h.fim.split(':').map(Number);
        return (hh || 18) + (mm > 0 ? 1 : 0); 
      });
      latest = Math.max(...latestFromHours);
    }
  }

  // O Grid agora Ã© estritamente limitado Ã  "Janela Comercial". 
  // Agendamentos fora dessa janela nÃ£o expandem mais o grid visualmente.


  // Previna a quebra do array do Grid caso os horÃ¡rios sejam inconsistentes
  if (earliest < 0) earliest = 0;
  if (latest > 23) latest = 23;
  if (latest <= earliest) latest = earliest + 8; 

  const hoursArray = Array.from({ length: (latest - earliest) + 1 }, (_, i) => i + earliest);

  const startOfWeekDate = getStartOfWeek(currentDate);
  // viewMode is hardcoded to week logic below since day/month are commented
  const currentWeekDays = getDaysOfWeek(startOfWeekDate); 

  // Calcula a largura da coluna baseada na tela disponÃ­vel (mÃ­nimo de preenchimento de 100%)
  const [baseColWidth, setBaseColWidth] = useState(140);
  
  useEffect(() => {
    const calcBase = () => {
      const w = window.innerWidth;
      const sidebar = 45;
      const count = currentWeekDays.length || 7;
      // Define a largura base para ser 120px ou 16dvw, o que for maior, garantindo scroll no mobile
      const targetWidth = Math.max(w * 0.16, 120);
      const minToFill = (w - sidebar) / count;
      setBaseColWidth(Math.max(targetWidth, minToFill));
    };
    calcBase();
    window.addEventListener('resize', calcBase);
    return () => window.removeEventListener('resize', calcBase);
  }, [currentWeekDays.length]);

  const currentColWidth = baseColWidth * zoomFactor;
  const totalGridWidth = 45 + (currentWeekDays.length * currentColWidth) + 1; // +1px buffer for subpixel edge case

  const filteredAgendamentos = React.useMemo(() => {
     return agendamentos.filter(ag => {
         if (ag.status === 'cancelado') return false;
         
         // PRIVACIDADE: NÃ£o admins sÃ³ veem seus PRÃ“PRIOS agendamentos
         if (user && !user.is_admin && String(ag.codigo_profissional) !== String(user.codigo)) {
           return false;
         }

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
            cluster.forEach(ag => {
                if (styles[ag.id]) styles[ag.id].numCols = numCols;
            });
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
        // Auto-avaliaÃ§Ã£o do Status por Tempo Real (Hora de BrasÃ­lia)
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const nowMs = now.getTime();
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
           supabase.from('servicos').select('codigo, nome').in('codigo', svcIds).then(({data}) => {
              const map: any = {}; data?.forEach((s:any) => map[s.codigo] = s.nome);
              setDicServicos((prev:any) => ({...prev, ...map}));
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

  useEffect(() => {
    reloadDashboardGrid();
  }, [user, currentDate, viewMode]);

  // Hook AutÃ´nomo de Estado MÃ¡gico temporal
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const nowMs = now.getTime();

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
    }, 60000); // 1 minuto de Polling Silencioso
    return () => clearInterval(interval);
  }, [user]);

  // Hook de NotificaÃ§Ãµes em Tempo Real da Ãsis
  useEffect(() => {
    if (!user) return;

    console.log('Iniciando subscriÃ§Ã£o em tempo real para empresa:', user.codigo_empresa);

    const channel = supabase
      .channel('isis-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agendamentos'
      }, (payload: any) => {
        console.log('Evento de INSERT recebido:', payload);
        
        const isMinhaEmpresa = String(payload.new.codigo_empresa) === String(user.codigo_empresa);
        const isCriadoPelaIsis = payload.new.isis_criou === true || payload.new.isis_criou === 'true';

        if (isMinhaEmpresa && isCriadoPelaIsis) {
          console.log('NotificaÃ§Ã£o da Ãsis disparada!');
          
          // Busca o nome do serviÃ§o se nÃ£o estiver no dicionÃ¡rio
          const svcId = payload.new.codigo_servico;
          if (svcId && !dicServicos[svcId]) {
            supabase.from('servicos').select('nome').eq('codigo', svcId).single().then(({data}) => {
              if (data) setDicServicos((prev: any) => ({...prev, [svcId]: data.nome}));
            });
          }

          // Busca o nome do profissional se nÃ£o estiver no dicionÃ¡rio
          const profId = payload.new.codigo_profissional;
          if (profId && !dicProfs[profId]) {
            supabase.from('usuarios').select('nome').eq('codigo', profId).single().then(({data}) => {
              if (data) setDicProfs((prev: any) => ({...prev, [profId]: data.nome}));
            });
          }

          const id = Date.now() + Math.random();
          const newNotif = {
            id,
            ...payload.new,
            timestamp: Date.now()
          };
          setIsisNotifications(prev => [...prev, newNotif]);
          reloadDashboardGrid();
        }
      })
      .subscribe((status) => {
        console.log('Status da subscriÃ§Ã£o Ãsis:', status);
      });

    return () => {
      console.log('Limpando subscriÃ§Ã£o Ãsis');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Hook de Gerenciamento do Ciclo de Vida das NotificaÃ§Ãµes (SaÃ­da automÃ¡tica apÃ³s 30s)
  useEffect(() => {
    if (isisNotifications.length === 0) return;

    const agora = Date.now();
    const timers = isisNotifications.map(n => {
       // Se a notificaÃ§Ã£o ainda nÃ£o tem o temporizador agendado no Dashboard
       if (!n.exiting) {
          const tempoRestante = 30000 - (agora - n.timestamp);
          return setTimeout(() => {
             console.log('Iniciando animaÃ§Ã£o de saÃ­da para:', n.id);
             setIsisNotifications(prev => prev.map(x => x.id === n.id ? { ...x, exiting: true, exitedAt: Date.now() } : x));
             
             // Agenda a remoÃ§Ã£o definitiva logo apÃ³s a animaÃ§Ã£o de 500ms
             setTimeout(() => {
               console.log('Removendo notificaÃ§Ã£o definitivamente:', n.id);
               setIsisNotifications(prev => prev.filter(x => x.id !== n.id));
             }, 600);
          }, Math.max(0, tempoRestante));
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

  const handleMiniCalClick = (dayStr: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayStr));
  };

  const openSlotModal = (day: Date, hour: number) => {
    setApptBaseDate(day);
    setApptBaseHour(hour);
    setEditingAppt(null);
    setIsApptModalOpen(true);
  };
  const openGeneralModal = () => { 
    setApptBaseDate(new Date());
    setApptBaseHour(new Date().getHours());
    setEditingAppt(null);
    setIsApptModalOpen(true);
  };
  const openEditAgendamento = (ag: any) => {
    setApptBaseDate(null);
    setApptBaseHour(null);
    setEditingAppt(ag);
    setIsApptModalOpen(true);
  };

  // Fluxo de Desbloqueio das ConfiguraÃ§Ãµes
  const openFilterModal = () => {
    setIsMobileSidebarOpen(false);
    setTempFilterProf(filterProf);
    setTempFilterServ(filterServ);
    setIsFilterModalOpen(true);
  };

  const handleSettingsClick = () => {
    if (!user) return;
    if (user.is_admin) {
      setShowSettingsPanel(true);
      return;
    }
    setConfigPassword('');
    setConfigError('');
    setIsConfigAuthOpen(true);
  };

  const handleConfigAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError('Autenticando...');
    const hashedInput = hashPassword(configPassword);
    
    // Qualquer usuÃ¡rio admin cadastrado para essa empresa serve para liberar a tranca!
    const { data: admins, error } = await supabase
      .from('usuarios')
      .select('senha')
      .eq('codigo_empresa', user.codigo_empresa)
      .eq('is_admin', true)
      .eq('ativo', true);

    if (error) {
      setConfigError('Erro ao consultar banco de dados.');
      return;
    }

    const isAdminValid = admins && admins.some(a => a.senha === hashedInput);
    
    if (isAdminValid || (user.is_admin && hashedInput === user.senha)) {
      // Ativar efeito Gooey!
      const particles = Array.from({ length: 120 }).map((_, _i) => {
        const side = Math.random() > 0.5 ? 1 : -1;
        const startX = (Math.random() - 0.5) * 1400;
        const startY = -1000 * side;
        const endX = 0; // Vai direto para o centro
        const endY = 0;
        return {
          id: Math.random(),
          startX,
          startY,
          endX,
          endY,
          time: 1200 + Math.random() * 800,
          color: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#1d4ed8', '#2563eb'][Math.floor(Math.random() * 5)]
        };
      });
      setGooeyParticles(particles);
      setIsGooeyActive(true);
      setConfigError('');

      // Ativar brilho do modal quando as partÃ­culas estÃ£o entrando
      setTimeout(() => setIsModalBorderActive(true), 400);

      setTimeout(() => {
        setIsConfigAuthOpen(false);
        setIsGooeyActive(false);
        setIsModalBorderActive(false);
        setGooeyParticles([]);
        setShowSettingsPanel(true);
      }, 2000);
    } else {
      toast('Acesso negado: Senha incorreta.', 'error');
      setConfigError('Senha incorreta! Contate um administrador.');
    }
  };

  const renderMiniCalendar = () => {
    const miniGridBlanks = Array.from({ length: getFirstDayOfMonth(currentDate) });
    const miniGridDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);

    return (
      <div className="mini-calendar" onClick={e => e.stopPropagation()}>
        <div className="mini-cal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ margin: 0 }}>{formatMonthYear(currentDate)}</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ cursor: 'pointer', padding: '0 4px' }} onClick={handlePrevMonth}>â®</span>
            <span style={{ cursor: 'pointer', padding: '0 4px' }} onClick={handleNextMonth}>â¯</span>
          </div>
        </div>

        <div className="mini-grid">
          {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="mini-day-header">{d}</span>)}
          {miniGridBlanks.map((_, i) => <span key={`blank-${i}`}></span>)}
          {miniGridDays.map((dNum) => {
            const thisRDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dNum);
            const isExactlyToday = thisRDate.toDateString() === new Date().toDateString();
            const isCurrentSelection = thisRDate.toDateString() === currentDate.toDateString();
            return (
              <span 
                key={dNum} 
                className={`mini-day ${isCurrentSelection ? 'active' : ''} ${isExactlyToday ? 'mini-today' : ''}`}
                onClick={() => { handleMiniCalClick(dNum); setShowDatePicker(false); }}
              >
                {dNum}
              </span>
            );
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
            <div className="show-on-mobile" style={{ fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--primary-color)' }} onClick={() => setIsMobileSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </div>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user?.empresas?.logo_url ? (
                <img src={user.empresas.logo_url} alt="Logo" style={{ borderRadius: '8px', objectFit: 'cover', width: '44px', height: '44px', border: '2px solid #0ea5e9' }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.25rem', border: '2px solid #0ea5e9' }}>
                  {user?.empresas?.nome_exibicao?.charAt(0) || 'I'}
                </div>
              )}
              <span className="hide-on-mobile" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{user?.empresas?.nome_exibicao || 'Sua Empresa'}</span>
            </div>
          </div>
          
          <div className="center" style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: 10 }}>
            {/* Nav Controls: Hoje + Arrows (â® â¯) + Month Year â–¼ */}
            <button className="btn-today" onClick={handleToday} style={{ margin: 0, padding: '8px 20px', fontSize: '1rem', borderRadius: '6px', fontWeight: 600 }}>Hoje</button>
            <div className="nav-arrows" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button className="icon-btn" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }} onClick={handlePrevRange}>â®</button>
              <button className="icon-btn" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }} onClick={handleNextRange}>â¯</button>
            </div>
            <h2 className="month" style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setShowDatePicker(!showDatePicker)}>
              {formatMonthYear(currentDate)} <span style={{fontSize: '0.6rem', opacity: 0.7}}>â–¼</span>
            </h2>

            {showDatePicker && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowDatePicker(false)} />
                <div className="floating-datepicker" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface-color)', padding: '16px', borderRadius: '8px', zIndex: 100, border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', marginTop: '8px' }}>
                  {renderMiniCalendar()}
                </div>
              </>
            )}
          </div>

          <div className="right">
            <button className="icon-btn" title="CatÃ¡logo de Cadastros" onClick={() => setShowServicesPanel(true)}><IFolder /></button>
            <button className="icon-btn" title="ConfiguraÃ§Ãµes (Requer Admin)" onClick={handleSettingsClick}><ISettings /></button>
            <button className="icon-btn profile-btn" onClick={() => setIsLogoutModalOpen(true)} title="Conta">
              {user ? <div className="avatar-letter">{user.nome.charAt(0)}</div> : <ILogout />}
            </button>
          </div>
        </header>

        <div className="dash-body">
          <aside className={`dash-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
             <div className="show-on-mobile" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', width: '100%' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Menu</span>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem' }} onClick={() => setIsMobileSidebarOpen(false)}>✕</button>
             </div>
            <button className="btn-create" onClick={() => { setIsMobileSidebarOpen(false); openGeneralModal(); }}>
              <IPlus /> Criar Agendamento
            </button>
            
            {renderMiniCalendar()}
            
            <div style={{ padding: '0 20px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button type="button" className="btn-sec" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', margin: 0 }} onClick={openFilterModal}>
                 Filtrar Grade {(filterProf || filterServ) && <span style={{ background: 'var(--primary-color)', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' }}>!</span>}
              </button>
              <button type="button" className="btn-sec" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', margin: 0 }} onClick={() => { setIsMobileSidebarOpen(false); setIsAgendamentosListOpen(true); }}>
                 Agendamentos do Dia
              </button>
            </div>
          </aside>

          <main className="dash-main" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            '--days-count': currentWeekDays.length, 
            '--zoom-factor': zoomFactor,
            '--current-col-width': `${currentColWidth}px`,
            '--total-grid-width': `${totalGridWidth}px`
          } as any}>
            {/* Ocultado a pedido do usuario: viewMode === 'month' */}
            {/*viewMode === 'month' ? (
              <div className="month-grid-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="cal-header-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
                   {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÃB'].map((d, i) => (
                     <div key={i} className="day-col-header" style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRight: '1px solid var(--border-color)' }}>
                       <span className="day-name">{d}</span>
                     </div>
                   ))}
                </div>
                <div className="month-grid-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${currentWeekDays.length / 7}, 1fr)` }}>
                   {currentWeekDays.map((dayObj: any, i: number) => {
                     const dayStr = dayObj.fullDate.toDateString();
                     const dayAgs = filteredAgendamentos.filter(ag => new Date(ag.data_hora_inicio).toDateString() === dayStr)
                       .sort((a,b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
                     
                     return (
                       <div key={i} className="month-cell" style={{ borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '4px', opacity: dayObj.isCurrentMonth ? 1 : 0.4, minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: dayObj.isToday ? 'rgba(14, 165, 233, 0.05)' : 'transparent', overflow: 'hidden', cursor: 'pointer' }} onClick={() => openSlotModal(dayObj.fullDate, 9)}>
                         <span style={{ fontSize: '0.85rem', fontWeight: dayObj.isToday ? 700 : 500, color: dayObj.isToday ? 'var(--primary-color)' : 'var(--text-muted)', textAlign: 'right', display: 'block', padding: '4px' }}>
                           {dayObj.dateNum}
                         </span>
                         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                           {dayAgs.slice(0, 4).map(ag => {
                             let colorBase = '#0ea5e9';
                             if (ag.status === 'em andamento') colorBase = '#f59e0b';
                             if (ag.status === 'finalizado') colorBase = '#10b981';
                             if (ag.status === 'cancelado') colorBase = '#ef4444';
                             const obsText = ag.observacao || '';
                             const nomeAvulsoVis = (ag.codigo_cliente === 0 && obsText.startsWith('👤 ')) ? obsText.split(' | ')[0].replace('👤 ', '') : null;
                             const displayClient = nomeAvulsoVis || dicClientes[ag.codigo_cliente] || 'Cliente';
                             const isPulse = ag.status === 'em andamento';

                             return (
                               <div key={ag.id} className={`event-card-month ${isPulse ? 'pulsing' : ''}`} style={{ backgroundColor: `${colorBase}15`, borderLeft: `3px solid ${colorBase}`, padding: '4px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', borderBottom: `1px solid ${colorBase}40` }} onClick={(e) => { e.stopPropagation(); openEditAgendamento(ag); }}>
                                 <strong style={{ color: colorBase }}>{new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</strong> {displayClient}
                               </div>
                             );
                           })}
                           {dayAgs.length > 4 && (
                              <div 
                                style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto', fontWeight: 600, padding: '4px', cursor: 'pointer', background: 'var(--input-bg)', borderRadius: '4px' }}
                                onClick={(e) => { e.stopPropagation(); setCurrentDate(dayObj.fullDate); setIsAgendamentosListOpen(true); }}
                              >
                                + {dayAgs.length - 4} itens
                              </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                </div>
            ) : (*/}
                {/* Header de Dias (Fixo no Topo) */}
                <div className="cal-header-row" ref={headerScrollRef}>
                  <div className="header-inner" style={{ width: `${totalGridWidth}px` }}>
                    <div style={{ width: '45px', flex: 'none', position: 'sticky', left: 0, zIndex: 100, backgroundColor: 'var(--surface-color)', borderRight: '1px solid var(--border-color)' }}></div>
                    <div id="grid-header-cells" className="grid-cells-container">
                      {currentWeekDays.map((day, i) => (
                        <div key={i} className="day-col-header">
                          <span style={{ fontWeight: 500 }}>{day.name}</span>
                          <span className={`day-number ${day.isToday ? 'active' : ''}`}>{day.dateNum}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div 
                  className="cal-grid-scroll" 
                  ref={gridScrollRef} 
                  onScroll={handleGridScroll}
                >
                  <div className="cal-grid" style={{ width: `${totalGridWidth}px` }}>
                    <div className="grid-bg" style={{ width: `${totalGridWidth}px` }}>
                      {hoursArray.map((hour, idx) => (
                        <div key={hour} className="grid-row">
                          <div className="time-label" style={idx === 0 ? { transform: 'translateY(4px)' } : {}}>{hour.toString().padStart(2, '0')}:00</div>
                          <div className="grid-cells-container">
                            {currentWeekDays.map((day, i) => {
                               const d = day.fullDate.getDay();
                               const dayCfg = configAgenda?.horarios?.find((h: any) => h.dia === d);
                               const hourStr = hour.toString().padStart(2, '0') + ':00';
                               const isFechado = !dayCfg || !dayCfg.aberto || hourStr < dayCfg.inicio || hourStr >= dayCfg.fim;
                               const isAlmoco = !isFechado && dayCfg?.almoco_ativo && hourStr >= dayCfg.almoco_inicio && hourStr < dayCfg.almoco_fim;
                               
                               return (
                                 <div 
                                   key={i} 
                                   className={`cal-cell ${isFechado ? 'cell-closed' : isAlmoco ? 'cell-lunch' : ''}`} 
                                   onClick={() => openSlotModal(day.fullDate, hour)}
                                   title={isFechado ? 'Fechado' : isAlmoco ? 'AlmoÃ§o' : `Agendar ${hourStr}`}
                                 >
                                   {isFechado && <span className="closed-label"><IVoid /></span>}
                                   {isAlmoco && <span className="lunch-label">â˜• AlmoÃ§o</span>}
                                 </div>
                               );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="events-layer">
                      {filteredAgendamentos.map(ag => {
                          const ini = new Date(ag.data_hora_inicio);
                          const fim = new Date(ag.data_hora_fim);
                          const dayStr = ini.toDateString();
                          const dIdx = currentWeekDays.findIndex(d => d.fullDate.toDateString() === dayStr);
                          if (dIdx === -1) return null;
                          
                          const startHour = ini.getHours() + ini.getMinutes() / 60;
                          const endHour = fim.getHours() + fim.getMinutes() / 60;
                          const topPixels = (startHour - earliest) > 0 ? (startHour - earliest) * 60 : 0;
                          const rawHeight = (endHour - startHour) * 60;
                          const clampHeight = rawHeight < 24 ? 24 : rawHeight;
                          
                          const { colIndex, numCols } = agStyles[ag.id] || { colIndex: 0, numCols: 1 };
                          const cardLeft = (dIdx * currentColWidth) + (colIndex * (currentColWidth / numCols)) + 2;
                          const cardWidth = (currentColWidth / numCols) - 4;
                          
                          let colorBase = '#0ea5e9';
                          if (ag.status === 'em andamento') colorBase = '#f59e0b';
                          if (ag.status === 'finalizado') colorBase = '#10b981';
                          if (ag.status === 'cancelado') colorBase = '#ef4444';

                          const isPulse = ag.status === 'em andamento';
                          const isSmall = clampHeight <= 35;
                          const obsText = ag.observacao || '';
                          const nomeAvulsoVis = (ag.codigo_cliente === 0 && obsText.startsWith('👤 ')) ? obsText.split(' | ')[0].replace('👤 ', '') : null;
                          const displayClient = nomeAvulsoVis || dicClientes[ag.codigo_cliente] || 'Cliente';
                          
                          const dAg = ini.getDay();
                          const dayCfgAg = configAgenda?.horarios?.find((h: any) => h.dia === dAg);
                          const agStartStr = ini.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                          const isAlmocoAg = dayCfgAg?.almoco_ativo && agStartStr >= dayCfgAg.almoco_inicio && agStartStr < dayCfgAg.almoco_fim;

                          return (
                            <div key={ag.id} className={`event-card ${isPulse ? 'pulsing' : ''}`} 
                                 style={{ position: 'absolute', zIndex: 10, top: topPixels + 'px', height: clampHeight + 'px', left: cardLeft + 'px', width: cardWidth + 'px', borderLeft: `3px solid ${colorBase}`, background: `${colorBase}15`, display: 'flex', flexDirection: isSmall ? 'row' : 'column', padding: isSmall ? '0 6px' : '4px 6px', borderRadius: '4px', cursor: 'pointer', overflow: 'hidden', alignItems: isSmall ? 'center' : 'flex-start', gap: isSmall ? '6px' : '2px' }}
                                 onClick={(e) => { e.stopPropagation(); openEditAgendamento(ag); }}>
                              
                              {isAlmocoAg && <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: 800, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>â˜• ALMOÃ‡O</span>}
                              
                              <strong style={{ fontSize: isSmall ? '0.7rem' : '0.75rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: colorBase }}>
                                {isSmall && `${ini.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} `}
                                {dicServicos[ag.codigo_servico] || 'Serviço'}
                              </strong>
                              <span style={{ fontSize: isSmall ? '0.65rem' : '0.7rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', opacity: 0.9 }}>
                                 {!isSmall && `${ini.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} - `} 
                                 {displayClient}
                              </span>
                              {!isSmall && clampHeight > 45 && <span style={{ fontSize: '0.65rem', opacity: 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{dicProfs[ag.codigo_profissional] || 'Equipe'}</span>}
                              {ag.status === 'cancelado' && <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', backgroundColor: '#ef4444', transform: 'translateY(-50%)' }}></div>}
                            </div>
                          );
                      })}
                    </div>
                  </div>
                </div>
              {/*)}*/}
            </main>
          </div>
        </div>


      {isMobileSidebarOpen && (
        <div className="modal-overlay show-on-mobile" style={{ zIndex: 9998 }} onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {showServicesPanel && (
        <ServicesPanel onClose={() => setShowServicesPanel(false)} user={user} />
      )}

      {/* Settings Central Modal */}
      {showSettingsPanel && (
        <SettingsPanel onClose={() => setShowSettingsPanel(false)} user={user} />
      )}

      {user && (
         <AppointmentModal 
            isOpen={isApptModalOpen}
            onClose={() => setIsApptModalOpen(false)}
            user={user}
            configAgenda={configAgenda}
            baseDate={apptBaseDate}
            baseHour={apptBaseHour}
            agendamentoItem={editingAppt}
            onSaveSuccess={reloadDashboardGrid}
         />
      )}

      {/* Modal de Logout */}
      {isLogoutModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '12px' }}>Sair da conta?</h3>
            <p style={{ margin: 0 }}>VocÃª estÃ¡ logado como: <strong>{user?.nome}</strong></p>
            <p style={{ marginTop: '4px' }}>Deseja relogar?</p>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-sec" onClick={() => setIsLogoutModalOpen(false)}>Cancelar</button>
              <button className="btn-pri" style={{ backgroundColor: '#ef4444', color: '#fff' }} onClick={onLogout}>Fazer Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Filtros Oculto */}
      {isFilterModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFilterModalOpen(false)}>
           <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%', padding: '32px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                 <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Filtros da Grade</h3>
                 <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setIsFilterModalOpen(false)}>✕</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                   <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Filtrar Profissional</label>
                   <select value={user && !user.is_admin ? user.codigo.toString() : tempFilterProf} onChange={e => setTempFilterProf(e.target.value)} disabled={user && !user.is_admin} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', outline: 'none', opacity: (user && !user.is_admin) ? 0.6 : 1 }}>
                     <option value="">Todos os Profissionais</option>
                     {Object.entries(dicProfs).map(([id, nome]) => (
                       <option key={id} value={id}>{nome as string}</option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Filtrar Serviço</label>
                   <select value={tempFilterServ} onChange={e => setTempFilterServ(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', outline: 'none' }}>
                     <option value="">Todos os Serviços</option>
                     {Object.entries(dicServicos).map(([id, nome]) => (
                       <option key={id} value={id}>{nome as string}</option>
                     ))}
                   </select>
                 </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                 <button type="button" className="btn-sec" style={{ flex: 1, margin: 0, height: '44px' }} onClick={() => { setFilterProf(''); setFilterServ(''); setIsFilterModalOpen(false); }}>Limpar Tudo</button>
                 <button type="button" className="btn-pri" style={{ flex: 1, margin: 0, background: 'var(--primary-color)', height: '44px' }} onClick={() => { setFilterProf(tempFilterProf); setFilterServ(tempFilterServ); setIsFilterModalOpen(false); }}>Salvar Filtro</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Lista do Dia (Cancelados VislumbrÃ¡veis) */}
      {isAgendamentosListOpen && (
        <div className="modal-overlay" onClick={() => setIsAgendamentosListOpen(false)} style={{ zIndex: 4000 }}>
           <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%', padding: '24px', overflowY: 'auto', maxHeight: '90dvh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="nav-arrows" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, -1))} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>❮</button>
                      <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>❯</button>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.1rem' }}>Agendamentos do Dia</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn-today hide-on-mobile" onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 12px', fontSize: '0.8rem', margin: 0 }}>Hoje</button>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }} onClick={() => setIsAgendamentosListOpen(false)}>✕</button>
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {(() => {
                    const dailyAgs = agendamentos.filter(ag => {
                        const agDate = new Date(ag.data_hora_inicio).toDateString();
                        return agDate === currentDate.toDateString() && (user.is_admin || String(ag.codigo_profissional) === String(user.codigo));
                     }).sort((a,b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());

                    if (dailyAgs.length === 0) {
                       return <div style={{ padding: '24px', textAlign: 'center', background: 'var(--input-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>Nenhum agendamento para este dia.</div>;
                    }

                    return dailyAgs.map(ag => {
                       const ini = new Date(ag.data_hora_inicio);
                       const fim = new Date(ag.data_hora_fim);
                       const isCancelled = ag.status === 'cancelado';
                       const obsText = ag.observacao || '';
                       const nomeAvulsoVis = (ag.codigo_cliente === 0 && obsText.startsWith('👤 ')) ? obsText.split(' | ')[0].replace('👤 ', '') : null;
                       const displayClient = nomeAvulsoVis || dicClientes[ag.codigo_cliente] || 'Cliente Avulso';

                       return (
                         <div key={ag.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', borderLeft: `3px solid ${isCancelled ? '#ef4444' : ag.status === 'finalizado' ? '#10b981' : ag.status === 'em andamento' ? '#f59e0b' : '#0ea5e9'}`, opacity: isCancelled ? 0.6 : 1 }}>
                            <div>
                               <strong style={{ fontSize: '1rem', color: isCancelled ? '#ef4444' : '#fff', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                  {ini.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} às {fim.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                               </strong>
                               <div style={{ fontSize: '0.9rem', marginTop: '4px', color: '#cbd5e1' }}>{dicServicos[ag.codigo_servico] || 'Serviço'} - {displayClient}</div>
                                <div style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   Profissional: {dicProfs[ag.codigo_profissional] || 'Equipe'} {isCancelled ? '(Cancelado)' : ''}
                                   {ag.isis_criou && (
                                     <span style={{ 
                                       color: '#0ea5e9', 
                                       whiteSpace: 'nowrap',
                                       fontWeight: 700, 
                                       fontSize: '0.7rem', 
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       gap: '4px',
                                       background: 'rgba(14, 165, 233, 0.1)',
                                       padding: '2px 6px',
                                       borderRadius: '4px'
                                     }}>
                                       âœ¨ Ãsis
                                     </span>
                                   )}
                                </div>
                            </div>
                            <button className="btn-sec" style={{ margin: 0, padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => { setIsAgendamentosListOpen(false); openEditAgendamento(ag); }}>Detalhes</button>
                         </div>
                       );
                    });
                 })()}
              </div>
           </div>
        </div>
      )}

      {/* Modal do Cofre Administrativo */}
      {isConfigAuthOpen && (
        <div className="modal-overlay" onClick={() => setIsConfigAuthOpen(false)} style={{ zIndex: 5000 }}>
          {isGooeyActive && (
            <div className="gooey-particles-container" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4999 }}>
              {gooeyParticles.map(p => (
                <span 
                  key={p.id} 
                  className="particle active" 
                  style={{ 
                    '--start-x': `${p.startX}px`, 
                    '--start-y': `${p.startY}px`, 
                    '--end-x': `${p.endX}px`, 
                    '--end-y': `${p.endY}px`, 
                    '--time': `${p.time}ms`,
                    'background-color': p.color
                  } as any}
                />
              ))}
            </div>
          )}

          <div 
            className={`modal-card ${isModalBorderActive ? 'border-blue-active' : ''}`} 
            onClick={e => e.stopPropagation()} 
            style={{ position: 'relative', transition: 'all 0.4s ease', zIndex: 5001 }}
          >
            <h3 style={{ display:'flex', alignItems:'center', gap:'8px' }}><ISettings /> Acesso Restrito</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Digite a senha de administrador da empresa para destrancar.
            </p>

            <form onSubmit={handleConfigAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group-flat">
                <input 
                  type="password" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={configPassword} 
                  onChange={e => setConfigPassword(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Sua senha..."
                  autoFocus
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '1.2rem', 
                    letterSpacing: '4px'
                  }}
                />
              </div>
              {configError && <p style={{ color: isGooeyActive ? '#10b981' : '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>{isGooeyActive ? 'Acesso Permitido!' : configError}</p>}
              <button type="submit" className="btn-save" style={{ width: '100%', marginTop: '24px' }}>
                {isGooeyActive ? 'ABRINDO...' : 'DESBLOQUEAR'}
              </button>
            </form>
          </div>
        </div>
      )}




      {/* NotificaÃ§Ãµes flutuantes da Ãsis */}
      <div className="isis-notifications-container">
        {isisNotifications.map(n => (
          <div key={n.id} className={`isis-notif-card ${n.exiting ? 'exiting' : ''}`} onClick={() => { setIsisNotifications(prev => prev.filter(x => x.id !== n.id)); openEditAgendamento(n); }}>
            <div className="isis-notif-avatar">
              <img src="/isisneutraperfil.png" alt="Ãsis" />
              <div className="notif-badge">âœ¨</div>
            </div>
            <div className="isis-notif-content">
              <div className="isis-notif-header">
                <strong>Novo Agendamento via Ãsis</strong>
                <button className="notif-close-btn" onClick={(e) => { e.stopPropagation(); setIsisNotifications(prev => prev.filter(x => x.id !== n.id)); }}>✕</button>
              </div>
              <p>ðŸ“ {dicServicos[n.codigo_servico] || 'Serviço'}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.8, color: '#94a3b8' }}>👤 {dicProfs[n.codigo_profissional] || 'Equipe'}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span className="notif-time">{new Date(n.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} â€¢ {new Date(n.data_hora_inicio).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div className="notif-progress-container">
              <div className="notif-progress-bar"></div>
            </div>
          </div>
        ))}
      </div>

      {/* SVG Filter para o efeito Gooey */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="gooey" />
          </filter>
        </defs>
      </svg>
    </>
  );
}

