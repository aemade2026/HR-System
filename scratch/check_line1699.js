const fs = require('fs');
const lines = fs.readFileSync('api.js', 'utf8').split('\n');
console.log(lines[1698]);
