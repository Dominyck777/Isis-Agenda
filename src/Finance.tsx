
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
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [originFilter, setOriginFilter] = useState<'all' | 'isis' | 'manual'>('all');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [dateFilter, customStart, customEnd]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Services first to have prices
      const { data: svcs } = await supabase
        .from('servicos')
        .select('codigo, nome, valor')
        .eq('codigo_empresa', user.codigo_empresa);
      
      if (svcs) setServicos(svcs);

      // Simple date filter logic
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('codigo_empresa', user.codigo_empresa)
        .order('data_hora_inicio', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const start = new Date(now.setHours(0,0,0,0)).toISOString();
        const end = new Date(now.setHours(23,59,59,999)).toISOString();
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
    const dicServicos = servicos.reduce((acc, s) => ({ ...acc, [s.codigo]: s.valor }), {} as any);
    
    let totalRevenue = 0;
    let completedCount = 0;
    let isisCount = 0;
    let manualCount = 0;

    agendamentos.forEach(ag => {
      if (ag.status === 'cancelado') return;

      // Filter by origin if not 'all'
      if (originFilter === 'isis' && !ag.isis_criou) return;
      if (originFilter === 'manual' && ag.isis_criou) return;

      if (ag.status === 'finalizado') {
        completedCount++;
        
        // Se já tivermos o valor_total gravado no agendamento, usamos ele (Persistência histórica)
        if (ag.valor_total !== undefined && ag.valor_total !== null) {
          totalRevenue += Number(ag.valor_total);
        } else {
          // Fallback para agendamentos antigos ou sem valor_total gravado
          let svcArray = [];
          try {
            svcArray = typeof ag.servicos_selecionados === 'string' 
              ? JSON.parse(ag.servicos_selecionados) 
              : (ag.servicos_selecionados || []);
          } catch(e) {
            svcArray = [ag.codigo_servico];
          }
  
          if (!Array.isArray(svcArray)) svcArray = [ag.codigo_servico];
  
          svcArray.forEach((sId: any) => {
            totalRevenue += Number(dicServicos[sId] || 0);
          });
        }
      }

      if (ag.isis_criou) isisCount++;
      else manualCount++; // Default to manual
    });

    const totalCount = isisCount + manualCount;
    return { totalRevenue, completedCount, isisCount, manualCount, totalCount };
  }, [agendamentos, servicos, originFilter]);

  if (loading && agendamentos.length === 0) {
    return <div className="finance-container"><p>Carregando dados financeiros...</p></div>;
  }

  return (
    <div className="finance-container">
      <div className="finance-header">
        <h1>Resumo Financeiro</h1>
        <div className="finance-filters">
          <button className={`filter-btn ${dateFilter === 'today' ? 'active' : ''}`} onClick={() => setDateFilter('today')}>Hoje</button>
          <button className={`filter-btn ${dateFilter === 'week' ? 'active' : ''}`} onClick={() => setDateFilter('week')}>7 Dias</button>
          <button className={`filter-btn ${dateFilter === 'month' ? 'active' : ''}`} onClick={() => setDateFilter('month')}>Este Mês</button>
          <button className={`filter-btn ${dateFilter === 'all' ? 'active' : ''}`} onClick={() => setDateFilter('all')}>Tudo</button>
          <button className={`filter-btn ${dateFilter === 'custom' ? 'active' : ''}`} onClick={() => setDateFilter('custom')}>Personalizado</button>
        </div>
      </div>

      <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Origem dos Agendamentos</p>
        <div className="finance-filters" style={{ display: 'flex', width: '100%', maxWidth: '400px' }}>
          <button className={`filter-btn ${originFilter === 'all' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('all')}>Geral</button>
          <button className={`filter-btn ${originFilter === 'isis' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('isis')}>Isis</button>
          <button className={`filter-btn ${originFilter === 'manual' ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }} onClick={() => setOriginFilter('manual')}>Manual</button>
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
          <span className="stat-label">Ticket Médio</span>
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
      
      <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '16px', border: '1px dashed var(--primary-color)' }}>
         <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            📊 Dica: Use o filtro de data acima para analisar o crescimento da sua clínica em diferentes períodos.
         </p>
      </div>
    </div>
  );
};

export default Finance;
