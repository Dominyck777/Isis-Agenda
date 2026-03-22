import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import CryptoJS from 'crypto-js';
import { toast } from './Toast';
import './Settings.css';

const IClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ITag = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>;
const IEdit = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.81.936.936-2.81a4.5 4.5 0 011.14-1.89l12.655-12.655z" /></svg>;
const IUsers = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const IFolder = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;

const maskPhone = (val: string) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  return v;
};

export default function CadastrosPanel({ onClose, user }: { onClose: () => void, user: any }) {
  const [tab, setTab] = useState('clientes');
  const [loading, setLoading] = useState(true);
  
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const [editingSvc, setEditingSvc] = useState<any>(null);
  const [editingCli, setEditingCli] = useState<any>(null);

  const [authAction, setAuthAction] = useState<{ type: 'novo' | 'edit', payload?: any } | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    if (tab === 'servicos') {
      const { data } = await supabase.from('servicos').select('*').eq('codigo_empresa', user.codigo_empresa).order('nome', { ascending: true });
      const { data: profs } = await supabase.from('usuarios').select('codigo, nome').eq('codigo_empresa', user.codigo_empresa).eq('ativo', true).order('nome', { ascending: true });
      if (data) setServicos(data);
      if (profs) setProfissionais(profs);
    } else {
      const { data } = await supabase.from('clientes').select('*').eq('codigo_empresa', user.codigo_empresa).order('codigo', { ascending: true });
      if (data) setClientes(data);
    }
    setLoading(false);
  };
  
  // ----- CLIENTES (CRUD MESTRE) -----
  const openNewCliForm = () => {
    setEditingCli({ codigo: 'novo', nome: '', telefone: '', email: '', ativo: true });
  };
  
  const handleSaveCli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCli.nome) return toast('Nome é obrigatório!', 'error');

    if (editingCli.codigo === 'novo') {
      // Computa auto-increment seguro
      const { data: allCli } = await supabase.from('clientes').select('codigo').eq('codigo_empresa', user.codigo_empresa);
      const nextCod = allCli && allCli.length > 0 ? Math.max(...allCli.map((x:any)=>x.codigo)) + 1 : 1;
      
      const { error } = await supabase.from('clientes').insert({
        codigo: nextCod, codigo_empresa: user.codigo_empresa, 
        nome: editingCli.nome, telefone: editingCli.telefone || null, email: editingCli.email || null, ativo: editingCli.ativo !== false
      });
      if (error) toast('Erro ao criar: ' + error.message, 'error');
      else { toast(`Cliente #${nextCod.toString().padStart(4, '0')} cadastrado!`, 'success'); setEditingCli(null); loadData(); }
    } else {
      const { error } = await supabase.from('clientes').update({
        nome: editingCli.nome, telefone: editingCli.telefone || null, email: editingCli.email || null, ativo: editingCli.ativo !== false
      }).eq('id', editingCli.id).eq('codigo_empresa', user.codigo_empresa);
      if (error) toast('Erro ao atualizar: ' + error.message, 'error');
      else { toast('Cliente atualizado!', 'success'); setEditingCli(null); loadData(); }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('Autenticando...');
    const hashedInput = CryptoJS.SHA256(authPassword).toString(CryptoJS.enc.Hex);

    const { data: admins, error } = await supabase
      .from('usuarios')
      .select('senha')
      .eq('codigo_empresa', user.codigo_empresa)
      .eq('is_admin', true)
      .eq('ativo', true);

    if (error) {
      setAuthError('Erro ao consultar banco de dados.');
      return;
    }

    const isAdminValid = admins && admins.some(a => a.senha === hashedInput);
    
    if (isAdminValid || (user.is_admin && hashedInput === user.senha)) {
      if (authAction?.type === 'novo') openNewForm();
      else if (authAction?.type === 'edit') handleEditClick(authAction.payload);
      setAuthAction(null);
    } else {
      setAuthError('Senha incorreta! Requer permissão de administrador.');
    }
  };

  const onAddClick = () => { setAuthAction({ type: 'novo' }); setAuthPassword(''); setAuthError(''); };
  const onEditClick = (s: any) => { setAuthAction({ type: 'edit', payload: s }); setAuthPassword(''); setAuthError(''); };

  const openNewForm = () => {
    setEditingSvc({
      codigo: 'novo',
      nome: '',
      descricao: '',
      precoText: '0,00',
      duracaoText: '00:30',
      ativo: true,
      profissionais_habilitados: []
    });
  };

  const handleEditClick = (s: any) => {
    const pText = (parseFloat(s.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const h = Math.floor(s.duracao_minutos / 60).toString().padStart(2, '0');
    const m = (s.duracao_minutos % 60).toString().padStart(2, '0');
    setEditingSvc({ ...s, precoText: pText, duracaoText: `${h}:${m}`, profissionais_habilitados: s.profissionais_habilitados || [] });
  };

  const handlePrecoChange = (valStr: string) => {
    let raw = valStr.replace(/\D/g, '');
    if (!raw) raw = '0';
    const amount = parseInt(raw, 10) / 100;
    const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setEditingSvc({ ...editingSvc, precoText: formatted });
  };

  const handleDuracaoChange = (valStr: string) => {
    let raw = valStr.replace(/\D/g, '');
    if (raw.length > 4) raw = raw.slice(0, 4);
    let formatted = raw;
    if (raw.length >= 3) {
      formatted = raw.slice(0, 2) + ':' + raw.slice(2);
    }
    setEditingSvc({ ...editingSvc, duracaoText: formatted });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPreco = parseFloat(editingSvc.precoText.replace(/\./g, '').replace(',', '.'));
    const durParts = (editingSvc.duracaoText || '00:00').split(':');
    let parsedDuracao = 0;
    if (durParts.length === 2) {
       parsedDuracao = parseInt(durParts[0], 10) * 60 + parseInt(durParts[1], 10);
    }

    if (!editingSvc.nome || parsedPreco < 0 || parsedDuracao <= 0) {
      toast('Verifique se nome, preço e tempo estão preenchidos corretamente.', 'error');
      return;
    }

    const payload = {
      nome: editingSvc.nome,
      descricao: editingSvc.descricao,
      valor: parsedPreco,
      duracao_minutos: parsedDuracao,
      ativo: editingSvc.ativo,
      codigo_empresa: user.codigo_empresa,
      profissionais_habilitados: editingSvc.profissionais_habilitados || []
    };

    if (editingSvc.codigo === 'novo') {
      console.log('Tentando CRIAR serviço com o Payload:', payload);
      const { data, error } = await supabase.from('servicos').insert(payload).select();
      if (error) {
        console.error('SUPABASE CREATE ERROR DETALHADO:', error);
        toast('Erro ao criar: ' + error.message, 'error');
      } else { 
        console.log('Serviço criado no banco:', data);
        toast('Serviço adicionado ao seu catálogo!', 'success'); 
        setEditingSvc(null); 
        loadData(); 
      }
    } else {
      console.log('Tentando ATUALIZAR serviço com o Payload:', payload);
      const { data, error } = await supabase.from('servicos').update(payload).eq('codigo', editingSvc.codigo).select();
      if (error) {
        console.error('SUPABASE UPDATE ERROR DETALHADO:', error);
        toast('Erro ao atualizar: ' + error.message, 'error');
      } else { 
        console.log('Serviço atualizado no banco:', data);
        toast('Serviço atualizado com sucesso!', 'success'); 
        setEditingSvc(null); 
        loadData(); 
      }
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="settings-header" style={{ flexShrink: 0 }}>
          <h2 style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}><IFolder /> Cadastros</h2>
          <button className="settings-close-btn" onClick={onClose}><IClose /></button>
        </div>

        <div className="mobile-tab-select-container">
          <select value={tab} onChange={e => { setTab(e.target.value); setEditingSvc(null); setEditingCli(null); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', outline: 'none', fontSize: '1rem' }}>
            <option value="clientes">👥 Clientes</option>
            <option value="servicos">✂️ Serviços e Preços</option>
          </select>
        </div>

        <div className="settings-body" style={{ display: 'flex', flex: 1, padding: 0, overflow: 'hidden' }}>
          
          <aside className="settings-nav" style={{ width: '220px', borderRight: '1px solid var(--border-color)', padding: '24px 0', flexShrink: 0, overflowY: 'auto' }}>
            <button className={`nav-tab ${tab === 'clientes' ? 'active' : ''}`} onClick={() => { setTab('clientes'); setEditingSvc(null); setEditingCli(null); }}>
              <IUsers /> Clientes
            </button>
            <button className={`nav-tab ${tab === 'servicos' ? 'active' : ''}`} onClick={() => { setTab('servicos'); setEditingSvc(null); setEditingCli(null); }}>
              <ITag /> Serviços
            </button>
          </aside>

          <main className="settings-content" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Sincronizando {tab === 'clientes' ? 'clientes' : 'serviços'}...</p>
            ) : tab === 'clientes' ? (
              
              /* ====== ABA CLIENTES ====== */
              editingCli ? (
                <form onSubmit={handleSaveCli} style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)', animation: 'slideUp 0.15s ease-out' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                    {editingCli.codigo === 'novo' ? 'Novo Cliente' : `Cliente #${editingCli.codigo.toString().padStart(4, '0')}: ${editingCli.nome}`}
                  </h4>
                  <div className="form-grid">
                    <div className="form-group-flat full">
                      <label>Nome Completo</label>
                      <input type="text" value={editingCli.nome} onChange={e => setEditingCli({...editingCli, nome: e.target.value})} required placeholder="Ex: Ana Gabriela" />
                    </div>
                    <div className="form-group-flat">
                      <label>Telefone / WhatsApp</label>
                      <input type="text" value={editingCli.telefone || ''} onChange={e => setEditingCli({...editingCli, telefone: maskPhone(e.target.value)})} placeholder="(XX) 90000-0000" />
                    </div>
                    <div className="form-group-flat">
                      <label>Email (Opcional)</label>
                      <input type="email" value={editingCli.email || ''} onChange={e => setEditingCli({...editingCli, email: e.target.value})} placeholder="cliente@email.com" />
                    </div>
                    <div className="form-group-flat" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px', gridColumn: '1 / -1' }}>
                      <input type="checkbox" id="isCliActive" checked={editingCli.ativo !== false} onChange={e => setEditingCli({...editingCli, ativo: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <label htmlFor="isCliActive" style={{ cursor: 'pointer', color: '#fff' }}>Cadastro Ativo</label>
                    </div>
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button type="submit" className="btn-save" style={{ marginTop: 0 }}>{editingCli.codigo === 'novo' ? 'Cadastrar Cliente' : 'Atualizar Dados'}</button>
                    <button type="button" className="btn-save" style={{ marginTop: 0, background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setEditingCli(null)}>Voltar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3>Gerenciar Clientes</h3>
                    <button className="btn-add-user" onClick={openNewCliForm} style={{ marginBottom: 0 }}>+ Cadastrar Cliente</button>
                  </div>
                  <div style={{ overflowX: 'auto', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <table className="users-table" style={{ margin: 0, border: 'none' }}>
                      <thead><tr><th>Cód</th><th>Nome</th><th>Telefone</th><th>Status</th><th>Ação</th></tr></thead>
                      <tbody>
                        {clientes.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', color:'var(--text-muted)', padding: '24px'}}>Nenhum cliente em sua base. Que tal registrar o primeiro?</td></tr>}
                        {clientes.map(c => (
                          <tr key={c.id}>
                            <td style={{ color:'var(--text-muted)' }}>#{c.codigo.toString().padStart(4, '0')}</td>
                            <td><strong>{c.nome}</strong></td>
                            <td>{c.telefone || '-'}</td>
                            <td>{c.ativo !== false ? '🟢 Ativo' : '🔴 Inativo'}</td>
                            <td><button style={{ background:'transparent', border:'none', color:'#0ea5e9', cursor:'pointer' }} onClick={() => setEditingCli(c)} title="Editar Cliente"><IEdit /> Editar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
              
            ) : (
              
              /* ====== ABA SERVIÇOS ====== */
              editingSvc ? (
                <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)', animation: 'slideUp 0.15s ease-out' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                    {editingSvc.codigo === 'novo' ? 'Cadastrar Novo Serviço' : `Editando: ${editingSvc.nome}`}
                  </h4>
                  <div className="form-grid">
                    <div className="form-group-flat full">
                      <label>Nome do Serviço</label>
                      <input type="text" value={editingSvc.nome} onChange={e => setEditingSvc({...editingSvc, nome: e.target.value})} required placeholder="Ex: Corte Degrade / Piercing Tragus" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: '#fff', outline: 'none' }} />
                    </div>
                    <div className="form-group-flat full">
                      <label>Descrição (Opcional - Informações e Detalhes da Execução)</label>
                      <textarea rows={2} value={editingSvc.descricao || ''} onChange={e => setEditingSvc({...editingSvc, descricao: e.target.value})} placeholder="Escreva os detalhes para os clientes..." style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: '#fff', outline: 'none', resize: 'vertical' }} />
                    </div>
                    <div className="form-group-flat">
                      <label>Valor / Preço Base</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0 12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>R$</span>
                        <input type="text" value={editingSvc.precoText} onChange={e => handlePrecoChange(e.target.value)} required style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: '10px 8px', flex: 1 }} />
                      </div>
                    </div>
                    <div className="form-group-flat">
                      <label>Tempo Estimado (HH:MM)</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0 12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>⏱</span>
                        <input type="text" placeholder="00:00" value={editingSvc.duracaoText} onChange={e => handleDuracaoChange(e.target.value)} required style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: '10px 8px', flex: 1, letterSpacing: '1px' }} />
                      </div>
                    </div>
                    <div className="form-group-flat full" style={{ marginTop: '8px' }}>
                      <label>Profissionais Habilitados para este Serviço</label>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                         {profissionais.map((p: any) => (
                             <label key={p.codigo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', color: '#fff', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
                                <input type="checkbox" checked={(editingSvc.profissionais_habilitados || []).includes(p.codigo)} onChange={(e) => {
                                   const checked = e.target.checked;
                                   const current = editingSvc.profissionais_habilitados || [];
                                   setEditingSvc({...editingSvc, profissionais_habilitados: checked ? [...current, p.codigo] : current.filter((x:any) => x !== p.codigo)});
                                }} style={{ cursor: 'pointer' }} />
                                {p.nome}
                             </label>
                         ))}
                         {profissionais.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum profissional cadastrado na equipe. Adicione-os em Configurações.</span>}
                      </div>
                    </div>

                    <div className="form-group-flat" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '16px', gridColumn: '1 / -1' }}>
                      <input type="checkbox" id="isSvcActive" checked={editingSvc.ativo} onChange={e => setEditingSvc({...editingSvc, ativo: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <label htmlFor="isSvcActive" style={{ cursor: 'pointer', color: '#fff' }}>Habilitar este serviço para a Agenda?</label>
                    </div>
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                    <button type="submit" className="btn-save" style={{ marginTop: 0 }}>{editingSvc.codigo === 'novo' ? 'Criar Serviço' : 'Salvar Alterações'}</button>
                    <button type="button" className="btn-save" style={{ marginTop: 0, background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setEditingSvc(null)}>Voltar</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Configure os serviços oferecidos e seus valores.</p>
                    <button className="btn-add-user" onClick={onAddClick} style={{ marginBottom: 0 }}>+ Adicionar Serviço</button>
                  </div>
                  <div style={{ overflowX: 'auto', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <table className="users-table" style={{ margin: 0, border: 'none' }}>
                      <thead><tr><th>Serviço</th><th>Dur. Estimada</th><th>Valor Base</th><th>Status</th><th>Ação</th></tr></thead>
                      <tbody>
                        {servicos.length === 0 && <tr><td colSpan={5} style={{textAlign:'center', color:'var(--text-muted)', padding: '24px'}}>Nenhum serviço cadastrado na sua base.</td></tr>}
                        {servicos.map(s => (
                          <tr key={s.codigo}>
                            <td><strong>{s.nome}</strong></td>
                            <td>{Math.floor(s.duracao_minutos/60).toString().padStart(2, '0')}:{(s.duracao_minutos%60).toString().padStart(2, '0')}</td>
                            <td>{parseFloat(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td>{s.ativo ? '🟢 Ativo' : '🔴 Desativado'}</td>
                            <td><button style={{ background:'transparent', border:'none', color:'#0ea5e9', cursor:'pointer' }} onClick={() => onEditClick(s)} title="Editar Serviço"><IEdit /> Editar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            )}
          </main>
        </div>
      </div>

      {/* Modal de Re-autenticação para Editar/Criar Serviços */}
      {authAction && (
        <div className="modal-overlay" onClick={() => setAuthAction(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ display:'flex', alignItems:'center', gap:'8px', color: 'var(--text-main)', marginBottom: '4px' }}>Acesso Restrito</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Digite a senha de um administrador para modificar os serviços.
            </p>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="password" 
                placeholder="Senha Admin..." 
                value={authPassword} 
                onChange={e => setAuthPassword(e.target.value)} 
                required 
                autoFocus
                style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: '#fff', fontSize: '1rem', outline: 'none' }}
              />
              {authError && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '-8px' }}>{authError}</span>}
              <div className="modal-actions">
                <button type="button" className="btn-sec" onClick={() => setAuthAction(null)}>Cancelar</button>
                <button type="submit" className="btn-pri" style={{ backgroundColor: 'var(--primary-color)' }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
