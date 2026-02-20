import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('partshop.db');

export const initDB = async () => {
    try {
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
        `);

        const result = await db.getFirstAsync('PRAGMA user_version;');
        let currentVersion = result.user_version || 0;

        if (currentVersion === 0) {
          await db.execAsync(`
              CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                image_uri TEXT
              );
              CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                datasheet_uri TEXT,
                image_uri TEXT,
                FOREIGN KEY (category_id) REFERENCES categories (id),
                UNIQUE(category_id, name)
              );
              CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id);
              CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

              CREATE TABLE IF NOT EXISTS shopping_list (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                target_category_id INTEGER,
                name TEXT NOT NULL,
                target_quantity INTEGER DEFAULT 1,
                is_purchased BOOLEAN DEFAULT 0,
                FOREIGN KEY (target_category_id) REFERENCES categories (id)
              );
              CREATE INDEX IF NOT EXISTS idx_shopping_cat ON shopping_list(target_category_id);

              INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');
          `);
          currentVersion = 3;
          await db.execAsync(`PRAGMA user_version = 3;`);
        }

        // Migration to version 2 (legacy support)
        if (currentVersion === 1) {
          try {
            await db.runAsync("ALTER TABLE categories ADD COLUMN image_uri TEXT;");
          } catch (e) { /* ignore if already exists */ }
          try {
            await db.runAsync("ALTER TABLE items ADD COLUMN image_uri TEXT;");
          } catch (e) { /* ignore if already exists */ }
          
          currentVersion = 2;
          await db.execAsync(`PRAGMA user_version = 2;`);
        }

        // Migration to version 3 (Add UNIQUE and indexes)
        if (currentVersion === 2) {
          await db.withTransactionAsync(async () => {
             // To add a UNIQUE constraint, we need to recreate the table
             // 1. Create temporary table
             await db.runAsync(`
               CREATE TABLE items_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                datasheet_uri TEXT,
                image_uri TEXT,
                FOREIGN KEY (category_id) REFERENCES categories (id),
                UNIQUE(category_id, name)
               );
             `);
             // 2. Copy data, grouping to avoid conflicts from existing duplicates
             await db.runAsync(`
               INSERT INTO items_new (category_id, name, quantity, datasheet_uri, image_uri)
               SELECT category_id, name, SUM(quantity), MAX(datasheet_uri), MAX(image_uri)
               FROM items
               GROUP BY category_id, name;
             `);
             // 3. Drop old, rename new
             await db.runAsync(`DROP TABLE items;`);
             await db.runAsync(`ALTER TABLE items_new RENAME TO items;`);

             // 4. Create Indexes
             await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id);`);
             await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);`);
             await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_shopping_cat ON shopping_list(target_category_id);`);

             currentVersion = 3;
             await db.execAsync(`PRAGMA user_version = 3;`);
          });
        }

    } catch (error) {
        console.error('DB Init Error:', error);
        throw error;
    }
};