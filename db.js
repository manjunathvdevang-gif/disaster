// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'disaster_alert',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function getIncidents() {
  const [rows] = await pool.query('SELECT * FROM incidents ORDER BY createdAt DESC');
  return rows;
}

async function createIncident(obj) {
  const { id, title, description, location, category, reporterId, imageUrl } = obj;
  const sql = `INSERT INTO incidents (id, title, description, location, category, reporterId, imageUrl)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  await pool.query(sql, [id, title, description, location, category, reporterId, imageUrl || null]);
  const [rows] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
  return rows[0];
}

module.exports = { pool, getIncidents, createIncident };