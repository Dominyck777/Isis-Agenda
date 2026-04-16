import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import CryptoJS from 'crypto-js';

const DeveloperTools: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        codigo: 1000,
        codigo_seq: 1,
        nome_exibicao: '',
        nome_fantasia: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        logo_url: '',
        codigodev: 'ISIS-0001',
        link: ''
    });

    const [adminData, setAdminData] = useState({
        codigo: 1,
        nome: '',
        email: '',
        senhaFixa: '123456',
        is_admin: true,
        ativo: true,
        permissoes: '{"permitir_no_almoco": false, "permitir_fora_horario": false}'
    });

    const [agendaData, setAgendaData] = useState({
        codigo: 1,
        clique_acao: 'visualizar',
        antecedencia: 1,
        horarios: [
            {dia: 0, fim: "12:00", nome: "Domingo", aberto: false, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: false, almoco_inicio: "12:00"},
            {dia: 1, fim: "22:00", nome: "Segunda-feira", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"},
            {dia: 2, fim: "22:00", nome: "Terça-feira", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"},
            {dia: 3, fim: "22:00", nome: "Quarta-feira", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"},
            {dia: 4, fim: "22:00", nome: "Quinta-feira", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"},
            {dia: 5, fim: "22:00", nome: "Sexta-feira", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"},
            {dia: 6, fim: "23:00", nome: "Sábado", aberto: true, inicio: "08:00", almoco_fim: "13:00", almoco_ativo: true, almoco_inicio: "12:00"}
        ]
    });

    const [output, setOutput] = useState('');
    const [copyStatus, setCopyStatus] = useState(false);

    useEffect(() => {
        fetchLastCompanyAndUser();
    }, []);

    const fetchLastCompanyAndUser = async () => {
        setLoading(true);
        try {
            // Fetch Last Company
            const { data: lastEmp, error: empError } = await supabase
                .from('empresas')
                .select('*')
                .order('codigo', { ascending: false })
                .limit(1)
                .single();

            if (lastEmp && !empError) {
                let nextCodeDev = 'ISIS-0001';
                const match = lastEmp.codigodev?.match(/ISIS-(\d+)/);
                if (match) {
                    const nextNum = parseInt(match[1]) + 1;
                    nextCodeDev = `ISIS-${String(nextNum).padStart(4, '0')}`;
                }

                setFormData(prev => ({
                    ...prev,
                    codigo: (lastEmp.codigo || 1000) + 1,
                    codigo_seq: (lastEmp.codigo_seq || 1) + 1,
                    codigodev: nextCodeDev
                }));
            }

            // Fetch Last User (Complete record for pattern matching)
            const { data: lastUser, error: userError } = await supabase
                .from('usuarios')
                .select('*')
                .order('codigo', { ascending: false })
                .limit(1)
                .single();

            if (lastUser && !userError) {
                // Se o banco retornar como objeto, transformamos em string para o formulário
                const permissionsStr = typeof lastUser.permissoes === 'object' 
                    ? JSON.stringify(lastUser.permissoes) 
                    : lastUser.permissoes;

                setAdminData(prev => ({
                   ...prev,
                   codigo: (lastUser.codigo || 0) + 1,
                   permissoes: permissionsStr || prev.permissoes
                }));
            }

            // Fetch Last Agenda Config
            const { data: lastCfg, error: cfgError } = await supabase
                .from('configuracoes_agenda')
                .select('codigo')
                .order('codigo', { ascending: false })
                .limit(1)
                .single();
            
            if (lastCfg && !cfgError) {
                setAgendaData(prev => ({ ...prev, codigo: (lastCfg.codigo || 0) + 1 }));
            }

        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    // Sugestão inteligente: Quando o email da empresa muda, sugere o mesmo para o admin
    useEffect(() => {
        if (formData.email && !adminData.email) {
            setAdminData(prev => ({ ...prev, email: formData.email }));
        }
    }, [formData.email]);

    // Sugestão inteligente: Quando o nome da empresa muda, sugere para o admin
    useEffect(() => {
        if (formData.nome_exibicao && !adminData.nome) {
            setAdminData(prev => ({ ...prev, nome: `Admin ${formData.nome_exibicao}` }));
        }
    }, [formData.nome_exibicao]);

    const hashPassword = (password: string) => {
        return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
    };

    const generateSQL = () => {
        const passwordHash = hashPassword(adminData.senhaFixa);

        const companySQL = `INSERT INTO public.empresas (
    codigo, nome_exibicao, nome_fantasia, cnpj, telefone, 
    email, endereco, logo_url, link
) VALUES (
    ${formData.codigo}, '${formData.nome_exibicao}', '${formData.nome_fantasia}', '${formData.cnpj}', '${formData.telefone}', 
    '${formData.email}', '${formData.endereco}', '${formData.logo_url}', '${formData.link}'
);`;

        const userSQL = `INSERT INTO public.usuarios (
    codigo, ativo, nome, email, senha, codigo_empresa, is_admin, permissoes
) VALUES (
    ${adminData.codigo}, ${adminData.ativo}, '${adminData.nome}', '${adminData.email}', '${passwordHash}', ${formData.codigo}, ${adminData.is_admin}, '${adminData.permissoes}'
);`;

        const agendaSQL = `INSERT INTO public.configuracoes_agenda (
    codigo, codigo_empresa, horarios, clique_acao, antecedencia_cancelamento_horas
) VALUES (
    ${agendaData.codigo}, ${formData.codigo}, '${JSON.stringify(agendaData.horarios)}', '${agendaData.clique_acao}', ${agendaData.antecedencia}
);`;

        setOutput(`BEGIN;

-- 1. CADASTRAR EMPRESA
${companySQL}

-- 2. CADASTRAR ADMIN (VINCULADO À EMPRESA ACIMA)
${userSQL}

-- 3. CONFIGURAR AGENDA
${agendaSQL}

COMMIT;`);
    };

    const copyToClipboard = () => {
        if (!output) return;
        navigator.clipboard.writeText(output).then(() => {
            setCopyStatus(true);
            setTimeout(() => setCopyStatus(false), 3000);
        });
    };

    if (loading && formData.nome_exibicao === '') {
        return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Carregando dados do banco...</div>;
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#0f172a', 
            color: '#f1f5f9', 
            padding: '40px',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            <div style={{ 
                maxWidth: '900px', 
                margin: '0 auto', 
                background: '#1e293b', 
                padding: '32px', 
                borderRadius: '16px',
                border: '1px solid #334155',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
            }}>
                <h2 style={{ margin: '0 0 10px 0', color: '#0ea5e9' }}>Gerador de Empresa & Admin (Dev Only)</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '32px' }}>
                    Esta ferramenta cria simultaneamente o SQL da empresa e de seu primeiro administrador.
                </p>

                {/* SEÇÃO EMPRESA */}
                <h3 style={sectionHeaderStyle}>1. Dados da Empresa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>CÓDIGO EMPRESA</label>
                        <input type="number" style={inputStyle} value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: parseInt(e.target.value)})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>NOME EXIBIÇÃO</label>
                        <input style={inputStyle} placeholder="Ex: Hair Style" value={formData.nome_exibicao} onChange={(e) => setFormData({...formData, nome_exibicao: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>NOME FANTASIA</label>
                        <input style={inputStyle} placeholder="Ex: Hair Style Beauty" value={formData.nome_fantasia} onChange={(e) => setFormData({...formData, nome_fantasia: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>LINK SLUG</label>
                        <input style={inputStyle} placeholder="ex: hair-style" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value.toLowerCase().replace(/\s/g, '-')})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>CNPJ</label>
                        <input style={inputStyle} value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>TELEFONE</label>
                        <input style={inputStyle} value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>E-MAIL EMPRESA</label>
                        <input style={inputStyle} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>CODIGODEV (AUTO)</label>
                        <input style={{ ...inputStyle, opacity: 0.5 }} value={formData.codigodev} readOnly />
                    </div>
                    <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
                        <label style={labelStyle}>LOGO URL / BASE64</label>
                        <textarea style={{ ...inputStyle, minHeight: '60px' }} value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} />
                    </div>
                </div>

                {/* SEÇÃO ADMIN */}
                <h3 style={sectionHeaderStyle}>2. Primeiro Administrador</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>CÓDIGO USUÁRIO (AUTO-GERADO)</label>
                        <input 
                            type="number" 
                            style={{ ...inputStyle, opacity: 0.5 }} 
                            value={adminData.codigo} 
                            readOnly 
                        />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>NOME DO ADMIN</label>
                        <input style={inputStyle} placeholder="Nome Completo" value={adminData.nome} onChange={(e) => setAdminData({...adminData, nome: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>E-MAIL ACESSO</label>
                        <input style={inputStyle} placeholder="email@exemplo.com" value={adminData.email} onChange={(e) => setAdminData({...adminData, email: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>SENHA (TEXTO PLANO)</label>
                        <input style={inputStyle} value={adminData.senhaFixa} onChange={(e) => setAdminData({...adminData, senhaFixa: e.target.value})} />
                    </div>
                </div>

                {/* SEÇÃO AGENDA */}
                <h3 style={sectionHeaderStyle}>3. Configuração da Agenda (Padrão)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>CÓDIGO CONFIG (AUTO-GERADO)</label>
                        <input type="number" style={{ ...inputStyle, opacity: 0.5 }} value={agendaData.codigo} readOnly />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>AÇÃO AO CLICAR</label>
                        <select style={inputStyle} value={agendaData.clique_acao} onChange={(e) => setAgendaData({...agendaData, clique_acao: e.target.value})}>
                            <option value="visualizar">Visualizar</option>
                            <option value="editar">Editar</option>
                        </select>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>ANTECEDÊNCIA CANCELAMENTO (HORAS)</label>
                        <input type="number" style={inputStyle} value={agendaData.antecedencia} onChange={(e) => setAgendaData({...agendaData, antecedencia: parseInt(e.target.value)})} />
                    </div>
                </div>

                <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                    <button onClick={generateSQL} style={btnPriStyle}>GERAR SQL COMPLETO</button>
                    <button onClick={copyToClipboard} style={btnSecStyle}>COPIAR TUDO</button>
                </div>

                {output && (
                    <div style={{ 
                        marginTop: '32px', 
                        background: '#000', 
                        padding: '20px', 
                        borderRadius: '8px', 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #0ea5e9',
                        color: '#38bdf8'
                    }}>
                        {output}
                    </div>
                )}

                {copyStatus && (
                    <div style={{ textAlign: 'center', color: '#10b981', marginTop: '12px', fontSize: '0.85rem' }}>
                        Tudo copiado com sucesso!
                    </div>
                )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '0.8rem' }}>
               A senha será salva como Hash SHA-256 no banco.
            </div>
        </div>
    );
};

const sectionHeaderStyle = {
    color: '#38bdf8',
    fontSize: '1.1rem',
    borderBottom: '1px solid #334155',
    paddingBottom: '8px',
    marginBottom: '20px'
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 };
const inputStyle = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '12px', borderRadius: '8px', outline: 'none' };
const btnPriStyle = { flex: 1, background: '#0ea5e9', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' };
const btnSecStyle = { flex: 1, background: '#475569', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' };

export default DeveloperTools;
