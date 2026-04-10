import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { toast } from './Toast';

const IClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function AppointmentModal({ isOpen, onClose, user, configAgenda, baseDate, baseHour, agendamentoItem, onSaveSuccess, initialReadOnly = false }: any) {
  const [loading, setLoading] = useState(true);
  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);

  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    codigo_cliente: '',
    data: '',
    hora: '',
    status: 'agendado',
    observacao: ''
  });

  const [nomeAvulso, setNomeAvulso] = useState('');
  const [showQuickCli, setShowQuickCli] = useState(false);
  const [quickCli, setQuickCli] = useState({ nome: '', telefone: '' });
  const [selections, setSelections] = useState<{ serviceCode: string, professionalCode: string }[]>([{ serviceCode: '', professionalCode: '' }]);
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<any[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadDependencies();
  }, [isOpen]);

  useEffect(() => {
    if (agendamentoItem && isOpen && !loading) {
      const ini = new Date(agendamentoItem.data_hora_inicio);
      let extNome = '';
      let rawObs = agendamentoItem.observacao || '';
      if (agendamentoItem.codigo_cliente === 0 && rawObs.startsWith('👤 ')) {
        const parts = rawObs.split(' | ');
        extNome = parts[0].replace('👤 ', '');
        rawObs = parts.slice(1).join(' | ');
      }

      let rawServices = agendamentoItem.servicos_selecionados;
      if (typeof rawServices === 'string') {
        try { rawServices = JSON.parse(rawServices); } catch(e) { rawServices = null; }
      }
      
      let initialSelections = [{ serviceCode: '', professionalCode: '' }];
      
      if (agendamentoItem.profissionais_vinculo && Array.isArray(agendamentoItem.profissionais_vinculo) && agendamentoItem.profissionais_vinculo.length > 0) {
        initialSelections = agendamentoItem.profissionais_vinculo.map((v: any) => ({
          serviceCode: String(v.serviceCode),
          professionalCode: String(v.professionalCode)
        }));
      } else if (rawServices && Array.isArray(rawServices) && rawServices.length > 0) {
          initialSelections = rawServices.map((s: any) => ({
            serviceCode: String(s),
            professionalCode: String(agendamentoItem.codigo_profissional)
          }));
      } else if (agendamentoItem.codigo_servico) {
          initialSelections = [{
            serviceCode: String(agendamentoItem.codigo_servico),
            professionalCode: String(agendamentoItem.codigo_profissional)
          }];
      }

      setForm({
        ...agendamentoItem,
        observacao: rawObs,
        codigo_cliente: agendamentoItem.codigo_cliente === 0 ? 'avulso' : agendamentoItem.codigo_cliente,
        data: ini.toLocaleDateString('en-CA').split('T')[0],
        hora: ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      setNomeAvulso(extNome);
      setShowQuickCli(false);
      setConfirmCancel(false);
      setSelections(initialSelections);
      setIsReadOnly(initialReadOnly);
    } else if (!agendamentoItem && isOpen && !loading) {
      setForm({
        codigo_cliente: '',
        data: baseDate ? new Date(baseDate).toLocaleDateString('en-CA').split('T')[0] : new Date().toLocaleDateString('en-CA').split('T')[0],
        hora: baseHour !== null && baseHour !== undefined ? baseHour.toString().padStart(2, '0') + ':00' : '09:00',
        status: 'agendado',
        observacao: ''
      });
      setNomeAvulso('');
      setShowQuickCli(false);
      setConfirmCancel(false);
      setSelections([{ serviceCode: '', professionalCode: user && !user.is_admin ? String(user.codigo) : '' }]);
      setIsReadOnly(false); // Sempre editável em criação
    }
  }, [agendamentoItem, isOpen, loading, baseDate, baseHour]);

  useEffect(() => {
    const fetchAgendamentosDia = async () => {
      const involvedProfs = Array.from(new Set(selections.filter(s => s.professionalCode).map(s => String(s.professionalCode))));
      if (involvedProfs.length === 0 || !form.data) {
        setAgendamentosDoDia([]);
        return;
      }
      const paramData = form.data;
      const startOfDay = new Date(`${paramData}T00:00:00`).toISOString();
      const endOfDay = new Date(`${paramData}T23:59:59`).toISOString();

      // Busca agendamentos de QUALQUER um dos profissionais envolvidos para checar conflitos
      const orFilter = involvedProfs.map(p => `codigo_profissional.eq.${p},profissionais_vinculo.cs.[{"professionalCode":"${p}"}]`).join(',');

      const { data } = await supabase.from('agendamentos')
        .select('id, data_hora_inicio, data_hora_fim, status, profissionais_vinculo, codigo_profissional')
        .eq('codigo_empresa', user.codigo_empresa)
        .or(orFilter)
        .gte('data_hora_inicio', startOfDay)
        .lte('data_hora_inicio', endOfDay);

      setAgendamentosDoDia(data || []);
    };
    fetchAgendamentosDia();
  }, [JSON.stringify(selections.map(s => s.professionalCode)), form.data, user?.codigo_empresa]);

  const getWorkingRange = () => {
    let earliest = 9;
    let latest = 18;
    if (configAgenda?.horarios) {
      const openDays = configAgenda.horarios.filter((h: any) => h.aberto);
      if (openDays.length > 0) {
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
    return { earliest, latest };
  };

  const getHorariosGerados = () => {
    if (!form.data) return [];
    const { earliest, latest } = getWorkingRange();
    const slots = [];
    for (let h = earliest; h < latest; h++) {
      for (let min of [0, 15, 30, 45]) {
        slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  const isSlotDisponivel = (slotTime: string) => {
    const validSelections = selections.filter(s => s.serviceCode !== '' && s.professionalCode !== '');
    if (validSelections.length === 0) return true;

    const slotStart = new Date(`${form.data}T${slotTime}:00`);
    let currentOffset = 0;

    // Helper: Converte "HH:mm" para minutos totais desde 00:00
    const tToMin = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    // Obter configuração do dia da semana (0-6)
    const dayOfWeek = slotStart.getDay();
    const dayCfg = configAgenda?.horarios?.find((h: any) => h.dia === dayOfWeek);

    for (const sel of validSelections) {
      const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
      const duracao = s ? s.duracao_minutos : 0;
      
      const selStart = new Date(slotStart.getTime() + currentOffset * 60000);
      const selEnd = new Date(selStart.getTime() + duracao * 60000);

      // --- VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO (Apenas se não for Admin) ---
      if (!user?.is_admin && dayCfg) {
          const sMin = selStart.getHours() * 60 + selStart.getMinutes();
          const eMin = selEnd.getHours() * 60 + selEnd.getMinutes();
          
          const cfgIni = tToMin(dayCfg.inicio);
          const cfgFim = tToMin(dayCfg.fim);

          // 1. Fora do horário de abertura/fecho
          if (!dayCfg.aberto || sMin < cfgIni || eMin > cfgFim) return false;

          // 2. Sobreposição com almoço
          if (dayCfg.almoco_ativo) {
              const almIni = tToMin(dayCfg.almoco_inicio);
              const almFim = tToMin(dayCfg.almoco_fim);
              // Há sobreposição se o serviço começa antes do fim do almoço E termina depois do início do almoço
              if (sMin < almFim && eMin > almIni) return false;
          }
      }
      
      // --- VALIDAÇÃO DE CONFLITOS COM OUTROS AGENDAMENTOS ---
      for (const ag of agendamentosDoDia) {
        if (agendamentoItem && String(ag.id) === String(agendamentoItem.id)) continue;
        if (ag.status === 'cancelado') continue;

        const profsNoAg = [String(ag.codigo_profissional)];
        if (ag.profissionais_vinculo && Array.isArray(ag.profissionais_vinculo)) {
          ag.profissionais_vinculo.forEach((v: any) => profsNoAg.push(String(v.professionalCode)));
        }

        const isSameProf = profsNoAg.includes(String(sel.professionalCode));
        if (!isSameProf) continue;

        const agStart = new Date(ag.data_hora_inicio);
        const agEnd = new Date(ag.data_hora_fim);
        
        if (selStart < agEnd && selEnd > agStart) return false;
      }

      currentOffset += duracao;
    }

    return true;
  };

  const loadDependencies = async () => {
    setLoading(true);
    const { data: c } = await supabase.from('clientes').select('id, nome, codigo').eq('codigo_empresa', user.codigo_empresa).eq('ativo', true).order('nome', { ascending: true });
    const { data: s } = await supabase.from('servicos').select('codigo, nome, duracao_minutos, profissionais_habilitados, valor').eq('codigo_empresa', user.codigo_empresa).eq('ativo', true).order('nome', { ascending: true });
    const { data: p } = await supabase.from('usuarios').select('codigo, nome').eq('codigo_empresa', user.codigo_empresa).eq('ativo', true).order('nome', { ascending: true });

    if (c) setClientes(c);
    if (s) setServicos(s);
    if (p) setProfissionais(p);
    setLoading(false);
  };

  const handleQuickSaveCli = async () => {
    if (!quickCli.nome) return toast('Digite o nome do cliente', 'error');
    const { data: allCli } = await supabase.from('clientes').select('codigo').eq('codigo_empresa', user.codigo_empresa);
    const nextCod = allCli && allCli.length > 0 ? Math.max(...allCli.map((x: any) => x.codigo)) + 1 : 1;

    const { data, error } = await supabase.from('clientes').insert({
      codigo: nextCod, codigo_empresa: user.codigo_empresa,
      nome: quickCli.nome, telefone: quickCli.telefone || null, ativo: true
    }).select().single();

    if (error) {
      toast('Erro ao cadastrar cliente rápido.', 'error');
    } else {
      toast('Cliente adicionado e Selecionado!', 'success');
      setClientes([...clientes, data]);
      setForm({ ...form, codigo_cliente: data.id });
      setShowQuickCli(false);
      setQuickCli({ nome: '', telefone: '' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSelections = selections.filter(s => s.serviceCode !== '' && s.professionalCode !== '');
    if (!form.codigo_cliente || validSelections.length === 0 || !form.data || !form.hora) {
      toast('Preencha as informações principais (Cliente, Serviço e Profissional).', 'error');
      return;
    }

    let finalClienteId = form.codigo_cliente;
    let finalObs = form.observacao || '';

    if (finalClienteId === 'avulso') {
      if (!nomeAvulso) return toast('Digite o nome do cliente sem cadastro!', 'error');
      finalClienteId = 0; 
      finalObs = `👤 ${nomeAvulso} | ${finalObs}`;
    }

    const startObj = new Date(`${form.data}T${form.hora}:00`);
    
    // Validação final de horário (Almoço, Fecho, Conflitos)
    if (!isSlotDisponivel(form.hora)) {
      toast('Este horário não está disponível (Almoço, Fechado ou Conflito).', 'error');
      return;
    }

    const totalPrice = validSelections.reduce((acc: number, sel) => {
      const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
      return acc + (s ? Number(s.valor || 0) : 0);
    }, 0);

    const totalDuration = validSelections.reduce((acc: number, sel) => {
      const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
      return acc + (s ? s.duracao_minutos : 0);
    }, 0);
    const endObj = new Date(startObj.getTime() + totalDuration * 60000);

    try {
      const involvedProfs = Array.from(new Set(validSelections.map(s => s.professionalCode)));
      for (const pCode of involvedProfs) {
        const { data: conflitos } = await supabase.from('agendamentos')
          .select('id, profissionais_vinculo')
          .eq('codigo_empresa', user.codigo_empresa)
          .neq('status', 'cancelado')
          .or(`codigo_profissional.eq.${pCode},profissionais_vinculo.cs.[{"professionalCode":"${pCode}"}]`)
          .lt('data_hora_inicio', endObj.toISOString())
          .gt('data_hora_fim', startObj.toISOString());

        const isConflict = conflitos && conflitos.some((c: any) => !agendamentoItem || c.id !== agendamentoItem.id);
        if (isConflict) {
          const profName = profissionais.find(p => String(p.codigo) === String(pCode))?.nome || 'Um profissional';
          toast(`⛔ Conflito! ${profName} está ocupado nesse intervalo.`, 'error');
          return;
        }
      }

      const payload = {
        codigo_empresa: user.codigo_empresa,
        codigo_cliente: finalClienteId,
        codigo_profissional: validSelections[0].professionalCode,
        codigo_servico: validSelections[0].serviceCode,
        servicos_selecionados: JSON.stringify(validSelections.map(s => s.serviceCode)),
        profissionais_vinculo: validSelections,
        data_hora_inicio: startObj.toISOString(),
        data_hora_fim: endObj.toISOString(),
        status: form.status,
        observacao: finalObs,
        valor_total: totalPrice,
        isis_criou: false
      };

      if (!agendamentoItem) {
        const { data: allAgend } = await supabase.from('agendamentos').select('codigo', { count: 'exact', head: false }).eq('codigo_empresa', user.codigo_empresa);
        const nextCod = allAgend && allAgend.length > 0 ? Math.max(...allAgend.map((x: any) => x.codigo)) + 1 : 1;
        const { error } = await supabase.from('agendamentos').insert({ codigo: nextCod, ...payload });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agendamentos').update(payload).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
        if (error) throw error;
      }

      toast(agendamentoItem ? 'Agendamento atualizado!' : 'Agendamento confirmado!', 'success');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  const handleCancelAppt = async () => {
    const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
    if (error) toast('Erro ao cancelar', 'error');
    else { toast('Agendamento cancelado!', 'success'); onSaveSuccess(); onClose(); }
  };

  const handleCancelApptAction = async () => {
    const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
    if (error) {
      toast('Erro ao cancelar agendamento.', 'error');
    } else {
      toast('Agendamento cancelado com sucesso!', 'success');
      onSaveSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
      .resp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @keyframes modalFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .appointment-view-mode {
        animation: modalFadeIn 0.3s ease-out forwards;
      }
      @media (max-width: 768px) { .resp-grid { grid-template-columns: 1fr; } }
    `}</style>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95dvw', maxHeight: '90dvh', padding: '16px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', maxWidth: '100%' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{agendamentoItem ? `Agendamento #${agendamentoItem.codigo}` : 'Novo Agendamento na Grade'}</h3>
              {agendamentoItem && (() => {
                const totalVal = selections.reduce((acc, sel) => {
                  const svc = servicos.find(s => String(s.codigo) === String(sel.serviceCode));
                  return acc + (svc?.valor ? Number(svc.valor) : 0);
                }, 0);
                const val = totalVal > 0 ? totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
                const stColor = form.status === 'cancelado' ? '#ef4444' : form.status === 'finalizado' ? '#10b981' : form.status === 'em andamento' ? '#f59e0b' : '#0ea5e9';
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Das {new Date(agendamentoItem.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às {new Date(agendamentoItem.data_hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', backgroundColor: `${stColor}20`, color: stColor, textTransform: 'uppercase' }}>
                        {form.status}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                        {val}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <button className="settings-close-btn" onClick={onClose}><IClose /></button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Mapeando dados da clínica...</p>
          ) : isReadOnly ? (
            <div className="appointment-view-mode" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header: Cliente e Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Cliente</p>
                  <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff', fontWeight: 700 }}>
                    {form.codigo_cliente === 'avulso' ? (nomeAvulso || 'Cliente Sem Cadastro') : (clientes.find(c => String(c.id) === String(form.codigo_cliente))?.nome || 'Carregando...')}
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    background: form.status === 'finalizado' ? '#10b98120' : form.status === 'em andamento' ? '#f59e0b20' : form.status === 'cancelado' ? '#ef444420' : '#0ea5e920',
                    color: form.status === 'finalizado' ? '#10b981' : form.status === 'em andamento' ? '#f59e0b' : form.status === 'cancelado' ? '#ef4444' : '#0ea5e9',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: `1px solid ${form.status === 'finalizado' ? '#10b98140' : form.status === 'em andamento' ? '#f59e0b40' : form.status === 'cancelado' ? '#ef444440' : '#0ea5e940'}`
                  }}>
                    {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                  </div>
                </div>
              </div>

              {/* Data e Hora */}
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ background: 'var(--primary-color)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                    {new Date(form.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Horário de início: <strong>{form.hora}h</strong></p>
                </div>
              </div>

              {/* Lista de Serviços */}
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Serviços Selecionados</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selections.map((sel: any, idx: number) => {
                    const servName = servicos.find(s => String(s.codigo) === String(sel.serviceCode))?.nome || 'Serviço não encontrado';
                    const profName = profissionais.find(u => String(u.codigo) === String(sel.professionalCode))?.nome || 'Profissional não definido';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{servName}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Executado por: {profName}</span>
                        </div>
                        <div style={{ color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 600 }}>OK</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              {form.observacao && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Observações</p>
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px dotted var(--border-color)', color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {form.observacao}
                  </div>
                </div>
              )}

              {/* Registro de Criação */}
              {agendamentoItem?.created_at && (
                <div style={{ marginTop: 'auto', padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Agendamento registrado em: <strong style={{ color: '#cbd5e1' }}>{new Date(agendamentoItem.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                </div>
              )}

              {/* Ações do Modo de Visualização */}

              {/* Ações do Modo de Visualização */}
              <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <button type="button" onClick={() => setIsReadOnly(false)} className="btn-save" style={{ margin: 0, flex: '1 1 100%', height: '54px', fontSize: '1.1rem', background: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', border: 'none', borderRadius: '8px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Editar Agendamento
                </button>
                <button type="button" onClick={onClose} className="btn-save" style={{ margin: 0, flex: '1 1 100%', background: 'transparent', border: '1px solid var(--border-color)', height: '48px', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>Fechar</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="form-grid full" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', boxSizing: 'border-box', pointerEvents: 'auto', opacity: 1 }}>
              <div className="resp-grid" style={{ maxWidth: '100%' }}>
                <div className="form-group-flat full" style={{ gridColumn: '1 / -1', maxWidth: '100%' }}>
                  <label>Cliente (Base)</label>
                  <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <select value={form.codigo_cliente} onChange={e => { setForm({ ...form, codigo_cliente: e.target.value }); setShowQuickCli(false); }} required disabled={isReadOnly} style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', textOverflow: 'ellipsis' }}>
                      <option value="">-- Selecionar Cliente --</option>
                      <option value="avulso">Cliente Sem Cadastro</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <button type="button" onClick={() => { setShowQuickCli(!showQuickCli); setForm({ ...form, codigo_cliente: '' }); }} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }} title="Cadastrar Novo Cliente Rápidamente">+</button>
                  </div>
                  {form.codigo_cliente === 'avulso' && (
                    <div style={{ marginTop: '12px', maxWidth: '100%' }}>
                      <input type="text" placeholder="Nome do Cliente" value={nomeAvulso} onChange={e => setNomeAvulso(e.target.value)} required style={{ width: '100%', maxWidth: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed var(--border-color)', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {showQuickCli && (
                    <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', maxWidth: '100%', boxSizing: 'border-box' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary-color)' }}>Novo Cadastro Rápido</strong>
                      <input type="text" placeholder="Nome Completo *" value={quickCli.nome} onChange={e => setQuickCli({ ...quickCli, nome: e.target.value })} style={{ width: '100%', maxWidth: '100%', padding: '10px', borderRadius: '6px', background: '#00000030', color: '#fff', border: 'none', outline: 'none', boxSizing: 'border-box' }} />
                      <input type="text" placeholder="Telefone ou WhatsApp" value={quickCli.telefone} onChange={e => setQuickCli({ ...quickCli, telefone: e.target.value })} style={{ width: '100%', maxWidth: '100%', padding: '10px', borderRadius: '6px', background: '#00000030', color: '#fff', border: 'none', outline: 'none', boxSizing: 'border-box' }} />
                      <button type="button" onClick={handleQuickSaveCli} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cadastrar</button>
                      <button type="button" onClick={() => setShowQuickCli(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>x</button>
                    </div>
                  )}
                </div>

                <div className="form-group-flat full" style={{ maxWidth: '100%' }}>
                  <label>Procedimentos (Serviço + Profissional)</label>
                  {selections.map((sel, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: '8px', marginBottom: '12px', alignItems: 'start', width: '100%', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <select value={sel.serviceCode} onChange={e => {
                        const val = e.target.value;
                        const newSelections = [...selections];
                        newSelections[index].serviceCode = val;
                        if (index > 0 && !newSelections[index].professionalCode && selections[0].professionalCode) {
                          const s = servicos.find(sv => String(sv.codigo) === String(val));
                          if (s && (s.profissionais_habilitados || []).includes(Number(selections[0].professionalCode))) {
                            newSelections[index].professionalCode = selections[0].professionalCode;
                          }
                        }
                        setSelections(newSelections);
                      }} required={index === 0} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none' }}>
                        <option value="">-- Serviço --</option>
                        {servicos.map(s => <option key={s.codigo} value={s.codigo}>{s.nome}</option>)}
                      </select>

                      <select value={sel.professionalCode} onChange={e => {
                        const newSelections = [...selections];
                        newSelections[index].professionalCode = e.target.value;
                        setSelections(newSelections);
                      }} disabled={!sel.serviceCode} required={index === 0} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none', opacity: sel.serviceCode ? 1 : 0.5 }}>
                        <option value="">{sel.serviceCode ? '-- Profissional --' : 'Escolha o Serviço'}</option>
                        {profissionais.map(p => {
                          const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
                          const isHabilitado = s ? (s.profissionais_habilitados || []).includes(p.codigo) : true;
                          if (!isHabilitado && sel.serviceCode) return null;
                          if (user && !user.is_admin && p.codigo !== user.codigo) return null;
                          return <option key={p.codigo} value={p.codigo}>{p.nome}</option>;
                        })}
                      </select>

                      {index === selections.length - 1 ? (
                        <button type="button" onClick={() => setSelections([...selections, { serviceCode: '', professionalCode: '' }])} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', width: '38px', height: '38px', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                      ) : (
                        <button type="button" onClick={() => {
                          const newSelections = [...selections];
                          newSelections.splice(index, 1);
                          setSelections(newSelections);
                        }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', width: '38px', height: '38px', fontSize: '1rem', cursor: 'pointer' }}>x</button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="form-group-flat full">
                  <label>Data Escolhida</label>
                  <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div className="form-group-flat full">
                  <label>Hora de Chegada (Início)</label>
                  <select value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} disabled={selections.every(s => !s.professionalCode) || !form.data || selections.every(s => !s.serviceCode)} required style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                    <option value="">{(selections.every(s => !s.professionalCode) || selections.every(s => !s.serviceCode)) ? 'Selecione Profissional e Serviço' : '-- Escolha o Horário --'}</option>
                    {selections.some(s => s.professionalCode) && selections.some(s => s.serviceCode) && form.data && getHorariosGerados().map(slot => {
                      const isAval = isSlotDisponivel(slot);
                      
                      // Lógica idêntica ao isSlotDisponivel para detectar especificamente o almoço para estilo visual
                      const tToMin = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
                      const dayOfWeek = new Date(`${form.data}T00:00:00`).getDay();
                      const dayCfg = configAgenda?.horarios?.find((h: any) => h.dia === dayOfWeek);
                      const sMin = tToMin(slot);
                      const isAlmoco = dayCfg?.almoco_ativo && sMin >= tToMin(dayCfg.almoco_inicio) && sMin < tToMin(dayCfg.almoco_fim);
                      
                      return (
                        <option 
                          key={slot} 
                          value={slot} 
                          disabled={!isAval}
                          style={
                            isAlmoco 
                              ? { backgroundColor: '#f59e0b40', color: '#64748b' } 
                              : (!isAval ? { backgroundColor: '#ef444440', color: '#64748b' } : {})
                          }
                        >
                          {slot} {isAlmoco ? ' (Almoço)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selections.some(s => s.serviceCode) && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>Total do Procedimento:</span>
                    <span style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
                      {selections.reduce((acc, sel) => {
                        const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
                        return acc + (s ? Number(s.valor || 0) : 0);
                      }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}

                {agendamentoItem?.created_at && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      🕒 Registrado no sistema em: <span style={{ color: '#fff' }}>{new Date(agendamentoItem.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group-flat full">
                <label>Observação Interna</label>
                <textarea value={form.observacao || ''} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="adiciona uma observação" rows={2} style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', resize: 'vertical', outline: 'none' }} />
              </div>

                <div className="form-group-flat full">
                  <label>Status do Agendamento</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
                    <option value="agendado">Agendado</option>
                    <option value="em andamento">Em Andamento</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

               <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', pointerEvents: 'auto' }}>
                <button type="submit" className="btn-save" style={{ margin: 0, flex: '1 1 calc(50% - 6px)', height: '48px', fontSize: '1rem' }}>{agendamentoItem ? 'Salvar alterações' : 'Confirmar Novo Agendamento'}</button>
                {agendamentoItem && (
                  <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} className="btn-save" style={{ margin: 0, flex: '1 1 calc(50% - 6px)', background: '#ef4444', height: '48px', color: '#fff', border: 'none' }}>Cancelar Agendamento</button>
                )}
                <button type="button" onClick={onClose} className="btn-save" style={{ margin: 0, flex: '1 1 100%', background: 'transparent', border: '1px solid var(--border-color)', height: '48px', color: '#fff' }}>Cancelar</button>
              </div>
            </form>
          )}
        </div>

        {confirmCancel && (
          <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.85)' }} onClick={() => setConfirmCancel(false)}>
            <div className="modal-card" style={{ maxWidth: '400px', width: '90%', padding: '32px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#ef4444', margin: '0 0 12px 0' }}>Desmarcar Horário?</h3>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setConfirmCancel(false)} className="btn-save" style={{ margin: 0, flex: '1 1 140px', background: 'transparent', color: '#fff', border: '1px solid var(--border-color)', minWidth: '0' }}>Voltar</button>
                <button type="button" onClick={handleCancelAppt} className="btn-save" style={{ margin: 0, flex: '1 1 140px', background: '#ef4444', color: '#fff', border: 'none', minWidth: '0' }}>Sim, Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {isDeleteConfirmOpen && (
          <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.85)' }} onClick={() => setIsDeleteConfirmOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '400px', width: '90%', padding: '32px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#ef4444', margin: '0 0 12px 0' }}>Cancelar Agendamento?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>O agendamento continuará registrado no sistema, porém o horário será liberado na agenda.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="btn-save" style={{ margin: 0, flex: '1 1 140px', background: 'transparent', color: '#fff', border: '1px solid var(--border-color)', minWidth: '0' }}>Voltar</button>
                <button type="button" onClick={handleCancelApptAction} className="btn-save" style={{ margin: 0, flex: '1 1 140px', background: '#ef4444', color: '#fff', border: 'none', minWidth: '0' }}>Sim, Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
