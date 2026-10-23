const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');
const { JWT_SECRET, requireAuth, requireAdmin } = require('../middleware/auth.cjs');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  const user = db.prepare('SELECT * FROM _system_users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: 'Connexion réussie',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, role, created_at FROM _system_users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }
  res.json({ user });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body || {};
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Les nouveaux mots de passe ne correspondent pas' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' });
  }

  const user = db.prepare('SELECT id, password FROM _system_users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
  db.prepare('UPDATE _system_users SET password = ? WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Mot de passe modifié avec succès' });
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM _system_users ORDER BY id ASC').all()
    .map(user => ({
      ...user,
      allowedPages: db.prepare('SELECT page_id FROM _system_user_pages WHERE user_id = ? ORDER BY page_id ASC')
        .all(user.id).map(row => row.page_id)
    }));
  res.json({ users });
});

// POST /api/auth/users (admin creates a user)
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  const existing = db.prepare('SELECT id FROM _system_users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: 'Cet utilisateur existe déjà' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userRole = role === 'admin' ? 'admin' : 'user';

  const result = db.prepare('INSERT INTO _system_users (username, password, role) VALUES (?, ?, ?)')
    .run(username.trim(), hash, userRole);

  res.status(201).json({
    message: 'Utilisateur créé avec succès',
    user: { id: result.lastInsertRowid, username: username.trim(), role: userRole }
  });
});

// PUT /api/auth/users/:id/pages (admin assigns the pages a standard user can view)
router.put('/users/:id/pages', requireAuth, requireAdmin, (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const { pageIds } = req.body || {};
  if (!Number.isInteger(userId) || userId <= 0 || !Array.isArray(pageIds)) {
    return res.status(400).json({ error: 'Utilisateur ou liste de pages invalide' });
  }
  const target = db.prepare('SELECT id, role FROM _system_users WHERE id = ?').get(userId);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.role === 'admin') {
    return res.status(400).json({ error: 'Les administrateurs ont accès à toutes les pages' });
  }
  const ids = [...new Set(pageIds)];
  if (ids.some(id => !Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ error: 'Identifiant de page invalide' });
  }
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ');
    const found = db.prepare(`SELECT id FROM _system_pages WHERE id IN (${placeholders})`).all(...ids);
    if (found.length !== ids.length) return res.status(400).json({ error: 'Une ou plusieurs pages sont introuvables' });
  }

  const updateAccess = db.transaction(() => {
    db.prepare('DELETE FROM _system_user_pages WHERE user_id = ?').run(userId);
    const insert = db.prepare('INSERT INTO _system_user_pages (user_id, page_id) VALUES (?, ?)');
    ids.forEach(pageId => insert.run(userId, pageId));
  });
  updateAccess();
  res.json({ message: 'Accès aux pages mis à jour', userId, allowedPages: ids });
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  }
  const target = db.prepare('SELECT id, role FROM _system_users WHERE id = ?').get(userId);
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.role === 'admin') {
    const admins = db.prepare("SELECT COUNT(*) AS count FROM _system_users WHERE role = 'admin'").get().count;
    if (admins <= 1) return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' });
  }
  db.prepare('DELETE FROM _system_users WHERE id = ?').run(userId);
  res.json({ message: 'Utilisateur supprimé avec succès' });
});

module.exports = router;

