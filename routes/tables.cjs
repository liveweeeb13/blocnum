const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth.cjs');

// Helper to sanitize table name and column names
function sanitizeIdentifier(name) {
  if (!name || typeof name !== 'string') return null;
  // Allow only lowercase letters, digits, and underscores
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (/^[0-9]/.test(clean)) {
    return 'col_' + clean;
  }
  return clean || null;
}

function findTableByReference(reference) {
  const cleanName = sanitizeIdentifier(reference);
  const byName = cleanName ? db.prepare('SELECT * FROM _system_tables WHERE name = ?').get(cleanName) : null;
  if (byName) return byName;
  if (/^\d+$/.test(String(reference))) {
    return db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(Number(reference));
  }
  return null;
}

// Map logical type to SQLite type
function mapSqlType(type) {
  switch (type) {
    case 'int':
      return 'INTEGER';
    case 'number':
      return 'NUMERIC';
    case 'boolean':
      return 'INTEGER DEFAULT 0';
    case 'date':
      return 'TEXT';
    case 'select':
    case 'text':
    default:
      return 'TEXT';
  }
}

// GET /api/tables - List all tables with columns and row count
router.get('/', optionalAuth, (req, res) => {
  try {
    const tables = db.prepare('SELECT * FROM _system_tables ORDER BY name ASC').all();
    const columns = db.prepare('SELECT * FROM _system_columns ORDER BY id ASC').all();

    const result = tables.map(table => {
      const tableColumns = columns.filter(c => c.table_id === table.id).map(c => ({
        ...c,
        options: c.options ? JSON.parse(c.options) : []
      }));

      // Count rows
      let rowCount = 0;
      try {
        const countRes = db.prepare(`SELECT COUNT(*) as cnt FROM "app_${table.name}"`).get();
        rowCount = countRes ? countRes.cnt : 0;
      } catch (e) {
        rowCount = 0;
      }

      return {
        ...table,
        columns: tableColumns,
        rowCount
      };
    });

    res.json({ tables: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tables - Create a new table
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, label, description, columns = [] } = req.body;
  const cleanName = sanitizeIdentifier(name);

  if (!cleanName || !label) {
    return res.status(400).json({ error: 'Nom technique et libellé de la table requis' });
  }

  // Check if table name already exists
  const existing = db.prepare('SELECT id FROM _system_tables WHERE name = ?').get(cleanName);
  if (existing) {
    return res.status(400).json({ error: `La table "${cleanName}" existe déjà` });
  }

  // Validate columns
  const preparedColumns = columns.map(c => {
    const colName = sanitizeIdentifier(c.name);
    return {
      name: colName,
      label: c.label || colName,
      type: ['int', 'number', 'date', 'boolean', 'select'].includes(c.type) ? c.type : 'text',
      options: (c.options && typeof c.options === 'object') ? c.options : [],
      required: c.required ? 1 : 0
    };
  }).filter(c => !!c.name && c.name !== 'id' && c.name !== 'created_at' && c.name !== 'updated_at');

  try {
    const transaction = db.transaction(() => {
      // 1. Insert metadata
      const tableRes = db.prepare('INSERT INTO _system_tables (name, label, description) VALUES (?, ?, ?)')
        .run(cleanName, label.trim(), description || '');
      const tableId = tableRes.lastInsertRowid;

      // 2. Insert column metadata
      const insertCol = db.prepare('INSERT INTO _system_columns (table_id, name, label, type, options, required) VALUES (?, ?, ?, ?, ?, ?)');
      for (const col of preparedColumns) {
        const hasOpts = col.options && (Array.isArray(col.options) ? col.options.length > 0 : Object.keys(col.options).length > 0);
        insertCol.run(
          tableId,
          col.name,
          col.label,
          col.type,
          hasOpts ? JSON.stringify(col.options) : null,
          col.required
        );
      }

      // 3. Build dynamic SQL table
      const colDefs = preparedColumns.map(col => {
        return `"${col.name}" ${mapSqlType(col.type)} ${col.required ? 'NOT NULL DEFAULT ""' : ''}`;
      });

      const sql = `
        CREATE TABLE IF NOT EXISTS "app_${cleanName}" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ${colDefs.length > 0 ? colDefs.join(',\n') + ',' : ''}
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;
      db.exec(sql);

      return tableId;
    });

    const tableId = transaction();

    res.status(201).json({
      message: `Table "${cleanName}" créée avec succès`,
      table: {
        id: tableId,
        name: cleanName,
        label,
        description,
        columns: preparedColumns,
        rowCount: 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de la table : ' + err.message });
  }
});

// DELETE /api/tables/:id - Delete a table
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (!label) return res.status(400).json({ error: 'Le nom de la table est requis' });

  const result = db.prepare('UPDATE _system_tables SET label = ?, description = ? WHERE id = ?')
    .run(label, description, tableId);
  if (!result.changes) return res.status(404).json({ error: 'Table introuvable' });
  res.json({ message: 'Paramètres de la table mis à jour', table: db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(tableId) });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const table = db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(tableId);

  if (!table) {
    return res.status(404).json({ error: 'Table introuvable' });
  }

  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM _system_tables WHERE id = ?').run(tableId);
      db.prepare('DELETE FROM _system_columns WHERE table_id = ?').run(tableId);
      db.exec(`DROP TABLE IF EXISTS "app_${table.name}"`);
    });

    transaction();
    res.json({ message: `Table "${table.name}" supprimée avec succès` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tables/:id/columns - Add a column to an existing table
router.post('/:id/columns', requireAuth, requireAdmin, (req, res) => {
  const tableRef = req.params.id;
  const parsedTableId = Number.parseInt(tableRef, 10);
  const table = String(parsedTableId) === tableRef
    ? db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(parsedTableId)
    : db.prepare('SELECT * FROM _system_tables WHERE name = ?').get(sanitizeIdentifier(tableRef));
  const tableId = table?.id;
  const { name, label, type, options, required } = req.body;
  if (!table) {
    return res.status(404).json({ error: 'Table introuvable' });
  }

  const cleanName = sanitizeIdentifier(name);
  if (!cleanName) {
    return res.status(400).json({ error: 'Nom de colonne invalide' });
  }

  const existingCol = db.prepare('SELECT id FROM _system_columns WHERE table_id = ? AND name = ?')
    .get(tableId, cleanName);
  if (existingCol) {
    return res.status(400).json({ error: `La colonne "${cleanName}" existe déjà dans cette table` });
  }

  const colType = ['int', 'number', 'date', 'boolean', 'select'].includes(type) ? type : 'text';
  const colOptions = (options && typeof options === 'object') ? options : [];
  const isRequired = required ? 1 : 0;
  const hasOptions = Array.isArray(colOptions) ? colOptions.length > 0 : Object.keys(colOptions).length > 0;

  try {
    const transaction = db.transaction(() => {
      const colRes = db.prepare(
        'INSERT INTO _system_columns (table_id, name, label, type, options, required) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(tableId, cleanName, label || cleanName, colType, hasOptions ? JSON.stringify(colOptions) : null, isRequired);

      // Alter dynamic table
      const sqlType = mapSqlType(colType);
      db.exec(`ALTER TABLE "app_${table.name}" ADD COLUMN "${cleanName}" ${sqlType};`);

      return colRes.lastInsertRowid;
    });

    const colId = transaction();

    res.status(201).json({
      message: `Colonne "${cleanName}" ajoutée avec succès`,
      column: {
        id: colId,
        table_id: tableId,
        name: cleanName,
        label: label || cleanName,
        type: colType,
        options: colOptions,
        required: isRequired
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la colonne : ' + err.message });
  }
});

// PUT /api/tables/:id/columns/:columnId - Update column options or label
router.put('/:id/columns/:columnId', requireAuth, requireAdmin, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const columnId = parseInt(req.params.columnId, 10);
  const table = db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(tableId);
  if (!table) return res.status(404).json({ error: 'Table introuvable' });

  const column = db.prepare('SELECT * FROM _system_columns WHERE id = ? AND table_id = ?').get(columnId, tableId);
  if (!column) return res.status(404).json({ error: 'Colonne introuvable' });

  const { label, options, required } = req.body;
  const newLabel = label !== undefined ? label : column.label;
  const newRequired = required !== undefined ? (required ? 1 : 0) : column.required;
  const hasOptions = options && typeof options === 'object' && (Array.isArray(options) ? options.length > 0 : Object.keys(options).length > 0);
  const newOptionsJson = options !== undefined ? (hasOptions ? JSON.stringify(options) : null) : column.options;

  try {
    db.prepare('UPDATE _system_columns SET label = ?, options = ?, required = ? WHERE id = ? AND table_id = ?')
      .run(newLabel, newOptionsJson, newRequired, columnId, tableId);

    const updatedCol = db.prepare('SELECT * FROM _system_columns WHERE id = ?').get(columnId);
    let parsedOpts = [];
    if (updatedCol.options) {
      try {
        parsedOpts = JSON.parse(updatedCol.options);
      } catch (_) {
        parsedOpts = [];
      }
    }
    res.json({
      message: 'Colonne mise à jour',
      column: {
        ...updatedCol,
        options: parsedOpts
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la colonne : ' + err.message });
  }
});

router.delete('/:id/columns/:columnId', requireAuth, requireAdmin, (req, res) => {
  const tableId = parseInt(req.params.id, 10);
  const columnId = parseInt(req.params.columnId, 10);
  const table = db.prepare('SELECT * FROM _system_tables WHERE id = ?').get(tableId);
  if (!table) return res.status(404).json({ error: 'Table introuvable' });

  const column = db.prepare('SELECT * FROM _system_columns WHERE id = ? AND table_id = ?').get(columnId, tableId);
  if (!column) return res.status(404).json({ error: 'Colonne introuvable' });

  try {
    db.transaction(() => {
      try {
        db.exec(`ALTER TABLE "app_${table.name}" DROP COLUMN "${column.name}"`);
      } catch (sqlErr) {
        // If column was already dropped or doesn't exist in SQLite, proceed with metadata cleanup
        if (!sqlErr.message.includes('no such column')) {
          throw sqlErr;
        }
      }
      db.prepare('DELETE FROM _system_columns WHERE id = ? AND table_id = ?').run(columnId, tableId);
    })();
    res.json({ message: `Colonne "${column.name}" supprimée` });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la colonne : ' + err.message });
  }
});

// ==========================================
// DATA CRUD FOR TABLES
// ==========================================

// GET /api/tables/:tableName/data - Get all records
router.get('/:tableName/data', optionalAuth, (req, res) => {
  const table = findTableByReference(req.params.tableName);

  if (!table) {
    return res.status(404).json({ error: `Table "${req.params.tableName}" introuvable` });
  }

  try {
    const rows = db.prepare(`SELECT * FROM "app_${table.name}" ORDER BY id DESC`).all();
    res.json({ rows, table });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tables/:tableName/data - Insert a new record
router.post('/:tableName/data', optionalAuth, (req, res) => {
  const table = findTableByReference(req.params.tableName);

  if (!table) {
    return res.status(404).json({ error: `Table "${req.params.tableName}" introuvable` });
  }

  const columns = db.prepare('SELECT * FROM _system_columns WHERE table_id = ?').all(table.id);
  const data = req.body || {};

  // Extract valid columns
  const fields = [];
  const placeholders = [];
  const values = [];

  for (const col of columns) {
    if (data[col.name] !== undefined) {
      fields.push(`"${col.name}"`);
      placeholders.push('?');
      values.push(data[col.name]);
    }
  }

  try {
    let result;
    if (fields.length > 0) {
      const sql = `INSERT INTO "app_${table.name}" (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      result = db.prepare(sql).run(...values);
    } else {
      const sql = `INSERT INTO "app_${table.name}" DEFAULT VALUES`;
      result = db.prepare(sql).run();
    }

    const newRow = db.prepare(`SELECT * FROM "app_${table.name}" WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ message: 'Enregistrement créé', row: newRow });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'insertion : ' + err.message });
  }
});

// PUT /api/tables/:tableName/data/:id - Update a record
router.put('/:tableName/data/:id', optionalAuth, (req, res) => {
  const table = findTableByReference(req.params.tableName);
  const recordId = parseInt(req.params.id, 10);

  if (!table) {
    return res.status(404).json({ error: `Table "${req.params.tableName}" introuvable` });
  }

  const columns = db.prepare('SELECT * FROM _system_columns WHERE table_id = ?').all(table.id);
  const data = req.body || {};

  const updates = [];
  const values = [];

  for (const col of columns) {
    if (data[col.name] !== undefined) {
      updates.push(`"${col.name}" = ?`);
      values.push(data[col.name]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(recordId);

  try {
    const sql = `UPDATE "app_${table.name}" SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(sql).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }

    const updatedRow = db.prepare(`SELECT * FROM "app_${table.name}" WHERE id = ?`).get(recordId);
    res.json({ message: 'Enregistrement mis à jour', row: updatedRow });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour : ' + err.message });
  }
});

// DELETE /api/tables/:tableName/data/:id - Delete a record
router.delete('/:tableName/data/:id', optionalAuth, (req, res) => {
  const table = findTableByReference(req.params.tableName);
  const recordId = parseInt(req.params.id, 10);

  if (!table) {
    return res.status(404).json({ error: `Table "${req.params.tableName}" introuvable` });
  }

  try {
    const result = db.prepare(`DELETE FROM "app_${table.name}" WHERE id = ?`).run(recordId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enregistrement non trouvé' });
    }
    res.json({ message: 'Enregistrement supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

