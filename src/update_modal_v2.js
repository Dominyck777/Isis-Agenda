import fs from 'fs';
const path = 'src/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Conserta o cabeçalho e aninhamento do modal
const brokenBlockStart = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>`;
const listContainerStart = `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>`;

const startIndex = content.indexOf(brokenBlockStart);
const listIndex = content.indexOf(listContainerStart, startIndex);

if (startIndex !== -1 && listIndex !== -1) {
    // Pegamos tudo desde o início do novo cabeçalho até o início do container da lista
    const oldSection = content.substring(startIndex, listIndex);
    
    const newHeader = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="nav-arrows" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, -1))} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>❮</button>
                      <button className="icon-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>❯</button>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.1rem' }}>Agendamentos do Dia</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn-today hide-on-mobile" onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 12px', fontSize: '0.8rem', margin: 0 }}>Hoje</button>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }} onClick={() => setIsAgendamentosListOpen(false)}>✕</button>
                  </div>
               </div>\n               `;
               
    content = content.replace(oldSection, newHeader);
}

// 2. Conserta ícones e termos quebrados (Encoding)
content = content.replace(/âœ¨ Ã sis/g, '✨ Ísis');
content = content.replace(/Ã s/g, 'às');
content = content.replace(/ServiÃ§o/g, 'Serviço');
content = content.replace(/ðŸ‘¤/g, '👤');
content = content.replace(/âœ•/g, '✕');

fs.writeFileSync(path, content, 'utf8');
console.log('Daily Modal Fixed!');
