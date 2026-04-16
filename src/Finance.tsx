import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import './Finance.css';

interface FinanceProps {
  user: any;
}

const Finance: React.FC<FinanceProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'geral' | 'equipe'>(user.is_admin ? 'geral' : 'equipe');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [originFilter, setOriginFilter] = useState<'all' | 'isis' | 'manual'>('all');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProf, setSelectedProf] = useState<string>(user.is_admin ? 'none' : String(user.codigo));

  useEffect(() => {
    fetchData();
  }, [dateFilter, customStart, customEnd]);

  useEffect(() => {
    // If admin is browsing equipe and hasn't selected someone, maybe pick the first
    // Or keep 'none' and ask them to select. 
    // We will let 'none' be the initial empty state.
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Services first to have prices
      const { data: svcs } = await supabase
        .from('servicos')
        .select('codigo, nome, valor')
        .eq('codigo_empresa', user.codigo_empresa);

      if (svcs) setServicos(svcs);

      // Fetch users
      const { data: usrs } = await supabase
        .from('usuarios')
        .select('codigo, nome, permissoes')
        .eq('codigo_empresa', user.codigo_empresa)
        .eq('ativo', true);

      if (usrs) setUsuarios(usrs);

      // Simple date filter logic
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('codigo_empresa', user.codigo_empresa)
        .order('data_hora_inicio', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        query = query.gte('data_hora_inicio', start).lte('data_hora_inicio', end);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('data_hora_inicio', weekAgo);
      } else if (dateFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('data_hora_inicio', monthStart);
      } else if (dateFilter === 'custom' && customStart && customEnd) {
        query = query
          .gte('data_hora_inicio', `${customStart}T00:00:00`)
          .lte('data_hora_inicio', `${customEnd}T23:59:59`);
      }

      const { data: ags } = await query;
      if (ags) setAgendamentos(ags);
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (activeTab !== 'geral') return null;
    
    const dicServicos = servicos.reduce((acc, s) => ({ ...acc, [s.codigo]: s.valor }), {} as any);

    let totalRevenue = 0;
    let completedCount = 0;
    let isisCount = 0;
    let manualCount = 0;

    agendamentos.forEach(ag => {
      if (ag.status === 'cancelado') return;

      if (originFilter === 'isis' && !ag.isis_criou) return;
      if (originFilter === 'manual' && ag.isis_criou) return;

      if (ag.status === 'finalizado') {
        completedCount++;

        if (ag.valor_total !== undefined && ag.valor_total !== null) {
          totalRevenue += Number(ag.valor_total);
        } else {
          let svcArray = [];
          try {
            svcArray = typeof ag.servicos_selecionados === 'string'
              ? JSON.parse(ag.servicos_selecionados)
              : (ag.servicos_selecionados || []);
          } catch (e) {
            svcArray = [ag.codigo_servico];
          }

          if (!Array.isArray(svcArray)) svcArray = [ag.codigo_servico];

          svcArray.forEach((sId: any) => {
            totalRevenue += Number(dicServicos[sId] || 0);
          });
        }
      }

      if (ag.isis_criou) isisCount++;
      else manualCount++;
    });

    const totalCount = isisCount + manualCount;
    return { totalRevenue, completedCount, isisCount, manualCount, totalCount };
  }, [agendamentos, servicos, originFilter, activeTab]);

  const statsEquipe = useMemo(() => {
    if (activeTab !== 'equipe' || selectedProf === 'none') return null;

    const dicServicos = servicos.reduce((acc, s) => ({ ...acc, [s.codigo]: s.valor }), {} as any);
    
    const profAtivo = usuarios.find(u => String(u.codigo) === String(selectedProf));
    const comissaoPercent = profAtivo?.permissoes?.comissao !== undefined ? Number(profAtivo.permissoes.comissao) : 100;

    let bruto = 0;
    let atendimentosCount = 0;

    agendamentos.forEach(ag => {
      if (ag.status !== 'finalizado') return;

      let atuouAqui = false;
      let valorAgregadoAqui = 0;

      if (ag.profissionais_vinculo && Array.isArray(ag.profissionais_vinculo)) {
         ag.profissionais_vinculo.forEach((v: any) => {
            if (String(v.professionalCode) === String(selectedProf)) {
               atuouAqui = true;
               valorAgregadoAqui += Number(dicServicos[v.serviceCode] || 0);
            }
         });
      } else {
         if (String(ag.codigo_profissional) === String(selectedProf)) {
            atuouAqui = true;
            let svcArray = [];
            try {
              svcArray = typeof ag.servicos_selecionados === 'string' ? JSON.parse(ag.servicos_selecionados) : (ag.servicos_selecionados || []);
            } catch (e) {
              svcArray = [ag.codigo_servico];
            }
            if (!Array.isArray(svcArray) || svcArray.length === 0) svcArray = [ag.codigo_servico];

            svcArray.forEach((sId: any) => {
              valorAgregadoAqui += Number(dicServicos[sId] || 0);
            });
         }
      }

      if (atuouAqui) {
         atendimentosCount++;
         bruto += valorAgregadoAqui;
      }
    });

    const liquido = bruto * (comissaoPercent / 100);
    const retido = bruto - liquido;

    return { bruto, liquido, retido, atendimentosCount, comissaoPercent }
  }, [agendamentos, servicos, selectedProf, usuarios, activeTab]);

  if (loading && agendamentos.length === 0) {
    return <div className="finance-container"><p>Carregando dados financeiros...</p></div>;
  }

  return (
    <div className="finance-container">
      <div className="finance-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
          {/* Aba de Navegação Interna */}
          <div className="finance-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', maxWidth: '400px', width: '100%' }}>
            {user.is_admin && (
              <button 
                onClick={() => setActiveTab('geral')} 
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'geral' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'geral' ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.3s' }}
              >
                Geral
              </button>
            )}
            <button 
              onClick={() => setActiveTab('equipe')} 
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === 'equipe' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'equipe' ? '#fff' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.3s' }}
            >
              {user.is_admin ? 'Funcionários' : 'Meu Financeiro'}
            </button>
          </div>
          
          <div className="finance-filters" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className={`filter-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => setDateFilter('today')}>Hoje</button>
            <button className={`filter-btn ${dateFilter === 'week' ? 'active' : ''}`} onClick={() => setDateFilter('week')}>7 Dias</button>
            <button className={`filter-btn ${dateFilter === 'month' ? 'active' : ''}`} onClick={() => setDateFilter('month')}>Este Mês</button>
            <button className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => setDateFilter('all')}>Tudo</button>
            <button className={`filter-btn ${dateFilter === 'custom' ? 'active' : ''}`} onClick={() => setDateFilter('custom')}>Personalizado</button>
          </div>
        </div>
      </div>

      {dateFilter === 'custom' && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', animation: 'slideUp 0.3s ease', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Início</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '6px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fim</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', padding: '8px', borderRadius: '6px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}

      {activeTab === 'geral' && stats && (
        <>
          <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Origem dos Agendamentos</p>
            <div className="finance-filters" style={{ display: 'flex', width: '100%', maxWidth: '400px' }}>
              <button className={`filter-btn ${originFilter === 'all' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('all')}>Geral</button>
              <button className={`filter-btn ${originFilter === 'isis' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('isis')}>Isis</button>
              <button className={`filter-btn ${originFilter === 'manual' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('manual')}>Manual</button>
            </div>
          </div>

          <div className="finance-grid">
            <div className="stat-card">
              <span className="stat-label">Receita Estimada (Finalizados)</span>
              <span className="stat-value">
                {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="stat-subtext">Baseado em {stats.completedCount} atendimentos</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Total de Agendamentos</span>
              <span className="stat-value">{stats.totalCount}</span>
              <span className="stat-subtext" style={{ color: 'var(--primary-color)' }}>No período selecionado</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Valor Médio</span>
              <span className="stat-value">
                {(stats.completedCount > 0 ? stats.totalRevenue / stats.completedCount : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="stat-subtext">Por atendimento finalizado</span>
            </div>
          </div>

          <div className="origin-breakdown" style={{ maxWidth: '500px', margin: '24px auto 0' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem', textAlign: 'center' }}>Distribuição de Origem</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="origin-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div className="origin-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="origin-dot dot-isis" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }}></div>
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>Isis</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{stats.isisCount} agend.</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '12px' }}>({stats.totalCount > 0 ? Math.round((stats.isisCount / stats.totalCount) * 100) : 0}%)</span>
                </div>
              </div>

              <div className="origin-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="origin-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="origin-dot dot-manual" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }}></div>
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>Manual</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{stats.manualCount} agend.</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '12px' }}>({stats.totalCount > 0 ? Math.round((stats.manualCount / stats.totalCount) * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'equipe' && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
           {user.is_admin ? (
             <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Selecione um funcionário:</p>
                <select 
                   value={selectedProf} 
                   onChange={(e) => setSelectedProf(e.target.value)}
                   style={{ padding: '12px', borderRadius: '8px', background: 'var(--input-bg)', color: '#fff', border: '1px solid var(--border-color)', outline: 'none', width: '100%', maxWidth: '300px', fontSize: '1rem' }}
                >
                   <option value="none" disabled>-- Escolha na lista --</option>
                   {usuarios.map(u => (
                      <option key={u.codigo} value={String(u.codigo)}>{u.nome}</option>
                   ))}
                </select>
             </div>
           ) : (
             <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Suas métricas financeiras</p>
             </div>
           )}

           {selectedProf !== 'none' && statsEquipe ? (
             <div className="finance-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="stat-card" style={{ borderTop: '4px solid #10b981' }}>
                  <span className="stat-label">Comissão (Seus Ganhos)</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>
                    {statsEquipe.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="stat-subtext">Isento de taxas ({statsEquipe.comissaoPercent}%)</span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Valor Bruto Gerado</span>
                  <span className="stat-value">
                    {statsEquipe.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="stat-subtext">Soma dos serviços prestados</span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Taxa da Empresa</span>
                  <span className="stat-value" style={{ color: '#ef4444' }}>
                    {statsEquipe.retido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="stat-subtext">Valor retido pelo estabelecimento</span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Atendimentos Participados</span>
                  <span className="stat-value">{statsEquipe.atendimentosCount}</span>
                  <span className="stat-subtext" style={{ color: 'var(--primary-color)' }}>No período selecionado</span>
                </div>
             </div>
           ) : user.is_admin ? (
             <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                Selecione um profissional acima para visualizar seu relatório.
             </div>
           ) : null}
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '16px', border: '1px dashed var(--primary-color)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Dica: Use o filtro de data acima para analisar os ganhos em diferentes períodos. Os cálculos dependem do status "Finalizado" nos agendamentos.
        </p>
      </div>
    </div>
  );
};

export default Finance;
