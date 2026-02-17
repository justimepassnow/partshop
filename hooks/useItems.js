
import { db } from '../lib/database';

export function useItems() {

  const addItem = (categoryId, name, quantity = 0, datasheetUri = null) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO items (category_id, name, quantity, datasheet_uri)
           VALUES (?, ?, ?, ?);`,
          [categoryId, name, quantity, datasheetUri],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  };

  const getItemsByCategory = (categoryId) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM items WHERE category_id = ?;`,
          [categoryId],
          (_, result) => resolve(result.rows._array),
          (_, error) => reject(error)
        );
      });
    });
  };

  const updateItem = (id, name, quantity) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE items SET name = ?, quantity = ? WHERE id = ?;`,
          [name, quantity, id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };

  const deleteItem = (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `DELETE FROM items WHERE id = ?;`,
          [id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };

  return { addItem, getItemsByCategory, updateItem, deleteItem };
}
