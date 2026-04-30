import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('inventory.db');

// --- DATABASE INITIALIZATION (SQL Queries) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    costPrice REAL NOT NULL,
    salePrice REAL NOT NULL,
    stock INTEGER NOT NULL,
    minStock INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    productName TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    salePrice REAL NOT NULL,
    costPrice REAL NOT NULL,
    totalAmount REAL NOT NULL,
    category TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    timestamp TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API ROUTES ---

  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { id, name, category, costPrice, salePrice, stock, minStock } = req.body;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO products (id, name, category, costPrice, salePrice, stock, minStock, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, category, costPrice, salePrice, stock, minStock || 0, now, now);
    res.status(201).json({ id });
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    const fields = Object.keys(updates).filter(k => k !== 'id');
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);
    
    // Always update updatedAt
    const stmt = db.prepare(`UPDATE products SET ${setClause}, updatedAt = ? WHERE id = ?`);
    stmt.run(...values, now, id);
    res.json({ success: true });
  });

  app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Sales
  app.get('/api/sales', (req, res) => {
    const { start, end } = req.query;
    let query = 'SELECT * FROM sales';
    const params: any[] = [];
    
    if (start && end) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(start, end);
    }
    
    query += ' ORDER BY timestamp DESC';
    const sales = db.prepare(query).all(...params);
    res.json(sales);
  });

  app.post('/api/sales', (req, res) => {
    const { id, productId, productName, quantity, salePrice, costPrice, totalAmount, category, paymentMethod, timestamp } = req.body;
    const stmt = db.prepare(`
      INSERT INTO sales (id, productId, productName, quantity, salePrice, costPrice, totalAmount, category, paymentMethod, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, productId, productName, quantity, salePrice, costPrice, totalAmount, category, paymentMethod, timestamp || new Date().toISOString());
    res.status(201).json({ id });
  });

  // Expenses
  app.get('/api/expenses', (req, res) => {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY timestamp DESC').all();
    res.json(expenses);
  });

  app.post('/api/expenses', (req, res) => {
    const { id, category, amount, description, timestamp } = req.body;
    const stmt = db.prepare(`
      INSERT INTO expenses (id, category, amount, description, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, category, amount, description, timestamp || new Date().toISOString());
    res.status(201).json({ id });
  });

  app.delete('/api/expenses/:id', (req, res) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Categories
  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(categories);
  });

  app.post('/api/categories', (req, res) => {
    const { id, name, description } = req.body;
    const stmt = db.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)');
    stmt.run(id, name, description);
    res.status(201).json({ id });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
