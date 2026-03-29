import fs from 'fs';
const path = 'src/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Limpa o filtro (remove o '&& true' que sobrou da tentativa anterior)
content = content.replace(/ && true;\s+}\)\.sort\(/, ');\n                     }).sort(');

// 2. Substitui o cabeçalho do modal
const oldHeaderStart = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>`;
const oldHeaderEnd = `</div>`;

const startIndex = content.indexOf(oldHeaderStart);
if (startIndex !== -1) {
    const nextCloseDiv = content.indexOf(oldHeaderEnd, startIndex);
    const fullHeaderBlock = content.substring(startIndex, nextCloseDiv + oldHeaderEnd.length);
    
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
               </div>`;
               
    content = content.replace(fullHeaderBlock, newHeader);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete!');
