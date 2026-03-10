// server.ts
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// --- ESM __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Config ---
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pos-key';

// --- Initialize DB ---
const db = new Database('pos.db');

// --- Setup tables (drop first if needed) ---
db.exec(`
  DROP TABLE IF EXISTS order_items;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS categories;
  DROP TABLE IF EXISTS users;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    color TEXT,
    sort_order INTEGER
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT,
    price REAL,
    image TEXT,
    code TEXT,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE,
    type TEXT,
    reference TEXT,
    status TEXT,
    subtotal REAL,
    tax REAL,
    discount REAL,
    total REAL,
    payment_method TEXT,
    cashier_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    product_id TEXT,
    product_name TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// --- Seed initial data ---
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(uuidv4(), 'admin', bcrypt.hashSync('admin123', 10), 'admin', 'System Admin');
  insertUser.run(uuidv4(), 'manager', bcrypt.hashSync('manager123', 10), 'manager', 'Hotel Manager');
  insertUser.run(uuidv4(), 'cashier', bcrypt.hashSync('cashier123', 10), 'cashier', 'Front Desk Cashier');

  const insertCategory = db.prepare('INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const categories = [
    'Fried Rice', 'Cheese Kottu', 'Fresh Juice', 'Mojito', 'Lassi', 'Smoothies', 'Milkshake', 'Hot Beverages'
  ].map(name => ({ id: uuidv4(), name }));

  categories.forEach((c, idx) => insertCategory.run(c.id, c.name, 'bg-slate-100', idx + 1));

  const insertProduct = db.prepare('INSERT INTO products (id, category_id, name, price, image, code) VALUES (?, ?, ?, ?, ?, ?)');
  // Example products
  insertProduct.run(uuidv4(), categories[0].id, 'Vegetable Rice (M)', 1390, '', '82M');
  insertProduct.run(uuidv4(), categories[0].id, 'Vegetable Rice (L)', 1800, '', '82L');
}

// --- Start server ---
async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.json());

  // --- Auth routes ---
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  });

  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Categories & Products ---
  app.get('/api/categories', authenticate, (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    res.json(categories);
  });
  app.get('/api/products', authenticate, (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  // --- Orders routes ---
  app.get('/api/orders', authenticate, (req, res) => {
    const status = req.query.status;
    let query = 'SELECT * FROM orders';
    let params: any[] = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const orders = db.prepare(query).all(...params);
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
    }));
    res.json(ordersWithItems);
  });

  app.get('/api/orders/:id', authenticate, (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    res.json({ ...order, items });
  });

  // --- Socket.IO ---
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
  });

  // --- Vite dev middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // --- Production SPA serving ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // --- Start HTTP server ---
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
