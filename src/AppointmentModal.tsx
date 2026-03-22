import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { toast } from './Toast';

const IClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export default function AppointmentModal({ isOpen, onClose, user, configAgenda, baseDate, baseHour, agendamentoItem, onSaveSuccess }: any) {
  const [loading, setLoading] = useState(true);
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  const [form, setForm] = useState<any>({
    codigo_cliente: '',
    codigo_servico: '',
    codigo_profissional: '',
    data: '',
    hora: '',
    status: 'agendado',
    observacao: ''
  });

  const [nomeAvulso, setNomeAvulso] = useState('');
  const [showQuickCli, setShowQuickCli] = useState(false);
  const [quickCli, setQuickCli] = useState({ nome: '', telefone: '' });
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<any[]>([]);
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
    } else if (!agendamentoItem && isOpen && !loading) {
       setForm({
         codigo_cliente: '',
         codigo_servico: '',
         codigo_profissional: user && !user.is_admin ? user.codigo : '',
         data: baseDate ? new Date(baseDate).toLocaleDateString('en-CA').split('T')[0] : new Date().toLocaleDateString('en-CA').split('T')[0],
         hora: baseHour !== null && baseHour !== undefined ? baseHour.toString().padStart(2, '0') + ':00' : '09:00',
         status: 'agendado',
         observacao: ''
       });
       setNomeAvulso('');
       setShowQuickCli(false);
       setConfirmCancel(false);
    }
  }, [agendamentoItem, isOpen, loading, baseDate, baseHour]);

  useEffect(() => {
    const fetchAgendamentosDia = async () => {
      if (!form.codigo_profissional || !form.data) {
        setAgendamentosDoDia([]);
        return;
      }
      const paramData = form.data;
      const startOfDay = new Date(`${paramData}T00:00:00`).toISOString();
      const endOfDay = new Date(`${paramData}T23:59:59`).toISOString();

      const { data } = await supabase.from('agendamentos')
         .select('id, data_hora_inicio, data_hora_fim, status')
         .eq('codigo_empresa', user.codigo_empresa)
         .eq('codigo_profissional', form.codigo_profissional)
         .gte('data_hora_inicio', startOfDay)
         .lte('data_hora_inicio', endOfDay);
      
      setAgendamentosDoDia(data || []);
    };
    fetchAgendamentosDia();
  }, [form.codigo_profissional, form.data, user?.codigo_empresa]);

  const getWorkingRange = () => {
    let earliest = 9;
    let latest = 18;
    if (configAgenda?.horarios) {
      const openDays = configAgenda.horarios.filter((h: any) => h.aberto);
      if (openDays.length > 0) {
        earliest = Math.min(...openDays.map((h: any) => parseInt(h.inicio.split(':')[0])));
        const latestFromHours = openDays.map((h: any) => {
          const [hh, mm] = h.fim.split(':').map(Number);
          return hh + (mm > 0 ? 1 : 0);
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
    for(let h = earliest; h < latest; h++) {
       for(let min of [0, 15, 30, 45]) {
          slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
       }
    }
    return slots;
  };

  const isSlotDisponivel = (slotTime: string) => {
     if (!form.codigo_servico) return true;
     const svc = servicos.find(s => s.codigo.toString() === form.codigo_servico.toString());
     const duracao = svc ? svc.duracao_minutos : 30;
     
     const slotStart = new Date(`${form.data}T${slotTime}:00`);
     const slotEnd = new Date(slotStart.getTime() + duracao * 60000);

     for (const ag of agendamentosDoDia) {
        if (agendamentoItem && String(ag.id) === String(agendamentoItem.id)) continue;
        if (ag.status === 'cancelado') continue;
        const agStart = new Date(ag.data_hora_inicio);
        const agEnd = new Date(ag.data_hora_fim);
        if (slotStart < agEnd && slotEnd > agStart) {
           console.log(`[Slot Conflict] Slot ${slotTime} blocked by appointment:`, ag);
           return false;
        }
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
    const nextCod = allCli && allCli.length > 0 ? Math.max(...allCli.map((x:any)=>x.codigo)) + 1 : 1;
    
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
    if (!form.codigo_cliente || !form.codigo_servico || !form.codigo_profissional || !form.data || !form.hora) {
      toast('Preencha as informações principais (Cliente, Serviço e Profissional).', 'error');
      return;
    }

    let finalClienteId = form.codigo_cliente;
    let finalObs = form.observacao || '';

    if (finalClienteId === 'avulso') {
      if (!nomeAvulso) return toast('Digite o nome do cliente sem cadastro!', 'error');
      finalClienteId = 0; // Código 0 representa cliente sem cadastro (Avulso)
      finalObs = `👤 ${nomeAvulso} | ${finalObs}`;
    }

    // Calcula End Time com Fuso local
    const startObj = new Date(`${form.data}T${form.hora}:00`);
    const sObj = servicos.find(x => x.codigo.toString() === form.codigo_servico.toString());
    const duracao = sObj ? sObj.duracao_minutos : 30;
    const endObj = new Date(startObj.getTime() + duracao * 60000);

    // Validação de Janela do Grid
    const { earliest, latest } = getWorkingRange();
    const startHour = startObj.getHours() + startObj.getMinutes() / 60;
    const endHour = endObj.getHours() + endObj.getMinutes() / 60;
    if (startHour < earliest || endHour > latest) {
       toast(`⛔ Fora da janela permitida (${earliest.toString().padStart(2,'0')}:00 às ${latest.toString().padStart(2,'0')}:00)`, 'error');
       return;
    }

    // PRIVACIDADE: Não admins não podem agendar para outros
    if (user && !user.is_admin && Number(form.codigo_profissional) !== Number(user.codigo)) {
       toast('⛔ Você só pode criar agendamentos para você mesmo.', 'error');
       return;
    }

    // Conflito Check: Impede sobreposições com esse Profissional, exceto se for "cancelado"
    const { data: conflitos } = await supabase.from('agendamentos')
      .select('id')
      .eq('codigo_empresa', user.codigo_empresa)
      .eq('codigo_profissional', form.codigo_profissional)
      .neq('status', 'cancelado')
      .lt('data_hora_inicio', endObj.toISOString()) 
      .gt('data_hora_fim', startObj.toISOString()); 

    const isConflict = conflitos && conflitos.some(c => !agendamentoItem || c.id !== agendamentoItem.id);
    if (isConflict) {
      toast('⛔ Conflito de Horário! Este profissional já está ocupado nesse momento.', 'error');
      return;
    }

    const payload = {
      codigo_empresa: user.codigo_empresa,
      codigo_servico: form.codigo_servico,
      codigo_cliente: finalClienteId,
      codigo_profissional: form.codigo_profissional,
      data_hora_inicio: startObj.toISOString(),
      data_hora_fim: endObj.toISOString(),
      status: form.status,
      observacao: finalObs
    };

    if (!agendamentoItem) {
      const { data: allAgend } = await supabase.from('agendamentos').select('codigo').eq('codigo_empresa', user.codigo_empresa);
      const nextCod = allAgend && allAgend.length > 0 ? Math.max(...allAgend.map((x:any)=>x.codigo)) + 1 : 1;

      const { error } = await supabase.from('agendamentos').insert({
        codigo: nextCod,
        ...payload
      });
      if (error) toast('Erro ao agendar: ' + error.message, 'error');
      else { toast('Agendamento confirmado!', 'success'); onSaveSuccess(); onClose(); }
    } else {
      const { error } = await supabase.from('agendamentos').update(payload).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
      if (error) toast('Erro ao atualizar: ' + error.message, 'error');
      else { toast('Agendamento atualizado!', 'success'); onSaveSuccess(); onClose(); }
    }
  };

  const handleCancelAppt = async () => {
    const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', agendamentoItem.id).eq('codigo_empresa', user.codigo_empresa);
    if (error) toast('Erro ao cancelar', 'error');
    else { toast('Agendamento cancelado!', 'success'); onSaveSuccess(); onClose(); }
  };

  if (!isOpen) return null;

  return (
    <> 
    <style>{`
      .resp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 768px) { .resp-grid { grid-template-columns: 1fr; } }
    `}</style>
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%', maxHeight: '90dvh', padding: '24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{agendamentoItem ? 'Visualizar / Editar Agendamento' : 'Novo Agendamento na Grade'}</h3>
            {agendamentoItem && (() => {
               const svc = servicos.find(s => s.codigo.toString() === form.codigo_servico.toString());
               const val = svc?.valor ? Number(svc.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
               const stColor = form.status === 'cancelado' ? '#ef4444' : form.status === 'finalizado' ? '#10b981' : form.status === 'em andamento' ? '#f59e0b' : '#0ea5e9';
               return (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                       Das {new Date(agendamentoItem.data_hora_inicio).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} às {new Date(agendamentoItem.data_hora_fim).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
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
        ) : (
          <form onSubmit={handleSave} className="form-grid full" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="resp-grid">
              
              <div className="form-group-flat full" style={{ gridColumn: '1 / -1' }}>
                <label>Cliente (Base)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={form.codigo_cliente} onChange={e => { setForm({...form, codigo_cliente: e.target.value}); setShowQuickCli(false); }} required style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none' }}>
                    <option value="">-- Selecionar Cliente --</option>
                    <option value="avulso">👤 Cliente Sem Cadastro</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button type="button" onClick={() => { setShowQuickCli(!showQuickCli); setForm({...form, codigo_cliente: ''}); }} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '1.2rem', cursor: 'pointer' }} title="Cadastrar Novo Cliente Rápidamente">+</button>
                </div>
                
                {form.codigo_cliente === 'avulso' && (
                  <div style={{ marginTop: '12px' }}>
                    <input type="text" placeholder="Nome do Cliente" value={nomeAvulso} onChange={e => setNomeAvulso(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px dashed var(--border-color)', outline: 'none' }} />
                  </div>
                )}

                {showQuickCli && (
                  <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary-color)' }}>Novo Cadastro Rápido</strong>
                    <input type="text" placeholder="Nome Completo *" value={quickCli.nome} onChange={e => setQuickCli({...quickCli, nome: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#00000030', color: '#fff', border: 'none', outline: 'none' }} />
                    <input type="text" placeholder="Telefone ou WhatsApp" value={quickCli.telefone} onChange={e => setQuickCli({...quickCli, telefone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#00000030', color: '#fff', border: 'none', outline: 'none' }} />
                    <button type="button" onClick={handleQuickSaveCli} style={{ background: 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cadastrar</button>
                    <button type="button" onClick={() => setShowQuickCli(false)} style={{ position:'absolute', top:'10px', right:'10px', background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>x</button>
                  </div>
                )}
              </div>

              <div className="form-group-flat full">
                <label>Oferta / Serviço</label>
                <select value={form.codigo_servico} onChange={e => {
                   setForm({...form, codigo_servico: e.target.value, codigo_profissional: ''}); 
                }} required style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none' }}>
                  <option value="">-- Selecionar Serviço --</option>
                  {servicos.map(s => <option key={s.codigo} value={s.codigo}>{s.nome} ({s.duracao_minutos} min)</option>)}
                </select>
              </div>

              <div className="form-group-flat full">
                <label>Executado Por (Profissional)</label>
                <select 
                  value={form.codigo_profissional} 
                  disabled={!form.codigo_servico || (user && !user.is_admin)} 
                  onChange={e => setForm({...form, codigo_profissional: e.target.value})} 
                  required 
                  style={{ 
                    padding: '12px 14px', 
                    borderRadius: '8px', 
                    background: 'var(--input-bg)', 
                    color: '#fff', 
                    border: '1px solid var(--border-color)', 
                    fontSize: '1rem', 
                    outline: 'none', 
                    opacity: (!form.codigo_servico || (user && !user.is_admin)) ? 0.6 : 1, 
                    transition: '0.2s' 
                  }}
                >
                  <option value="">{form.codigo_servico ? '-- Escolher Profissional --' : 'Bloqueado (Escolha o Serviço)'}</option>
                  {form.codigo_servico && profissionais.map(p => {
                    const svc = servicos.find(s => s.codigo.toString() === form.codigo_servico.toString());
                    const isAllowed = svc ? (svc.profissionais_habilitados || []).includes(p.codigo) : true;
                    return <option key={p.codigo} value={p.id}>{p.nome} {!isAllowed ? '(Fora de Cobertura)' : ''}</option>
                  })}
                </select>
                {user && !user.is_admin && <p style={{ fontSize: '0.7rem', color: 'var(--primary-color)', marginTop: '4px' }}>Você só pode realizar agendamentos em seu nome.</p>}
              </div>

              <div className="form-group-flat full">
                <label>Data Escolhida</label>
                <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} required style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div className="form-group-flat full">
                <label>Hora de Chegada (Início)</label>
                <select 
                   value={form.hora} 
                   onChange={e => setForm({...form, hora: e.target.value})} 
                   disabled={!form.codigo_profissional || !form.data || !form.codigo_servico}
                   required 
                   style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '1rem', outline: 'none', opacity: (!form.codigo_profissional || !form.codigo_servico || !form.data) ? 0.4 : 1, transition: '0.2s' }}
                >
                   <option value="">
                     {(!form.codigo_profissional || !form.codigo_servico) ? 'Selecione Profissional e Serviço' : '-- Escolha o Horário --'}
                   </option>
                   {form.codigo_profissional && form.codigo_servico && form.data && getHorariosGerados().map(slot => {
                      const isAval = isSlotDisponivel(slot);
                      return (
                        <option key={slot} value={slot} disabled={!isAval}>
                          {slot} {!isAval ? '❌ (Ocupado)' : ''}
                        </option>
                      );
                   })}
                </select>
              </div>

            </div>

            <div className="form-group-flat full" style={{ marginTop: '8px' }}>
              <label>Observação Interna</label>
              <textarea value={form.observacao || ''} onChange={e => setForm({...form, observacao: e.target.value})} placeholder="adiciona uma observação" rows={2} style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', resize: 'vertical', outline: 'none' }} />
            </div>

            {agendamentoItem && form.status !== 'cancelado' && (
               <div className="form-group-flat full" style={{ marginTop: '8px' }}>
                 <button type="button" onClick={() => setConfirmCancel(true)} className="btn-save" style={{ margin: 0, background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.6)', color: '#ef4444', padding: '12px', fontSize: '1rem' }}>Cancelar agendamento</button>
               </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button type="submit" className="btn-save" style={{ margin: 0, flex: '1 1 100%', height: '48px', fontSize: '1rem' }}>{agendamentoItem ? 'Salvar alterações' : 'Confirmar Novo Agendamento'}</button>
              <button type="button" onClick={onClose} className="btn-save" style={{ margin: 0, flex: '1 1 100%', background: 'transparent', border: '1px solid var(--border-color)', height: '48px', color: '#fff' }}>Fechar</button> 
            </div>
          </form>
        )}
      </div>

      {/* Modal de Confirmação de Cancelamento */}
      {confirmCancel && (
        <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.85)' }} onClick={() => setConfirmCancel(false)}>
           <div className="modal-card" style={{ maxWidth: '400px', width: '90%', padding: '32px 24px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#ef4444', margin: '0 0 12px 0', fontSize: '1.4rem' }}>Desmarcar Horário?</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 24px 0', fontSize: '1rem' }}>Ao realizar esta ação, as informações sumirão da tela e o agendamento será permanentemente cancelado. Deseja prosseguir?</p>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                 <button type="button" onClick={() => setConfirmCancel(false)} className="btn-save" style={{ margin: 0, flex: 1, background: 'transparent', color: '#fff', border: '1px solid var(--border-color)', height: '44px' }}>Voltar</button>
                 <button type="button" onClick={handleCancelAppt} className="btn-save" style={{ margin: 0, flex: 1, background: '#ef4444', color: '#fff', border: 'none', height: '44px' }}>Sim, Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
    </>
  );
}
