import fs from 'fs';
const path = 'src/IsisChat.tsx';
let content = fs.readFileSync(path, 'utf8');

// Buscamos o bloco que acabamos de inserir
const anchor = "// --- VERIFICAÇÃO DE CONFLITO DE ÚLTIMA MILHA ---";
const endAnchor = "// ----------------------------------------------";

const revisedCheck = `      // --- VERIFICAÇÃO DE CONFLITO DE ÚLTIMA MILHA ---
      for (const sel of selections) {
         const st = new Date(\`\${date}T\${sel.timeSlot}:00\`).toISOString();
         const en = new Date(new Date(\`\${date}T\${sel.timeSlot}:00\`).getTime() + (sel.service.duracao_minutos || 30) * 60000).toISOString();
         
         let query = supabase.from('agendamentos')
            .select('id')
            .eq('codigo_empresa', empresa.codigo)
            .eq('codigo_profissional', sel.professional.codigo)
            .not('status', 'eq', 'cancelado')
            .lt('data_hora_inicio', en) 
            .gt('data_hora_fim', st);

         // IMPORTANTE: Se estiver editando, ignorar o ID que já pertence a este agendamento
         const currentEditingAg = editingAg || editingAgRef.current;
         if (currentEditingAg?.id) {
            query = query.not('id', 'eq', currentEditingAg.id);
         }

         const { data: conflicts } = await query.limit(1);

         if (conflicts && conflicts.length > 0) {
            setIsTyping(false);
            setMessages(prev => [...prev, {
               id: Date.now(),
               sender: 'isis',
               time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
               text: (<>Ops! Alguém acabou de pegar o seu horário das <strong>{sel.timeSlot}</strong>. 😰<br /><br />Para evitar conflitos, precisamos que você escolha um novo horário disponível.</>),
               actions: (
                  <div className="action-buttons-grid">
                     <button className="chat-action-btn pri" type="button" onClick={() => { clearLastIsisActions(); showServiceWidgetForDate(date); }}>📅 Escolher outro horário</button>
                     <button className="chat-action-btn menu-btn" type="button" onClick={() => { clearLastIsisActions(); showMenu(); }}>🏠 Voltar ao Menu</button>
                  </div>
               )
            }]);
            setTimeout(() => scrollToBottom('smooth'), 100);
            return; 
         }
      }
      // ----------------------------------------------`;

if (content.includes(anchor)) {
    const parts = content.split(anchor);
    const endParts = parts[1].split(endAnchor);
    const newContent = parts[0] + revisedCheck + endParts[1];
    fs.writeFileSync(path, newContent);
    console.log('Sucesso: Verificação de conflito aprimorada para múltiplos serviços e edições!');
} else {
    console.log('Erro: Âncora não encontrada.');
}
