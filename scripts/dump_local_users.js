const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(process.cwd(), 'data', 'portsaid.db');
if (!fs.existsSync(dbPath)) {
  console.log('data/portsaid.db does not exist yet.');
  process.exit(0);
}

const db = new DatabaseSync(dbPath);
const users = db.prepare('SELECT id, name, email, phone, role, points_balance, password_hash, created_at FROM users').all();
console.log('Total users in data/portsaid.db:', users.length);
users.forEach(u => console.log(`- [${u.role}] ${u.name} | Email: ${u.email} | Phone: ${u.phone} | Points: ${u.points_balance}`));

const visits = db.prepare('SELECT count(*) as c FROM visits').get();
console.log('Total visits:', visits.c);

const ledger = db.prepare('SELECT count(*) as c FROM points_ledger').get();
console.log('Total ledger entries:', ledger.c);

const apps = db.prepare('SELECT count(*) as c FROM partner_applications').get();
console.log('Total partner apps:', apps.c);
