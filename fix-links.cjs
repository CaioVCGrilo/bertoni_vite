// Script para ajustar links após o build
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

function replaceLinksInFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Substituir /src/pages/ por / em todos os links
  content = content.replace(/href="\/src\/pages\//g, 'href="/');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Links ajustados em: ${path.basename(filePath)}`);
}

// Lista de arquivos HTML para processar
const htmlFiles = [
  path.join(distDir, 'index.html'),
  path.join(distDir, 'cardapio.html'),
  path.join(distDir, 'sobre.html'),
  path.join(distDir, 'links.html')
];

console.log('Ajustando links para produção...');
htmlFiles.forEach(replaceLinksInFile);
console.log('✓ Todos os links foram ajustados!');

