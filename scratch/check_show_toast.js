const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('function showToast('));
console.log('Index:', idx);
for (let i = idx; i < idx + 25; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
