import fs from 'fs';
const path = 'src/Dashboard.tsx';
let c = fs.readFileSync(path, 'utf8');

// O bloco corrompido começa com renderMiniCalendar que foi cortado e seguido por useEffects duplicados.
// Vamos procurar a primeira ocorrência de renderMiniCalendar e a próxima ocorrência de "return (" do componente principal.

const startMark = "const renderMiniCalendar = () => {";
const endMark = "return ("; // Queremos o return do componente Dashboard, que deve estar depois dos hooks.

const firstIdx = c.indexOf(startMark);
if (firstIdx === -1) {
    console.log("Start mark not found!");
    process.exit(1);
}

// O bloco corrompido termina onde o "return (" original do Dashboard começava.
// Mas como duplicamos coisas, temos múltiplos "return (".
// Vamos tentar encontrar o "return (" que precede o header do Dashboard.

const dashboardReturnMark = "return (\n    <>\n      <style>{mobileStyles}</style>";
const returnIdx = c.indexOf(dashboardReturnMark);

if (returnIdx === -1) {
    console.log("Dashboard return mark not found!");
    // Tenta uma versão menos rígida
    const altReturnMark = "return (\n    <>\n      <style>{mobileStyles}";
    const altReturnIdx = c.indexOf(altReturnMark);
    if (altReturnIdx === -1) {
        console.log("Alternative return mark not found!");
        process.exit(1);
    }
}

const finalReturnIdx = c.indexOf(dashboardReturnMark);

const correctMiniCal = `const renderMiniCalendar = () => {
    const miniGridBlanks = Array.from({ length: getFirstDayOfMonth(currentDate) });
    const miniGridDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);

    return (
      <div className="mini-calendar" onClick={e => e.stopPropagation()}>
        <div className="mini-cal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ margin: 0 }}>{formatMonthYear(currentDate)}</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ cursor: 'pointer', padding: '0 4px' }} onClick={handlePrevMonth}>❮</span>
            <span style={{ cursor: 'pointer', padding: '0 4px' }} onClick={handleNextMonth}>❯</span>
          </div>
        </div>

        <div className="mini-grid">
          {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="mini-day-header">{d}</span>)}
          {miniGridBlanks.map((_, i) => <span key={\`blank-\${i}\`}></span>)}
          {miniGridDays.map((dNum) => {
            const thisRDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dNum);
            const isExactlyToday = thisRDate.toDateString() === new Date().toDateString();
            const isCurrentSelection = thisRDate.toDateString() === currentDate.toDateString();
            return (
              <span 
                key={dNum} 
                className={\`mini-day \${isCurrentSelection ? 'active' : ''} \${isExactlyToday ? 'mini-today' : ''}\`}
                onClick={() => { handleMiniCalClick(dNum); setShowDatePicker(false); }}
              >
                {dNum}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  `;

const newContent = c.substring(0, firstIdx) + correctMiniCal + c.substring(finalReturnIdx);
fs.writeFileSync(path, newContent, 'utf8');
console.log("File reconstructed successfully!");
