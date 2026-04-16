import fs from 'fs';
const content = fs.readFileSync('src/IsisChat.tsx', 'utf8');

const anchor = "📞 **{empresa.telefone || 'Telefone não disponível'}**";
const closeTag = "}]);";

const index = content.indexOf(anchor);
if (index !== -1) {
    const nextClose = content.indexOf(closeTag, index);
    if (nextClose !== -1) {
        const insertPos = nextClose + closeTag.length;
        const newContent = content.slice(0, insertPos) + 
            "\n            \n            setTimeout(() => {\n               showMenu('Como posso te ajudar agora? ✨');\n            }, 4500);" + 
            content.slice(insertPos);
        fs.writeFileSync('src/IsisChat.tsx', newContent);
        console.log('Sucesso: Fluxo de menu atualizado!');
    } else {
        console.log('Erro: Tag de fechamento não encontrada.');
    }
} else {
    console.log('Erro: Âncora não encontrada.');
}
