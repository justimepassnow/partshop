import * as SQLite from 'expo-sqlite';

    const db = SQLite.openDatabase('partshop.db');

    export const initDB = () => {
      const promise = new Promise((resolve, reject) => {
        db.transaction(tx => {
          // Create Categories Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Create Items Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              category_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              quantity INTEGER DEFAULT 0,
              datasheet_uri TEXT,
              FOREIGN KEY (category_id) REFERENCES categories (id)
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Create Shopping List Table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS shopping_list (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              target_category_id INTEGER,
              name TEXT NOT NULL,
              target_quantity INTEGER DEFAULT 1,
              is_purchased BOOLEAN DEFAULT 0,
              FOREIGN KEY (target_category_id) REFERENCES categories (id)
            );`,
            [],
            () => {},
            (_, err) => reject(err)
          );
          // Seed "Uncategorized" Category
          tx.executeSql(
            "INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Uncategorized');",
            [],
            () => resolve(),
            (_, err) => reject(err)
          );
        });
      });
      return promise;
    };