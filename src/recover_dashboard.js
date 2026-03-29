import fs from 'fs';
const path = 'src/Dashboard.tsx';
let c = fs.readFileSync(path, 'utf8');

// O bloco quebrado termina em alignItems: 'center', seguido de um ");" solto
const anchorRegex = /alignItems: 'center', \s+\);/;

const replacement = `alignItems: 'center', 
                                       gap: '4px',
                                       background: 'rgba(14, 165, 233, 0.1)',
                                       padding: '2px 6px',
                                       borderRadius: '4px'
                                     }}>
                                       ✨ Ísis
                                     </span>
                                   )}
                                </div>
                            </div>
                            <button className="btn-sec" style={{ margin: 0, padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => { setIsAgendamentosListOpen(false); openEditAgendamento(ag); }}>Detalhes</button>
                         </div>
                       );`;

if (anchorRegex.test(c)) {
    c = c.replace(anchorRegex, replacement);
    fs.writeFileSync(path, c, 'utf8');
    console.log('Recovery complete!');
} else {
    console.log('Anchor not found for recovery!');
}
