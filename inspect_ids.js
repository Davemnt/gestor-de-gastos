const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const text = fs.readFileSync('app.js', 'utf8');

console.log('index.html:');
console.log('modal-admin index:', html.indexOf('id="modal-admin"'));
console.log('panel-admin index:', html.indexOf('id="panel-admin"'));

console.log('\napp.js panel functions:');
const t1 = text.indexOf('btn-panel-admin');
console.log('btn-panel-admin:', text.substring(t1, t1+150));

const t2 = text.indexOf('async function mostrarPanelAdmin');
if (t2 !== -1) {
  console.log('mostrarPanelAdmin:', text.substring(t2, t2+500));
} else {
  console.log('mostrarPanelAdmin not found');
}
