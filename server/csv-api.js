/**
 * CSV API Server — runs alongside your static file server.
 * 
 * Setup on your Linux server:
 *   1. cd into the project root (where public/ lives)
 *   2. npm install express cors
 *   3. node server/csv-api.js
 * 
 * The server runs on port 3001 by default.
 * Make sure your Nginx/Apache proxies /api/* to http://localhost:3001/api/*
 * 
 * Example Nginx config:
 *   location /api/ {
 *       proxy_pass http://127.0.0.1:3001;
 *   }
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.CSV_API_PORT || 3001;

// Path to the CSV file served by your static server
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, '..', 'public', 'data', 'events.csv');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// POST /api/csv — overwrites the CSV with the provided content
app.post('/api/csv', (req, res) => {
  const { csv } = req.body;

  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Missing "csv" field in request body' });
  }

  // Create backup before overwriting
  const backupPath = CSV_PATH + '.backup-' + Date.now();
  try {
    if (fs.existsSync(CSV_PATH)) {
      fs.copyFileSync(CSV_PATH, backupPath);
    }
  } catch (err) {
    console.error('Backup failed:', err.message);
  }

  try {
    fs.writeFileSync(CSV_PATH, csv, 'utf-8');
    console.log(`[CSV API] Updated ${CSV_PATH} (${csv.length} bytes)`);
    res.json({ success: true, bytes: csv.length });
  } catch (err) {
    console.error('[CSV API] Write failed:', err.message);
    res.status(500).json({ error: 'Failed to write CSV: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[CSV API] Running on port ${PORT}`);
  console.log(`[CSV API] CSV path: ${CSV_PATH}`);
});
