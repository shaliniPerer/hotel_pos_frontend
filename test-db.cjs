const Database = require('better-sqlite3');
const db = new Database('pos.db');
console.log(db.prepare('SELECT * FROM products').all());
