import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pos-key';

// Initialize SQLite Database
const db = new Database('pos.db');

// Setup tables
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
    type TEXT, -- 'table', 'room', 'takeaway'
    reference TEXT, -- table number or room number
    status TEXT, -- 'open', 'completed', 'cancelled'
    subtotal REAL,
    tax REAL,
    discount REAL,
    total REAL,
    payment_method TEXT, -- 'cash', 'card', 'room_charge'
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

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(uuidv4(), 'admin', bcrypt.hashSync('admin123', 10), 'admin', 'System Admin');
  insertUser.run(uuidv4(), 'manager', bcrypt.hashSync('manager123', 10), 'manager', 'Hotel Manager');
  insertUser.run(uuidv4(), 'cashier', bcrypt.hashSync('cashier123', 10), 'cashier', 'Front Desk Cashier');

  const insertCategory = db.prepare('INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const catFriedRice = uuidv4();
  const catCheeseKottu = uuidv4();
  const catFreshJuice = uuidv4();
  const catMojito = uuidv4();
  const catLassi = uuidv4();
  const catSmoothies = uuidv4();
  const catMilkshake = uuidv4();
  const catHotBeverages = uuidv4();
  
  insertCategory.run(catFriedRice, 'Fried Rice', 'bg-slate-100', 1);
  insertCategory.run(catCheeseKottu, 'Cheese Kottu', 'bg-slate-100', 2);
  insertCategory.run(catFreshJuice, 'Fresh Juice', 'bg-slate-100', 3);
  insertCategory.run(catMojito, 'Mojito', 'bg-slate-100', 4);
  insertCategory.run(catLassi, 'Lassi', 'bg-slate-100', 5);
  insertCategory.run(catSmoothies, 'Smoothies', 'bg-slate-100', 6);
  insertCategory.run(catMilkshake, 'Milkshake', 'bg-slate-100', 7);
  insertCategory.run(catHotBeverages, 'Hot Beverages', 'bg-slate-100', 8);

  const insertProduct = db.prepare('INSERT INTO products (id, category_id, name, price, image, code) VALUES (?, ?, ?, ?, ?, ?)');
  
  // Fried Rice
  insertProduct.run(uuidv4(), catFriedRice, 'Vegetable Rice (M)', 1390.00, '', '82M');
  insertProduct.run(uuidv4(), catFriedRice, 'Vegetable Rice (L)', 1800.00, '', '82L');
  insertProduct.run(uuidv4(), catFriedRice, 'Egg Rice (M)', 1490.00, '', '83M');
  insertProduct.run(uuidv4(), catFriedRice, 'Egg Rice (L)', 1990.00, '', '83L');
  insertProduct.run(uuidv4(), catFriedRice, 'Chicken Rice (M)', 1590.00, '', '84M');
  insertProduct.run(uuidv4(), catFriedRice, 'Chicken Rice (L)', 2100.00, '', '84L');
  insertProduct.run(uuidv4(), catFriedRice, 'Mixed Rice (M)', 1790.00, '', '85M');
  insertProduct.run(uuidv4(), catFriedRice, 'Mixed Rice (L)', 2300.00, '', '85L');
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  });

  // Middleware to verify token
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Categories & Products
  app.get('/api/categories', authenticate, (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    res.json(categories);
  });

  app.get('/api/products', authenticate, (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
  });

  // Orders
  app.get('/api/orders', authenticate, (req, res) => {
    const status = req.query.status;
    let query = 'SELECT * FROM orders';
    let params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    
    const orders = db.prepare(query).all(...params) as any[];
    
    const ordersWithItems = orders.map(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      return { ...order, items };
    });
    
    res.json(ordersWithItems);
  });

  app.get('/api/orders/:id', authenticate, (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    res.json({ ...order, items });
  });

  app.post('/api/orders', authenticate, (req: any, res: any) => {
    const { type, reference, items, subtotal, tax, discount, total, payment_method, status } = req.body;
    
    const orderId = uuidv4();
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, order_number, type, reference, status, subtotal, tax, discount, total, payment_method, cashier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      db.transaction(() => {
        insertOrder.run(orderId, orderNumber, type, reference, status || 'open', subtotal, tax, discount, total, payment_method, req.user.id);
        
        for (const item of items) {
          insertItem.run(uuidv4(), orderId, item.product_id, item.product_name, item.quantity, item.price);
        }
      })();
      
      const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const newItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      const fullOrder = { ...newOrder, items: newItems };
      
      io.emit('order:created', fullOrder);
      res.status(201).json(fullOrder);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  app.put('/api/orders/:id', authenticate, (req: any, res: any) => {
    const { status, payment_method, items, subtotal, tax, discount, total } = req.body;
    const orderId = req.params.id;
    
    try {
      db.transaction(() => {
        if (items) {
          db.prepare('UPDATE orders SET status = ?, payment_method = ?, subtotal = ?, tax = ?, discount = ?, total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(status, payment_method, subtotal, tax, discount, total, orderId);
          
          // Delete old items and insert new ones
          db.prepare('DELETE FROM order_items WHERE order_id = ?').run(orderId);
          const insertItem = db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          for (const item of items) {
            insertItem.run(uuidv4(), orderId, item.product_id, item.product_name, item.quantity, item.price);
          }
        } else {
          db.prepare('UPDATE orders SET status = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(status, payment_method, orderId);
        }
      })();
        
      const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const updatedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      const fullOrder = { ...updatedOrder, items: updatedItems };
      
      io.emit('order:updated', fullOrder);
      res.json(fullOrder);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });

  // Reports
  app.get('/api/reports/daily', authenticate, (req, res) => {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    
    const stats = db.prepare(`
      SELECT 
        COUNT(id) as total_orders,
        SUM(total) as total_revenue,
        SUM(tax) as total_tax,
        SUM(discount) as total_discount
      FROM orders 
      WHERE date(created_at) = ? AND status = 'completed'
    `).get(date);
    
    res.json(stats);
  });

  // Socket.IO
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
