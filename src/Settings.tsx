import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import CryptoJS from 'crypto-js';
import { toast } from './Toast';
import './Settings.css';
import { subscribeToPush, unsubscribeFromPush, checkPushSubscription } from './lib/push';

const IClose = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const ICalendar = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ISettings = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IUsers = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const IEdit = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.14l-2.81.936.936-2.81a4.5 4.5 0 011.14-1.89l12.655-12.655z" /></svg>;
const IDownload = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" /></svg>;

const maskPhone = (val: string) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
  return v;
};

function hashPassword(password: string) {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

export default function Settings({ onClose, user }: { onClose: () => void, user: any }) {
  const [tab, setTab] = useState('empresa');
  const [loading, setLoading] = useState(true);
  
  // Empresa State
  const [empresaForm, setEmpresaForm] = useState<any>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isAgendaSaved, setIsAgendaSaved] = useState(false);

  // Usuarios State
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null); // Se null = não editando. Se objeto = form populado
  // Agenda State
  const [configAgenda, setConfigAgenda] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Auth Protection for non-admins
  const [authAction, setAuthAction] = useState<{ type: 'novo' | 'edit', payload?: any } | null>(null);
  const [hasAuthSession, setHasAuthSession] = useState(false); // Flag temporária após digitar senha admin
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  useEffect(() => {
    loadData();
    
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check push status
    if ('serviceWorker' in navigator) {
      checkPushSubscription().then(sub => setPushEnabled(!!sub));
    }

    return () => {};
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: emp } = await supabase.from('empresas').select('*').eq('codigo', user.codigo_empresa).single();
    if (emp) setEmpresaForm(emp);

    const { data: usrs } = await supabase.from('usuarios').select('*').eq('codigo_empresa', user.codigo_empresa).order('codigo', { ascending: true });
    if (usrs) setUsuarios(usrs);

    const { data: cfg } = await supabase.from('configuracoes_agenda').select('*').eq('codigo_empresa', user.codigo_empresa).single();
    if (cfg) {
      // Garantir que campos de almoço existam nos horários salvos
      if (cfg.horarios) {
        cfg.horarios = cfg.horarios.map((h: any) => ({
          almoco_ativo: false,
          almoco_inicio: '12:00',
          almoco_fim: '13:00',
          ...h
        }));
      }
      setConfigAgenda(cfg);
    } else {
      setConfigAgenda({
        codigo_empresa: user.codigo_empresa,
        horarios: [
          {dia: 0, nome: "Domingo", aberto: false, inicio: "08:00", fim: "12:00", almoco_ativo: false, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 1, nome: "Segunda-feira", aberto: true, inicio: "08:00", fim: "18:00", almoco_ativo: true, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 2, nome: "Terça-feira", aberto: true, inicio: "08:00", fim: "18:00", almoco_ativo: true, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 3, nome: "Quarta-feira", aberto: true, inicio: "08:00", fim: "18:00", almoco_ativo: true, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 4, nome: "Quinta-feira", aberto: true, inicio: "08:00", fim: "18:00", almoco_ativo: true, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 5, nome: "Sexta-feira", aberto: true, inicio: "08:00", fim: "18:00", almoco_ativo: true, almoco_inicio: "12:00", almoco_fim: "13:00"},
          {dia: 6, nome: "Sábado", aberto: true, inicio: "08:00", fim: "14:00", almoco_ativo: false, almoco_inicio: "12:00", almoco_fim: "13:00"}
        ]
      });
    }
    setLoading(false);
  };

  const handleSaveEmpresa = async () => {
    const { error } = await supabase.from('empresas').update({
      nome_exibicao: empresaForm.nome_exibicao,
      nome_fantasia: empresaForm.nome_fantasia,
      cnpj: empresaForm.cnpj,
      telefone: empresaForm.telefone,
      endereco: empresaForm.endereco,
      logo_url: empresaForm.logo_url
    }).eq('codigo', user.codigo_empresa);

    if (error) toast('Erro ao salvar empresa: ' + error.message, 'error');
    else {
      const updatedSess = { ...user, empresas: { ...user.empresas, nome_exibicao: empresaForm.nome_exibicao, logo_url: empresaForm.logo_url } };
      localStorage.setItem('isis_user', JSON.stringify(updatedSess));
      window.dispatchEvent(new Event('isis_user_updated'));
      toast('Informações da empresa salvas com sucesso!', 'success');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
         toast('A imagem deve ter no máximo 2MB', 'error');
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmpresaForm({ ...empresaForm, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAgenda = async () => {
    const { error } = await supabase.from('configuracoes_agenda').upsert(configAgenda);
    if (error) toast('Erro ao salvar horários: ' + error.message, 'error');
    else {
      toast('Horários e Dias configurados!', 'success');
      setIsAgendaSaved(true);
      setTimeout(() => setIsAgendaSaved(false), 2500);
    }
  };

  const updateHorario = (index: number, field: string, value: any) => {
    if (!configAgenda || !configAgenda.horarios) return;
    const novos = [...configAgenda.horarios];
    novos[index] = { ...novos[index], [field]: value };
    setConfigAgenda({ ...configAgenda, horarios: novos });
  };

  const openNewUserForm = () => {
    setEditingUser({
      codigo: 'novo',
      nome: '',
      email: '',
      senhaText: '',
      is_admin: false,
      ativo: true,
      permissoes: { permitir_fora_horario: false, permitir_no_almoco: false, comissao: 100 }
    });
  };

  const openEditUserForm = (u: any) => {
    setEditingUser({ 
      ...u, 
      senhaText: '', 
      permissoes: u.permissoes || { permitir_fora_horario: false, permitir_no_almoco: false, comissao: 100 } 
    });
  };

  const onAddUserClick = () => {
    if (user.is_admin) {
      openNewUserForm();
    } else {
      setAuthAction({ type: 'novo' });
      setAuthPassword('');
      setAuthError('');
    }
  };

  const onEditUserClick = (u: any) => {
    if (user.is_admin) {
      openEditUserForm(u);
    } else {
      setAuthAction({ type: 'edit', payload: u });
      setAuthPassword('');
      setAuthError('');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('Autenticando...');
    const hashedInput = hashPassword(authPassword);

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
      setHasAuthSession(true); // Libera a gravação para esta edição específica
      if (authAction?.type === 'novo') openNewUserForm();
      else if (authAction?.type === 'edit') openEditUserForm(authAction.payload);
      setAuthAction(null);
    } else {
      setAuthError('Senha incorreta! Requer permissão de administrador.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = editingUser.codigo === 'novo';

    if (isNew) {
      if(!editingUser.nome || !editingUser.email || !editingUser.senhaText) return;

      // Segurança Extra: Se não for admin e não teve sessão de senha, bloqueia
      if (!user.is_admin && !hasAuthSession) {
        toast('Ação não autorizada. Requer senha de administrador.', 'error');
        return;
      }
      
      const { error } = await supabase.from('usuarios').insert({
        nome: editingUser.nome,
        email: editingUser.email,
        senha: hashPassword(editingUser.senhaText),
        codigo_empresa: user.codigo_empresa,
        is_admin: editingUser.is_admin,
        ativo: editingUser.ativo,
        permissoes: editingUser.permissoes
      });

      if (error) toast('Erro ao criar: ' + error.message, 'error');
      else { 
        toast('Profissional adicionado na equipe!', 'success'); 
        setEditingUser(null); 
        setHasAuthSession(false);
        loadData(); 
      }
      
    } else {
      // Update
      const payload: any = {
        nome: editingUser.nome,
        email: editingUser.email,
        is_admin: editingUser.is_admin,
        ativo: editingUser.ativo,
        permissoes: editingUser.permissoes
      };
      
      if (editingUser.senhaText) {
        payload.senha = hashPassword(editingUser.senhaText);
      }

      const { error } = await supabase.from('usuarios').update(payload).eq('codigo', editingUser.codigo);

      if (error) toast('Erro ao atualizar: ' + error.message, 'error');
      else { 
        toast('Perfil atualizado com sucesso!', 'success'); 
        
        // Se o usuário editado for o usuário logado, atualiza o localStorage
        if (Number(editingUser.codigo) === Number(user.codigo)) {
           const updatedUser = { ...user, ...payload };
           localStorage.setItem('isis_user', JSON.stringify(updatedUser));
           window.dispatchEvent(new Event('isis_user_updated'));
        }

        setEditingUser(null); 
        setHasAuthSession(false);
        loadData(); 
      }
    }
  };

  const handleInstallApp = async () => {
    if (isIOS) {
       toast('Instalar no iOS: Toque em "Compartilhar" e depois "Adicionar à Tela de Início" 📲', 'info');
       return;
    }
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
       toast('O aplicativo já está instalado ou seu navegador não suporta.', 'info');
       return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
       (window as any).deferredPrompt = null;
    }
  };

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(user.codigo);
        setPushEnabled(false);
        toast('Notificações desativadas para este dispositivo.', 'success');
      } else {
        if (!vapidPublicKey) {
          toast('VAPID Public Key não configurada no .env', 'error');
          return;
        }
        await subscribeToPush(user.codigo, vapidPublicKey);
        setPushEnabled(true);
        toast('Notificações ativadas com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      toast('Erro ao configurar notificações: ' + err.message, 'error');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2><ISettings /> Configurações do Sistema</h2>
          <button className="settings-close-btn" onClick={onClose}><IClose /></button>
        </div>

        <div className="mobile-tab-select-container">
          <select value={tab} onChange={e => { setTab(e.target.value); setEditingUser(null); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', outline: 'none', fontSize: '1rem' }}>
            <option value="empresa">🏢 Dados da Empresa</option>
            <option value="isis">✨ Configurações da Ísis</option>
            <option value="usuarios">👥 Equipe e Acessos</option>
            <option value="agenda">📅 Agenda de Trabalho</option>
          </select>
          
          <button className="mobile-install-btn" onClick={handleInstallApp}>
            <IDownload /> {isIOS ? 'Instalar no iOS' : 'Instalar como WebApp'}
          </button>
        </div>

        <div className="settings-body">
          <aside className="settings-nav">
            <button className={`nav-tab ${tab === 'empresa' ? 'active' : ''}`} onClick={() => setTab('empresa')}>
              <ISettings /> Dados da Empresa
            </button>
            <button className={`nav-tab ${tab === 'isis' ? 'active' : ''}`} onClick={() => setTab('isis')}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', marginRight: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <img src="/isisneutraperfil.png" alt="Isis" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              Assistente Ísis
            </button>
            <button className={`nav-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => { setTab('usuarios'); setEditingUser(null); }}>
              <IUsers /> Equipe e Acessos
            </button>
            <button className={`nav-tab ${tab === 'agenda' ? 'active' : ''}`} onClick={() => { setTab('agenda'); setEditingUser(null); }}>
              <ICalendar /> Agenda de Trabalho
            </button>
            
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
               <button className="nav-tab" onClick={handleInstallApp} style={{ color: 'var(--primary-color)', fontWeight: 600, background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                  <IDownload /> {isIOS ? 'Instalar no iOS' : 'Instalar como WebApp'}
               </button>
               <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                 {isIOS ? 'No iPhone, use o Safari para instalar.' : 'Instale para acesso rápido na tela inicial.'}
               </p>
            </div>
          </aside>

          <main className="settings-content">
            {loading ? (
              <p style={{color: 'var(--text-muted)'}}>Buscando dados do banco...</p>
            ) : tab === 'empresa' ? (
              <div className="tab-pane-empresa">
                <h3>Perfil do Estabelecimento</h3>
                <div className="form-grid">
                  <div className="form-group-flat full" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--input-bg)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {empresaForm.logo_url ? <img src={empresaForm.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>Sem Logo</span>}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem' }}>Logomarca da Empresa</label>
                        <label style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)', fontSize: '0.8rem', width: 'fit-content', color: 'var(--text-muted)' }}>
                          🖼 Selecionar Arquivo...
                          <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                  </div>
                  
                  <div className="form-group-flat">
                    <label>Nome Fantasia</label>
                    <input type="text" value={empresaForm.nome_fantasia || ''} onChange={e => setEmpresaForm({...empresaForm, nome_fantasia: e.target.value})} />
                  </div>
                  <div className="form-group-flat">
                    <label>CNPJ</label>
                    <input type="text" value={empresaForm.cnpj || ''} onChange={e => setEmpresaForm({...empresaForm, cnpj: e.target.value})} />
                  </div>
                  <div className="form-group-flat">
                    <label>Telefone / WhatsApp</label>
                    <input type="text" value={empresaForm.telefone || ''} onChange={e => setEmpresaForm({...empresaForm, telefone: maskPhone(e.target.value)})} placeholder="(XX) 90000-0000" />
                  </div>
                  <div className="form-group-flat full">
                    <label>Endereço Completo</label>
                    <input type="text" value={empresaForm.endereco || ''} onChange={e => setEmpresaForm({...empresaForm, endereco: e.target.value})} />
                  </div>
                </div>
                <button className="btn-save" onClick={handleSaveEmpresa} style={{ backgroundColor: isSaved ? '#10b981' : 'var(--primary-color)', transition: 'background-color 0.3s' }}>
                  {isSaved ? '✓ Salvo com Sucesso' : 'Salvar Alterações'}
                </button>

                <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.1)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                         <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>Alertas e Notificações (Beta)</h4>
                         <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Receba alertas de novos agendamentos e cancelamentos diretamente no seu dispositivo.
                         </p>
                      </div>
                      <button 
                        onClick={handleTogglePush} 
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          background: pushEnabled ? '#ef4444' : 'var(--primary-color)', 
                          color: '#fff', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          minWidth: '140px'
                        }}
                      >
                         {pushEnabled ? 'Desativar Push' : 'Ativar no Dispositivo'}
                      </button>
                   </div>
                </div>
              </div>
            ) : tab === 'isis' ? (
              <div className="tab-pane-isis">
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--input-bg)', border: '3px solid var(--primary-color)', padding: '4px', marginBottom: '16px', boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)' }}>
                       <img src="/isisneutraperfil.png" alt="Avatar Ísis" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    </div>
                    <h3 style={{ margin: 0 }}>Personalização da Assistente</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '8px 0 0 0' }}>
                      Configure como a Ísis se apresenta para seus clientes no chat de agendamento.
                    </p>
                 </div>

                 <div className="form-grid">
                    <div className="form-group-flat full">
                       <label>Nome de Exibição da Assistente</label>
                       <input 
                         type="text" 
                         value={empresaForm.nome_exibicao || ''} 
                         onChange={e => setEmpresaForm({...empresaForm, nome_exibicao: e.target.value})} 
                         placeholder="Ex: Ísis Agendamento"
                       />
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                         ⚠️ Este é o nome que aparece no cabeçalho do chat e nas mensagens automáticas.
                       </span>
                    </div>

                    <div className="form-group-flat full" style={{ marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary-color)', fontSize: '1rem' }}>Regra de Cancelamento</h4>
                        <label>Quanto tempo antes o cliente pode cancelar? (Horas)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                           <input 
                             type="number" 
                             min="0" 
                             value={configAgenda?.antecedencia_cancelamento_horas ?? 2} 
                             onChange={e => setConfigAgenda({ ...configAgenda, antecedencia_cancelamento_horas: Number(e.target.value) })} 
                             style={{ width: '80px', padding: '8px', borderRadius: '6px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }}
                           />
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>horas de antecedência.</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                           Se faltar menos que este tempo, a Ísis não permitirá o cancelamento automático e pedirá para o cliente ligar.
                        </p>
                    </div>
                 </div>

                 <button className="btn-save" onClick={() => { handleSaveEmpresa(); handleSaveAgenda(); }} style={{ marginTop: '24px', backgroundColor: isSaved || isAgendaSaved ? '#10b981' : 'var(--primary-color)', transition: 'background-color 0.3s' }}>
                   {isSaved || isAgendaSaved ? '✓ Configurações Salvas' : 'Salvar Configurações da Ísis'}
                 </button>
              </div>
            ) : tab === 'usuarios' ? (
              <div className="tab-pane-usuarios">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Gerenciar Profissionais</h3>
                  {!editingUser && (
                    <button className="btn-add-user" onClick={onAddUserClick}>
                      + Adicionar Profissional
                    </button>
                  )}
                </div>

                {editingUser && (
                  <form onSubmit={handleSaveUser} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--primary-color)' }}>
                      {editingUser.codigo === 'novo' ? 'Novo Cadastro de Acesso' : `Editando ${editingUser.nome}`}
                    </h4>
                    <div className="form-grid">
                      <div className="form-group-flat">
                        <label>Nome Completo</label>
                        <input type="text" value={editingUser.nome} onChange={e => setEditingUser({...editingUser, nome: e.target.value})} required />
                      </div>
                      <div className="form-group-flat">
                        <label>E-mail de Login</label>
                        <input type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} required />
                      </div>
                      <div className="form-group-flat">
                        <label>{editingUser.codigo === 'novo' ? 'Senha de Acesso Mestra' : 'Nova Senha (deixe em branco para manter)'}</label>
                        <input type="password" value={editingUser.senhaText} onChange={e => setEditingUser({...editingUser, senhaText: e.target.value})} required={editingUser.codigo === 'novo'} placeholder="***" minLength={6} />
                      </div>

                      <div className="form-group-flat">
                        <label>Comissão do Profissional (%)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <input 
                             type="number" 
                             min="0" max="100" step="1"
                             value={editingUser.permissoes?.comissao ?? 100} 
                             onChange={e => setEditingUser({...editingUser, permissoes: { ...editingUser.permissoes, comissao: Number(e.target.value) }})} 
                             required 
                             disabled={!user.is_admin}
                             style={{ flex: 1 }}
                           />
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Ex: 70% significa que ele ganha 70% do valor do serviço.</span>
                      </div>
                      

                      <div className="form-group-flat" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                        <input 
                          type="checkbox" 
                          id="isActiveCheck" 
                          checked={editingUser.ativo} 
                          onChange={e => setEditingUser({...editingUser, ativo: e.target.checked})} 
                          disabled={editingUser.codigo === user.codigo} /* O próprio user não pode se desativar */
                          style={{ width: '18px', height: '18px', cursor: editingUser.codigo === user.codigo ? 'not-allowed' : 'pointer' }} 
                        />
                        <label htmlFor="isActiveCheck" style={{ cursor: editingUser.codigo === user.codigo ? 'not-allowed' : 'pointer', color: editingUser.codigo === user.codigo ? 'gray' : '#fff' }}>
                          Usuário Ativo no Sistema
                        </label>
                      </div>

                      <div className="form-group-flat full" style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '16px', gridColumn: '1 / -1' }}>
                         <label style={{ color: 'var(--primary-color)', fontSize: '0.9rem', marginBottom: '16px', display: 'block', fontWeight: 600 }}>Permissões de Acesso</label>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                               <input 
                                 type="checkbox" 
                                 id="isAdminCheck" 
                                 checked={editingUser.is_admin} 
                                 onChange={e => setEditingUser({...editingUser, is_admin: e.target.checked})} 
                                 disabled={!user.is_admin}
                                 style={{ width: '18px', height: '18px', cursor: !user.is_admin ? 'not-allowed' : 'pointer' }} 
                               />
                               <label htmlFor="isAdminCheck" style={{ cursor: !user.is_admin ? 'not-allowed' : 'pointer', color: !user.is_admin ? 'gray' : '#fff', fontWeight: 500 }}>Permissão de Administrador (Acesso Total)</label>
                            </div>
                            
                            {!editingUser.is_admin && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '28px', borderLeft: '2px solid rgba(14, 165, 233, 0.2)', marginTop: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <input 
                                     type="checkbox" 
                                     id="permFora" 
                                     checked={editingUser.permissoes?.permitir_fora_horario} 
                                     onChange={e => setEditingUser({...editingUser, permissoes: { ...editingUser.permissoes, permitir_fora_horario: e.target.checked }})} 
                                     disabled={!user.is_admin}
                                     style={{ width: '16px', height: '16px', cursor: !user.is_admin ? 'not-allowed' : 'pointer' }} 
                                   />
                                   <label htmlFor="permFora" style={{ cursor: !user.is_admin ? 'not-allowed' : 'pointer', fontSize: '0.9rem', color: !user.is_admin ? 'gray' : '#fff' }}>Permitir agendar fora do horário de funcionamento</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <input 
                                     type="checkbox" 
                                     id="permAlmoco" 
                                     checked={editingUser.permissoes?.permitir_no_almoco} 
                                     onChange={e => setEditingUser({...editingUser, permissoes: { ...editingUser.permissoes, permitir_no_almoco: e.target.checked }})} 
                                     disabled={!user.is_admin}
                                     style={{ width: '16px', height: '16px', cursor: !user.is_admin ? 'not-allowed' : 'pointer' }} 
                                   />
                                   <label htmlFor="permAlmoco" style={{ cursor: !user.is_admin ? 'not-allowed' : 'pointer', fontSize: '0.9rem', color: !user.is_admin ? 'gray' : '#fff' }}>Permitir agendar dentro do horário de almoço</label>
                                </div>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                    <div className="user-form-actions" style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button type="submit" className="btn-save" style={{ margin: 0 }}>Salvar Perfil</button>
                      <button type="button" className="btn-save" style={{ margin: 0, background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => { setEditingUser(null); setHasAuthSession(false); }}>Cancelar</button>
                    </div>
                  </form>
                )}

                {!editingUser && (
                  <>
                    <div className="hide-on-mobile" style={{ overflowX: 'auto', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                      <table className="users-table" style={{ margin: 0, border: 'none' }}>
                        <thead><tr><th style={{ width: '60px' }}>Cód</th><th>Nome</th><th>Email</th><th style={{ width: '100px' }}>Acesso</th><th style={{ width: '100px' }}>Status</th><th style={{ width: '100px' }}>Ações</th></tr></thead>
                        <tbody>
                          {usuarios.map(u => (
                            <tr key={u.codigo}>
                              <td style={{ color:'var(--text-muted)' }}>{u.codigo.toString().padStart(2, '0')}</td>
                              <td><strong>{u.nome}</strong></td>
                              <td>{u.email}</td>
                              <td><span className={`badge ${u.is_admin ? 'badge-admin' : 'badge-user'}`}>{u.is_admin ? 'Admin' : 'Comum'}</span></td>
                              <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', color: u.ativo ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                                {u.ativo ? 'Ativo' : 'Inativo'}
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                {(user.is_admin || Number(u.codigo) === Number(user.codigo)) && (
                                  <button 
                                    className="btn-edit-user" 
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }} 
                                    onClick={() => onEditUserClick(u)} 
                                    title="Editar Perfil"
                                  >
                                    <IEdit /> Editar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="show-on-mobile users-list">
                      {usuarios.map(u => (
                        <div key={u.codigo} className="user-card-item">
                          <div className="user-info-row" style={{ alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ fontSize: '1.2rem', color: '#fff' }}>
                                {u.nome} {u.codigo === user.codigo && <span style={{fontSize:'0.75rem', opacity:0.6}}>(Você)</span>}
                              </strong>
                               <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>ID: {u.codigo.toString().padStart(2, '0')}</span>
                            </div>
                            {(user.is_admin || Number(u.codigo) === Number(user.codigo)) && (
                              <button className="btn-edit-user" onClick={() => onEditUserClick(u)} title="Editar Perfil">
                                <IEdit /> <span>Editar</span>
                              </button>
                            )}
                          </div>
                          <div className="user-info-row email-row" style={{ marginTop: '8px' }}>
                            {u.email}
                          </div>
                          <div className="user-info-row details-row">
                            <span className={`badge ${u.is_admin ? 'badge-admin' : 'badge-user'}`}>
                               {u.is_admin ? 'Administrador' : 'Comum'}
                             </span>
                             <span className="status-indicator" style={{ color: u.ativo ? '#10b981' : '#ef4444' }}>
                               {u.ativo ? 'Ativo' : 'Inativo'}
                             </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="tab-pane-agenda">
                <h3>Grade e Horários de Trabalho</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.95rem' }}>Defina o <strong>expediente comercial</strong> para a Inteligência Artificial (Isis). A Ísis usará essas restrições para bloquear ou permitir marcações de clientes.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {configAgenda?.horarios?.map((h: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '16px', flexWrap: 'wrap' }}>
                       <div className="checkbox-wrapper">
                         <input type="checkbox" className="custom-chk-input" id={`chk-${i}`} checked={h.aberto} onChange={e => updateHorario(i, 'aberto', e.target.checked)} />
                         <label htmlFor={`chk-${i}`} className="custom-chk-label">{h.nome}</label>
                       </div>
                      {h.aberto ? (
                        <div className="time-select-group">
                          <input type="time" value={h.inicio || '08:00'} onChange={e => updateHorario(i, 'inicio', e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }} />
                          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>até as</span>
                          <input type="time" value={h.fim || '18:00'} onChange={e => updateHorario(i, 'fim', e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }} />
                          
                          <div className="almoco-wrapper">
                             <input type="checkbox" id={`alm-${i}`} checked={h.almoco_ativo} onChange={e => updateHorario(i, 'almoco_ativo', e.target.checked)} style={{ cursor: 'pointer' }} />
                             <label htmlFor={`alm-${i}`} style={{ fontSize: '0.8rem', color: h.almoco_ativo ? 'var(--primary-color)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Possui Almoço?</label>
                             {h.almoco_ativo && (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <input type="time" value={h.almoco_inicio || '12:00'} onChange={e => updateHorario(i, 'almoco_inicio', e.target.value)} style={{ padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }} />
                                 <span style={{ fontSize: '0.7rem' }}>-</span>
                                 <input type="time" value={h.almoco_fim || '13:00'} onChange={e => updateHorario(i, 'almoco_fim', e.target.value)} style={{ padding: '2px 4px', fontSize: '0.8rem', borderRadius: '4px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)' }} />
                               </div>
                             )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: '0.9rem', fontStyle: 'italic', marginLeft: '12px' }}>🔒 Fechado esse dia</span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                   <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary-color)', fontSize: '1rem' }}>Preferências de Usabilidade</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ao clicar num agendamento na grade:</label>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="clique_acao" 
                              value="editar" 
                              checked={configAgenda?.clique_acao === 'editar'} 
                              onChange={e => setConfigAgenda({ ...configAgenda, clique_acao: e.target.value })} 
                            />
                            <span style={{ fontSize: '0.95rem' }}>Edição Direta</span>
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="clique_acao" 
                              value="visualizar" 
                              checked={configAgenda?.clique_acao === 'visualizar'} 
                              onChange={e => setConfigAgenda({ ...configAgenda, clique_acao: e.target.value })} 
                            />
                            <span style={{ fontSize: '0.95rem' }}>Apenas Visualizar</span>
                         </label>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        * O modo de visualização é recomendado para evitar alterações acidentais ao consultar dados.
                      </p>
                   </div>
 
                 </div>

                <button className="btn-save" onClick={handleSaveAgenda} style={{ marginTop: '32px', backgroundColor: isAgendaSaved ? '#10b981' : 'var(--primary-color)', transition: 'background-color 0.3s' }}>
                  {isAgendaSaved ? '✓ Grade de Horários Salva!' : 'Salvar Grades de Horário da Agenda'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {authAction && (
        <div className="modal-overlay" onClick={() => setAuthAction(null)} style={{ zIndex: 9999 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ display:'flex', alignItems:'center', gap:'8px', color: 'var(--text-main)', marginBottom: '4px' }}>Acesso Restrito</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Digite a senha de um administrador para gerenciar a equipe.
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
