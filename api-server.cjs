const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth.cjs');
const tableRoutes = require('./routes/tables.cjs');
const pageRoutes = require('./routes/pages.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/pages', pageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BlocNum API', timestamp: new Date() });
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && req.method === 'GET') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

const server = app.listen(PORT, () => {
  console.log(`BlocNum server running on http://localhost:${PORT}`);
});

module.exports = { app, server };

