const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('<div id="modal-admin"');
const end = html.indexOf('MODAL GASTOS INFORMADOS') - 28; // just before the comment
console.log('Start index:', start);
console.log('End index:', end);
