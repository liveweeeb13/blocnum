const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { requireAuth, requireAdmin } = require('../middleware/auth.cjs');

function sanitizeSlug(title) {
  if (!title) return 'page-' + Date.now();
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || ('page-' + Date.now());
}

function canAccessPage(user, pageId) {
  if (!user || user.role === 'admin') return true;
  return !!db.prepare('SELECT 1 FROM _system_user_pages WHERE user_id = ? AND page_id = ?')
    .get(user.id, pageId);
}

// GET /api/pages - List all pages (public/optionalAuth for standalone /page)
router.get('/', requireAuth, (req, res) => {
  try {
    let pages = db.prepare('SELECT id, slug, title, description, created_at, updated_at FROM _system_pages ORDER BY id DESC').all();
    if (req.user && req.user.role !== 'admin') {
      pages = pages.filter(page => canAccessPage(req.user, page.id));
    }
    res.json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pages/:id - Get single page with full layout
router.get('/:id', requireAuth, (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM _system_pages WHERE id = ?').get(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Page introuvable' });
    }
    if (!canAccessPage(req.user, page.id)) {
      return res.status(403).json({ error: 'Vous n’êtes pas autorisé à consulter cette page' });
    }
    res.json({
      page: {
        ...page,
        layout: JSON.parse(page.layout_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pages/slug/:slug - Get page by slug
router.get('/slug/:slug', requireAuth, (req, res) => {
  try {
    const page = db.prepare('SELECT * FROM _system_pages WHERE slug = ?').get(req.params.slug);
    if (!page) {
      return res.status(404).json({ error: 'Page introuvable' });
    }
    if (!canAccessPage(req.user, page.id)) {
      return res.status(403).json({ error: 'Vous n’êtes pas autorisé à consulter cette page' });
    }
    res.json({
      page: {
        ...page,
        layout: JSON.parse(page.layout_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pages - Create a new page
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { title, description, slug, layout } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Titre de la page obligatoire' });
  }

  let finalSlug = slug ? sanitizeSlug(slug) : sanitizeSlug(title);
  
  let counter = 1;
  let testSlug = finalSlug;
  while (db.prepare('SELECT id FROM _system_pages WHERE slug = ?').get(testSlug)) {
    testSlug = `${finalSlug}-${counter}`;
    counter++;
  }
  finalSlug = testSlug;

  const defaultLayout = layout || [
    {
      id: 'block_' + Date.now() + '_1',
      type: 'header',
      title: title,
      subtitle: description || 'Page générée en no-code'
    }
  ];

  try {
    const result = db.prepare(
      'INSERT INTO _system_pages (slug, title, description, layout_json) VALUES (?, ?, ?, ?)'
    ).run(finalSlug, title.trim(), description || '', JSON.stringify(defaultLayout));

    res.status(201).json({
      message: 'Page créée avec succès',
      page: {
        id: result.lastInsertRowid,
        slug: finalSlug,
        title: title.trim(),
        description: description || '',
        layout: defaultLayout
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de la page : ' + err.message });
  }
});

// PUT /api/pages/:id - Update page layout, title, description
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const pageId = parseInt(req.params.id, 10);
  const { title, description, layout } = req.body;

  const existing = db.prepare('SELECT * FROM _system_pages WHERE id = ?').get(pageId);
  if (!existing) {
    return res.status(404).json({ error: 'Page introuvable' });
  }

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDesc = description !== undefined ? description : existing.description;
  const newLayout = layout !== undefined ? JSON.stringify(layout) : existing.layout_json;

  try {
    db.prepare(`
      UPDATE _system_pages 
      SET title = ?, description = ?, layout_json = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(newTitle, newDesc, newLayout, pageId);

    const updated = db.prepare('SELECT * FROM _system_pages WHERE id = ?').get(pageId);
    res.json({
      message: 'Page enregistrée avec succès',
      page: {
        ...updated,
        layout: JSON.parse(updated.layout_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pages/:id - Delete a page
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const pageId = parseInt(req.params.id, 10);
  try {
    const result = db.prepare('DELETE FROM _system_pages WHERE id = ?').run(pageId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Page introuvable' });
    }
    res.json({ message: 'Page supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
