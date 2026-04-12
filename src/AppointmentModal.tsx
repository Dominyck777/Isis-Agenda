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
  const [selections, setSelections] = useState<{ serviceCode: string, professionalCode: string, timeSlot: string, availableSlots: string[], loadingSlots: boolean }[]>([{ serviceCode: '', professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false }]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
        try { rawServices = JSON.parse(rawServices); } catch (e) { rawServices = null; }
      }

      let initialSelections = [{ serviceCode: '', professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false }];

      if (agendamentoItem.profissionais_vinculo && Array.isArray(agendamentoItem.profissionais_vinculo) && agendamentoItem.profissionais_vinculo.length > 0) {
        initialSelections = agendamentoItem.profissionais_vinculo.map((v: any) => ({
          serviceCode: String(v.serviceCode),
          professionalCode: String(v.professionalCode),
          timeSlot: v.timeSlot || ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          availableSlots: [],
          loadingSlots: false
        }));
      } else if (rawServices && Array.isArray(rawServices) && rawServices.length > 0) {
        initialSelections = rawServices.map((s: any) => ({
          serviceCode: String(s),
          professionalCode: String(agendamentoItem.codigo_professional),
          timeSlot: ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          availableSlots: [],
          loadingSlots: false
        }));
      } else if (agendamentoItem.codigo_servico) {
        initialSelections = [{
          serviceCode: String(agendamentoItem.codigo_servico),
          professionalCode: String(agendamentoItem.codigo_profissional),
          timeSlot: ini.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          availableSlots: [],
          loadingSlots: false
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
      let initialTime = '09:00';
      if (baseHour !== null && baseHour !== undefined) {
        initialTime = baseHour.toString().padStart(2, '0') + ':00';
      }

      setSelections([{
        serviceCode: '',
        professionalCode: user && !user.is_admin ? String(user.codigo) : '',
        timeSlot: initialTime,
        availableSlots: [],
        loadingSlots: false
      }]);
      setIsReadOnly(false); // Sempre editável em criação
    }
  }, [agendamentoItem, isOpen, loading, baseDate, baseHour]);


  // --- LÓGICA DE GERAÇÃO DE SLOTS (Vindo do Ísis Chat) ---
  const generateAvailableSlots = async (date: string, serviceCode: string, professionalCode: string, suggestedStart?: string): Promise<string[]> => {
    const service = servicos.find((s: any) => String(s.codigo) === String(serviceCode));
    if (!service) return [];

    const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const minToTime = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${(n % 60).toString().padStart(2, '0')}`;

    const [y, mo, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, mo - 1, d, 12).getDay();
    const dayCfg = (configAgenda?.horarios || []).find((h: any) => h.dia === dayOfWeek);
    if (!dayCfg || !dayCfg.aberto) return [];

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data: appts } = await supabase.from('agendamentos')
      .select('id, data_hora_inicio, data_hora_fim, status')
      .eq('codigo_empresa', user.codigo_empresa)
      .eq('codigo_profissional', professionalCode)
      .neq('status', 'cancelado')
      .gte('data_hora_inicio', startOfDay)
      .lte('data_hora_inicio', endOfDay);

    const now = new Date();
    const duracaoSvc = service.duracao_minutos || 30;
    const hasLunch = dayCfg.almoco_ativo;
    const lunchStart = hasLunch ? timeToMin(dayCfg.almoco_inicio) : 0;
    const lunchEnd = hasLunch ? timeToMin(dayCfg.almoco_fim) : 0;
    let cur = timeToMin(dayCfg.inicio || '07:00');
    const end = timeToMin(dayCfg.fim || '22:00');
    const slots: string[] = [];

    const minSuggested = suggestedStart ? timeToMin(suggestedStart) : 0;

    while (cur + duracaoSvc <= end) {
      if (cur < minSuggested) { cur += 15; continue; }
      const tStr = minToTime(cur);
      const slotStart = new Date(`${date}T${tStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + duracaoSvc * 60000);

      if (hasLunch && cur < lunchEnd && cur + duracaoSvc > lunchStart) { cur = lunchEnd; continue; }

      // Se for hoje, não mostrar horários passados (com margem de 10 min)
      const isToday = new Date().toLocaleDateString('en-CA') === date;
      if (isToday && slotStart.getTime() < now.getTime() - 600000) { cur += 15; continue; }

      const conflict = (appts || []).some(ag => {
        if (agendamentoItem && String(ag.id) === String(agendamentoItem.id)) return false;
        const as = new Date(ag.data_hora_inicio), ae = new Date(ag.data_hora_fim);
        return slotStart < ae && slotEnd > as;
      });

      if (!conflict) slots.push(tStr);
      cur += 15;
    }
    return slots;
  };

  const triggerLoadSlots = async (index: number, svcCode: string, profCode: string, date: string, currentSelections: any[]) => {
    if (!svcCode || !profCode || !date) return;

    setSelections(prev => prev.map((s, i) => i === index ? { ...s, loadingSlots: true } : s));

    let suggested: string | undefined = undefined;
    if (index > 0) {
      const prev = currentSelections[index - 1];
      if (prev.timeSlot && prev.serviceCode) {
        const prevSvc = servicos.find(s => String(s.codigo) === String(prev.serviceCode));
        const dur = prevSvc ? (prevSvc.duracao_minutos || 0) : 0;
        const [h, m] = prev.timeSlot.split(':').map(Number);
        const totalMin = h * 60 + m + dur;
        suggested = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
      }
    }

    const slots = await generateAvailableSlots(date, svcCode, profCode, suggested);

    setSelections(prev => prev.map((s, i) => {
      if (i === index) {
        let bestSlot = s.timeSlot;
        // Se mudou o serviço/profissional e o slot atual não está na lista nova, ou se não tem slot
        if (!bestSlot || !slots.includes(bestSlot)) {
          bestSlot = slots.length > 0 ? (suggested && slots.includes(suggested) ? suggested : slots[0]) : '';
        }
        return { ...s, availableSlots: slots, loadingSlots: false, timeSlot: bestSlot };
      }
      return s;
    }));
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
    const validSelections = selections.filter(s => s.serviceCode !== '' && s.professionalCode !== '' && s.timeSlot !== '');
    if (!form.codigo_cliente || validSelections.length === 0 || !form.data) {
      toast('Preencha as informações principais (Cliente, Procedimentos e Data).', 'error');
      return;
    }

    let finalClienteId = form.codigo_cliente;
    let finalObs = form.observacao || '';

    if (finalClienteId === 'avulso') {
      if (!nomeAvulso) return toast('Digite o nome do cliente sem cadastro!', 'error');
      finalClienteId = 0;
      finalObs = `👤 ${nomeAvulso} | ${finalObs}`;
    }

    try {
      // Gerar a lista de payloads para inserção (Fragmentação) baseado em cada TimeSlot
      const payloads: any[] = [];

      for (const sel of selections) {
        if (!sel.serviceCode || !sel.professionalCode || !sel.timeSlot) continue;

        const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
        const duracao = s ? s.duracao_minutos : 15;
        const valor = s ? Number(s.valor || 0) : 0;

        const currentStart = new Date(`${form.data}T${sel.timeSlot}:00`);
        const currentEnd = new Date(currentStart.getTime() + duracao * 60000);

        // Verificação rápida de conflito (apenas garantia extra, já validado pela geração de slots)
        const { data: conflitos } = await supabase.from('agendamentos')
          .select('id')
          .eq('codigo_empresa', user.codigo_empresa)
          .neq('status', 'cancelado')
          .or(`codigo_profissional.eq.${sel.professionalCode},profissionais_vinculo.cs.[{"professionalCode":"${sel.professionalCode}"}]`)
          .lt('data_hora_inicio', currentEnd.toISOString())
          .gt('data_hora_fim', currentStart.toISOString());

        const isConflict = conflitos && conflitos.some((c: any) => !agendamentoItem || c.id !== agendamentoItem.id);
        if (isConflict) {
          const profName = profissionais.find(p => String(p.codigo) === String(sel.professionalCode))?.nome || 'Um profissional';
          const servName = s?.nome || 'Serviço';
          toast(`⛔ Conflito no serviço "${servName}"! ${profName} está ocupado nesse intervalo.`, 'error');
          return;
        }

        payloads.push({
          codigo_empresa: user.codigo_empresa,
          codigo_cliente: finalClienteId,
          codigo_profissional: sel.professionalCode,
          codigo_servico: sel.serviceCode,
          servicos_selecionados: JSON.stringify([sel.serviceCode]),
          profissionais_vinculo: [sel],
          data_hora_inicio: currentStart.toISOString(),
          data_hora_fim: currentEnd.toISOString(),
          status: form.status,
          observacao: finalObs,
          valor_total: valor,
          isis_criou: false
        });
      }

      if (!agendamentoItem) {
        const { data: allAgend } = await supabase.from('agendamentos').select('codigo').eq('codigo_empresa', user.codigo_empresa);
        let nextCod = allAgend && allAgend.length > 0 ? Math.max(...allAgend.map((x: any) => x.codigo)) + 1 : 1;

        const finalPayloads = payloads.map(p => ({ ...p, codigo: nextCod++ }));
        const { error } = await supabase.from('agendamentos').insert(finalPayloads);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agendamentos').update(payloads[0]).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
        if (error) throw error;
      }

      toast(agendamentoItem ? 'Agendamento atualizado!' : 'Agendamentos confirmados!', 'success');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast('Erro ao salvar: ' + err.message, 'error');
    }
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

  const totalProcedimento = selections.reduce((acc, sel) => {
    const s = servicos.find(sv => String(sv.codigo) === String(sel.serviceCode));
    return acc + (s ? Number(s.valor || 0) : 0);
  }, 0);

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
        
        .modal-card::-webkit-scrollbar { width: 6px; }
        .modal-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        .isis-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(168, 85, 247, 0.05);
          border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 3px 10px 3px 4px;
          border-radius: 20px;
          flex-shrink: 0;
          height: fit-content;
        }
        .isis-badge img {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(168, 85, 247, 0.4);
        }
        .isis-badge span {
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @media (max-width: 600px) {
          .modal-header-flex { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
          .procedures-grid { grid-template-columns: 1fr !important; }
          .procedure-row { position: relative; padding-right: 48px !important; }
          .procedure-add-btn { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }
          .total-badge-mobile { width: 100%; justify-content: space-between; }
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95dvw', maxHeight: '90dvh', padding: '24px', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', background: '#111827', borderRadius: '16px' }}>

          <div className="modal-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.25rem', fontWeight: 700 }}>
                {agendamentoItem ? `Agendamento #${agendamentoItem.codigo}` : 'Novo Agendamento na Grade'}
              </h3>
              {agendamentoItem?.isis_criou && (
                <div className="isis-badge" style={{ padding: '2px 8px 2px 3px' }}>
                  <img src="/isisneutraperfil.png" alt="Ísis" />
                  <span>Ísis</span>
                </div>
              )}
            </div>

            <div className="total-badge-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isReadOnly && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 500 }}>Total do Procedimento:</span>
                  <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>{totalProcedimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
              <button className="settings-close-btn" onClick={onClose} style={{ margin: 0, padding: 0, background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}><IClose /></button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Carregando dados...</p>
          ) : isReadOnly ? (
            <div className="appointment-view-mode" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>Cliente</p>
                  <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#fff', fontWeight: 700 }}>
                    {form.codigo_cliente === 'avulso' ? (nomeAvulso || 'Cliente Sem Cadastro') : (clientes.find(c => String(c.id) === String(form.codigo_cliente))?.nome || 'Cliente')}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '6px 12px', borderRadius: '20px', background: form.status === 'finalizado' ? '#10b98120' : '#0ea5e920', color: form.status === 'finalizado' ? '#10b981' : '#0ea5e9', fontSize: '0.85rem', fontWeight: 600 }}>
                    {form.status.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ background: '#3b82f6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                    {new Date(form.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>Início: <strong>{form.hora}</strong></p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selections.map((sel: any, idx: number) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{servicos.find(s => String(s.codigo) === String(sel.serviceCode))?.nome}</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{profissionais.find(p => String(p.codigo) === String(sel.professionalCode))?.nome} - {sel.timeSlot}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button type="button" onClick={() => setIsReadOnly(false)} style={{ width: '100%', height: '50px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>Editar Agendamento</button>
                <button type="button" onClick={onClose} style={{ width: '100%', height: '50px', background: 'transparent', color: '#fff', border: '1px solid #374151', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>Fechar</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div className="form-group-flat">
                <label style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Cliente (Base)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    value={form.codigo_cliente}
                    onChange={e => { setForm({ ...form, codigo_cliente: e.target.value }); setShowQuickCli(false); }}
                    required
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid #374151', fontSize: '1rem' }}
                  >
                    <option value="">-- Selecionar Cliente --</option>
                    <option value="avulso">Cliente Sem Cadastro</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowQuickCli(!showQuickCli)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', width: '48px', height: '48px', fontSize: '1.5rem', cursor: 'pointer' }}>+</button>
                </div>

                {form.codigo_cliente === 'avulso' && (
                  <input type="text" placeholder="Nome do Cliente" value={nomeAvulso} onChange={e => setNomeAvulso(e.target.value)} required style={{ width: '100%', marginTop: '12px', padding: '12px', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px dashed #374151' }} />
                )}

                {showQuickCli && (
                  <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: '1px solid #0ea5e9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Nome *" value={quickCli.nome} onChange={e => setQuickCli({ ...quickCli, nome: e.target.value })} style={{ padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <input type="text" placeholder="WhatsApp" value={quickCli.telefone} onChange={e => setQuickCli({ ...quickCli, telefone: e.target.value })} style={{ padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <button type="button" onClick={handleQuickSaveCli} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 600 }}>Salvar Cliente</button>
                  </div>
                )}
              </div>

              <div className="form-group-flat">
                <label style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Data Escolhida</span>
                  <span style={{ color: '#0ea5e9', fontWeight: 600, textTransform: 'capitalize' }}>
                    {form.data ? new Date(form.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) : ''}
                  </span>
                </label>
                <input
                  type="date"
                  value={form.data}
                  onChange={async (e) => {
                    const newVal = e.target.value;
                    setForm({ ...form, data: newVal });
                    for (let i = 0; i < selections.length; i++) {
                      if (selections[i].serviceCode && selections[i].professionalCode) {
                        await triggerLoadSlots(i, selections[i].serviceCode, selections[i].professionalCode, newVal, selections);
                      }
                    }
                  }}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid #374151', fontSize: '1.2rem', fontWeight: 700 }}
                />
              </div>

              <div className="form-group-flat">
                <label style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Procedimentos (Serviço + Profissional)</label>
                {selections.map((sel, index) => (
                  <div key={index} className="procedures-grid procedure-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.8fr) auto', gap: '8px', marginBottom: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid #374151' }}>
                    <select value={sel.serviceCode} onChange={async (e) => {
                      const val = e.target.value;
                      // Truncate subsequent selections and reset current slot
                      const newSelections = selections.slice(0, index + 1);
                      newSelections[index].serviceCode = val;
                      newSelections[index].timeSlot = '';
                      setSelections(newSelections);
                      if (val && newSelections[index].professionalCode) await triggerLoadSlots(index, val, newSelections[index].professionalCode, form.data, newSelections);
                    }} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#111827', color: '#fff', border: '1px solid #374151', fontSize: '0.85rem' }}>
                      <option value="">Serviço</option>
                      {servicos.map(s => <option key={s.codigo} value={s.codigo}>{s.nome}</option>)}
                    </select>

                    <select value={sel.professionalCode} onChange={async (e) => {
                      const val = e.target.value;
                      // Truncate subsequent selections and reset current slot
                      const newSelections = selections.slice(0, index + 1);
                      newSelections[index].professionalCode = val;
                      newSelections[index].timeSlot = '';
                      setSelections(newSelections);
                      if (val && newSelections[index].serviceCode) await triggerLoadSlots(index, newSelections[index].serviceCode, val, form.data, newSelections);
                    }} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#111827', color: '#fff', border: '1px solid #374151', fontSize: '0.85rem' }}>
                      <option value="">Profissional</option>
                      {profissionais.map(p => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
                    </select>

                    <select value={sel.timeSlot} onChange={e => {
                      const val = e.target.value;
                      // Truncate subsequent selections when time changes
                      const newSelections = selections.slice(0, index + 1);
                      newSelections[index].timeSlot = val;
                      setSelections(newSelections);
                    }} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#111827', color: '#fff', border: '1px solid #374151', fontSize: '0.85rem' }}>
                      <option value="">Hora</option>
                      {sel.availableSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {index === selections.length - 1 ? (
                      <button className="procedure-add-btn" type="button" onClick={() => setSelections([...selections, { serviceCode: '', professionalCode: '', timeSlot: '', availableSlots: [], loadingSlots: false }])} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>+</button>
                    ) : (
                      <button className="procedure-add-btn" type="button" onClick={() => {
                        const newS = [...selections];
                        newS.splice(index, 1);
                        setSelections(newS);
                      }} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>x</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="form-group-flat">
                <label style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Observação Interna</label>
                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="✨ Agendamento realizado via Assistente Ísis" rows={2} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid #374151', resize: 'none' }} />
              </div>

              <div className="form-group-flat">
                <label style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Status do Agendamento</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1f2937', color: '#fff', border: '1px solid #374151' }}>
                  <option value="agendado">Agendado</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                <button type="submit" style={{ width: '100%', height: '56px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', transition: 'filter 0.2s' }}>Confirmar Agendamento</button>

                {agendamentoItem && (
                  <button type="button" onClick={() => setIsDeleteConfirmOpen(true)} style={{ width: '100%', height: '50px', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar Agendamento</button>
                )}

                <button type="button" onClick={onClose} style={{ width: '100%', height: '50px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Fechar</button>
              </div>
            </form>
          )}
        </div>

        {isDeleteConfirmOpen && (
          <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.8)' }} onClick={() => setIsDeleteConfirmOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', background: '#111827', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#ef4444', margin: '0 0 16px 0' }}>Cancelar Agendamento?</h3>
              <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Esta ação não pode ser desfeita.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsDeleteConfirmOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #374151', color: '#fff', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700 }}>Voltar</button>
                <button onClick={handleCancelApptAction} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700 }}>Sim, Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
