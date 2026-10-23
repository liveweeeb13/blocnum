const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const appVersion = require('./package.json').version;

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize system tables
function initDb() {
  db.exec(`
    -- System Users
    CREATE TABLE IF NOT EXISTS _system_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Tables Metadata
    CREATE TABLE IF NOT EXISTS _system_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Columns Metadata
    CREATE TABLE IF NOT EXISTS _system_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL REFERENCES _system_tables(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL, -- 'text', 'int', 'number', 'date', 'boolean', 'select'
      options TEXT,       -- JSON array for select choices
      required INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(table_id, name)
    );

    -- System Pages (No-Code Layouts)
    CREATE TABLE IF NOT EXISTS _system_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      layout_json TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Page access grants for standard users. Admins have access to every page.
    CREATE TABLE IF NOT EXISTS _system_user_pages (
      user_id INTEGER NOT NULL REFERENCES _system_users(id) ON DELETE CASCADE,
      page_id INTEGER NOT NULL REFERENCES _system_pages(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, page_id)
    );
  `);

  // Create default admin user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM _system_users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare('INSERT INTO _system_users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('✅ Default admin created: admin / admin123');
  }

  // Create sample table & sample page if empty for quick testing
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM _system_tables').get().count;
  if (tableCount === 0) {
    // 1. Create table metadata
    const tableRes = db.prepare('INSERT INTO _system_tables (name, label, description) VALUES (?, ?, ?)')
      .run('clients', 'Clients', 'Annuaire des clients');
    const tableId = tableRes.lastInsertRowid;

    // 2. Create columns metadata
    const insertCol = db.prepare('INSERT INTO _system_columns (table_id, name, label, type, required) VALUES (?, ?, ?, ?, ?)');
    insertCol.run(tableId, 'nom', 'Nom complet', 'text', 1);
    insertCol.run(tableId, 'email', 'Adresse Email', 'text', 1);
    insertCol.run(tableId, 'telephone', 'Téléphone', 'text', 0);
    insertCol.run(tableId, 'statut', 'Statut', 'select', 0);
    
    // Update options for statut
    db.prepare("UPDATE _system_columns SET options = ? WHERE table_id = ? AND name = 'statut'")
      .run(JSON.stringify(['Actif', 'Prospect', 'Inactif']), tableId);

    // 3. Create dynamic SQL table
    db.exec(`
      CREATE TABLE IF NOT EXISTS "app_clients" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        email TEXT NOT NULL,
        telephone TEXT,
        statut TEXT DEFAULT 'Prospect',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert sample clients with phone numbers kept as text, preserving leading zeros.
    const insertClient = db.prepare('INSERT INTO app_clients (nom, email, telephone, statut) VALUES (?, ?, ?, ?)');
    insertClient.run('Dupont Entreprise', 'contact@dupont.fr', '01 40 50 60 70', 'Actif');
    insertClient.run('Tech Innovate', 'info@tech-innovate.com', '06 12 34 56 78', 'Prospect');
    insertClient.run('Cabinet Martin', 'secretariat@martin.fr', '04 78 90 12 34', 'Actif');

    // 4. Create sample page
    const sampleLayout = [
      {
        id: 'block_default_header',
        type: 'header',
        title: 'Bonjour $[username]',
        subtitle: 'Bienvenue sur BlocNum',
        attachedButtons: [],
        attachedButton: null,
        textColor: '',
        backgroundColor: '#f5f5f5',
        borderEnabled: true,
        borderWidth: 2,
        borderColor: '#a3a3a3',
        borderRadius: 8,
        innerPadding: 15
      },
      {
        id: 'block_default_alert',
        type: 'alert',
        title: 'Note',
        message: `BlocNum est en version Alpha v${appVersion}`,
        alertType: 'info',
        backgroundColor: '#eed202'
      },
      {
        id: 'block_default_button',
        type: 'button',
        label: 'Gerer les clients',
        variant: 'primary',
        size: 'md',
        widthMode: 'auto',
        roundness: 'md',
        icon: 'auto',
        align: 'center',
        position: 'standard',
        mode: 'direct',
        action: { type: 'page', pageSlug: 'clients', url: '', newTab: false, message: '' }
      }
    ];

    db.prepare('INSERT INTO _system_pages (slug, title, description, layout_json) VALUES (?, ?, ?, ?)')
      .run('index', 'Page de base', '', JSON.stringify(sampleLayout));

    const clientsLayout = [
      {
        id: 'block_default_clients_header',
        type: 'header',
        title: 'Gestion des clients',
        subtitle: 'Creer, consulter et modifier vos clients'
      },
      {
        id: 'block_default_clients_count',
        type: 'stats',
        title: 'Nombre de clients',
        tableName: 'clients'
      },
      {
        id: 'block_default_clients_table',
        type: 'table',
        title: 'Liste des clients',
        tableName: 'clients',
        visibleColumns: ['nom', 'email', 'telephone', 'statut'],
        allowEdit: true,
        allowDelete: true
      },
      {
        id: 'block_default_clients_form',
        type: 'form',
        title: 'Créer un client',
        tableName: 'clients'
      },
      {
        id: 'block_default_clients_home',
        type: 'button',
        label: 'Retour a la page de base',
        mode: 'direct',
        action: { type: 'page', pageSlug: 'index', url: '', newTab: false, message: '' }
      }
    ];

    db.prepare('INSERT INTO _system_pages (slug, title, description, layout_json) VALUES (?, ?, ?, ?)')
      .run('clients', 'Clients', 'Creer, consulter et modifier les clients', JSON.stringify(clientsLayout));
  }
}

initDb();

module.exports = db;
