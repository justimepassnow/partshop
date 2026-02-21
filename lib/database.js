import * as SQLite from 'expo-sqlite';
import { clearAllDataFiles } from './fileUtils';

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

              CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
              );
              INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'auto');

              INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');
          `);
          currentVersion = 5;
          await db.execAsync(`PRAGMA user_version = 5;`);
        }

        // Sequential Migrations
        if (currentVersion === 1) {
          try {
            await db.runAsync("ALTER TABLE categories ADD COLUMN image_uri TEXT;");
          } catch (e) {}
          try {
            await db.runAsync("ALTER TABLE items ADD COLUMN image_uri TEXT;");
          } catch (e) {}
          currentVersion = 2;
          await db.execAsync(`PRAGMA user_version = 2;`);
        }

        if (currentVersion === 2) {
          await db.withTransactionAsync(async () => {
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
             await db.runAsync(`
               INSERT INTO items_new (category_id, name, quantity, datasheet_uri, image_uri)
               SELECT category_id, name, SUM(quantity), MAX(datasheet_uri), MAX(image_uri)
               FROM items
               GROUP BY category_id, name;
             `);
             await db.runAsync(`DROP TABLE items;`);
             await db.runAsync(`ALTER TABLE items_new RENAME TO items;`);
             await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id);`);
             await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);`);
          });
          currentVersion = 3;
          await db.execAsync(`PRAGMA user_version = 3;`);
        }

        if (currentVersion === 3) {
           await db.execAsync(`
             CREATE TABLE IF NOT EXISTS settings (
               key TEXT PRIMARY KEY,
               value TEXT
             );
             INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'auto');
           `);
           currentVersion = 4;
           await db.execAsync(`PRAGMA user_version = 4;`);
        }

        if (currentVersion === 4) {
          // Double check items table for UNIQUE constraint (Fix for reported import issues)
          // SQLite doesn't make it easy to check constraints, so we recreate the table to be absolutely sure.
          await db.withTransactionAsync(async () => {
            await db.runAsync(`
              CREATE TABLE IF NOT EXISTS items_v5 (
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
            // Check if items exists and copy data
            const tableExists = await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='items';");
            if (tableExists) {
              await db.runAsync(`
                INSERT OR IGNORE INTO items_v5 (id, category_id, name, quantity, datasheet_uri, image_uri)
                SELECT id, category_id, name, quantity, datasheet_uri, image_uri FROM items;
              `);
              await db.runAsync(`DROP TABLE items;`);
            }
            await db.runAsync(`ALTER TABLE items_v5 RENAME TO items;`);
            await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_cat ON items(category_id);`);
            await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);`);
          });
          currentVersion = 5;
          await db.execAsync(`PRAGMA user_version = 5;`);
        }

    } catch (error) {
        console.error('DB Init Error:', error);
        throw error;
    }
};

export const deleteAllInventoryData = async () => {
    try {
        await db.withTransactionAsync(async () => {
            // Delete all items
            await db.runAsync('DELETE FROM items;');
            
            // Delete all shopping list entries
            await db.runAsync('DELETE FROM shopping_list;');
            
            // Delete all categories except Uncategorized (id: 1)
            await db.runAsync('DELETE FROM categories WHERE id != 1;');
            
            // Reset AUTOINCREMENT counters
            await db.runAsync("DELETE FROM sqlite_sequence WHERE name IN ('items', 'shopping_list', 'categories');");
            
            // Re-ensure Uncategorized exists just in case (though we didn't delete id 1)
            await db.runAsync("INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');");
        });

        // Clear associated files (images and datasheets)
        await clearAllDataFiles();

        return { success: true, message: 'All inventory data has been deleted.' };
    } catch (error) {
        console.error('Delete All Data Error:', error);
        return { success: false, message: 'Failed to delete data.' };
    }
};