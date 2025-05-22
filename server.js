import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url'; // Needed because __dirname doesn't exist in ES Modules

const { Pool } = pg;

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: 'hicelh_sheetcraft',
  host: 'uk1.pgsqlserver.com',
  database: 'hicelh_sheetcraft',
  password: 't8mt6J3GB$',  
  port: 5432,
});

// Support __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database and create table if not exists
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testaggrid (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Initialize database
initDb();

// GET users
app.get("/api/users", async (req, res) => {
  let { page = 1, pageSize = 10, sortBy = "id", sortDir = "ASC", filter = "" } = req.query;
  page = parseInt(page);
  pageSize = parseInt(pageSize);

  try {
    let countQuery = 'SELECT COUNT(*) FROM testaggrid';
    let queryParams = [];

    if (filter) {
      countQuery += ` WHERE "name" ILIKE $1 OR "email" ILIKE $1 OR "phone" ILIKE $1 OR "address" ILIKE $1`;
      queryParams.push(`%${filter}%`);
    }

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    let dataQuery = 'SELECT * FROM testaggrid';
    if (filter) {
      dataQuery += ` WHERE "name" ILIKE $1 OR "email" ILIKE $1 OR "phone" ILIKE $1 OR "address" ILIKE $1`;
    }
    dataQuery += ` ORDER BY "${sortBy}" ${sortDir} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(pageSize, (page - 1) * pageSize);

    const dataResult = await pool.query(dataQuery, queryParams);
    
    res.json({ data: dataResult.rows, total });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT user
app.put("/api/users/:id", async (req, res) => {
  const { name, email, phone, address } = req.body;
  const id = req.params.id;

  try {
    const result = await pool.query(
      'UPDATE testaggrid SET "name" = $1, "email" = $2, "phone" = $3, "address" = $4 WHERE id = $5 RETURNING *',
      [name, email, phone, address, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: name});
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Serve client
app.use(express.static(path.join(__dirname, "client", "dist")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
