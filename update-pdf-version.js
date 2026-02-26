#!/usr/bin/env node

/**
 * Script para atualizar a versão do PDF e forçar cache busting
 * Execute: node update-pdf-version.js
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'public', 'version.json');

// Ler versão atual
let versionData = {
  version: '1.0.0',
  lastUpdate: new Date().toISOString(),
  pdfVersion: Date.now().toString(),
  note: 'Incremente pdfVersion toda vez que atualizar o cardapio.pdf'
};

if (fs.existsSync(versionFile)) {
  const content = fs.readFileSync(versionFile, 'utf8');
  versionData = JSON.parse(content);
}

// Gerar nova versão
const now = new Date();
const dateString = now.toISOString().split('T')[0].replace(/-/g, '');
const timeString = now.getTime().toString().slice(-6);
const newPdfVersion = dateString + timeString;

versionData.pdfVersion = newPdfVersion;
versionData.lastUpdate = now.toISOString();

// Salvar nova versão
fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2), 'utf8');

console.log('✅ Versão do PDF atualizada!');
console.log('📄 Nova versão:', newPdfVersion);
console.log('📅 Data:', now.toLocaleString('pt-BR'));
console.log('\n🔄 Agora você pode:');
console.log('1. Substituir o arquivo cardapio.pdf');
console.log('2. Fazer commit das alterações');
console.log('3. Deploy para produção');
console.log('\n💡 Os usuários verão automaticamente o novo PDF!');

