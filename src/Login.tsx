import { useState } from "react";
import { supabase } from "./lib/supabase";
import CryptoJS from "crypto-js";
import { toast } from './Toast';
import "./Login.css";

// Função auxiliar para criptografar a senha no front-end
function hashPassword(password: string) {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

export default function Login({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hashedPassword = hashPassword(password);
      
      // 1. Consulta o usuário e verifica a senha (hash)
      const { data: usuarios, error: supError } = await supabase
        .from('usuarios')
        .select(`
          *,
          empresas (
            nome_exibicao,
            logo_url
          )
        `)
        .eq('email', email)
        .eq('senha', hashedPassword);

      if (supError || !usuarios || usuarios.length === 0) {
        toast('E-mail ou senha incorretos.', 'error');
        setLoading(false);
        return;
      }

      const data = usuarios[0];
      
      // 2. Verifica se está ativo
      if (!data.ativo) {
        toast('Sua conta está inativa. Contate o suporte.', 'error');
        setLoading(false);
        return;
      }

      // 3. Login bem-sucedido
      localStorage.setItem('isis_user', JSON.stringify(data));
      toast(`Bem-vindo(a), ${data.nome}!`, 'success');
      if (onSuccess) onSuccess();
      
    } catch (err) {
      console.error('Erro de autenticação:', err);
      toast('Ocorreu um erro ao conectar ao servidor. Verifique a internet.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="isis-avatar-container">
             <img src="/isiscomprimentoperfil.png" alt="Assistente Ísis" className="isis-avatar" />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 600, margin: '16px 0 8px', textAlign: 'center' }}>Ísis Agenda</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>Bem-vindo(a) de volta! Acesse sua conta.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input 
              className="form-input"
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@salao.com"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-input-wrapper">
              <input 
                className="form-input"
                type={showPassword ? "text" : "password"} 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required 
              />
              <button 
                type="button" 
                className="eye-icon-btn" 
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
            <a href="#" style={{ alignSelf: 'flex-end', fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none', marginTop: '6px' }}>Esqueceu a senha?</a>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Uma solução fluxo7team</p>
          <p>Todos os direitos reservados © 2026</p>
        </div>
      </div>
    </div>
  );
}
