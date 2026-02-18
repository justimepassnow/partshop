import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('partshop.db');

export const initDB = async () => {
    try {
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              quantity INTEGER DEFAULT 0,
              datasheet_uri TEXT,
              FOREIGN KEY (category_id) REFERENCES categories (id)
            );
            CREATE TABLE IF NOT EXISTS shopping_list (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              target_category_id INTEGER,
              name TEXT NOT NULL,
              target_quantity INTEGER DEFAULT 1,
              is_purchased BOOLEAN DEFAULT 0,
              FOREIGN KEY (target_category_id) REFERENCES categories (id)
            );
        `);
        await db.runAsync("INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');");
    } catch (error) {
        console.error('DB Init Error:', error);
        throw error;
    }
};