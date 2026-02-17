import {db} from '../lib/database';

export function useCategories(){
    const addCategory = (name) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO categories (name) VALUES (?);`,
          [name],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  };
    const getCategories = () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM categories ORDER BY name ASC;`,
          [],
          (_, result) => resolve(result.rows._array),
          (_, error) => reject(error)
        );
      });
    });
  };
  const deleteCategory = (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Move items to Uncategorized (id = 1)
        tx.executeSql(
          `UPDATE items SET category_id = 1 WHERE category_id = ?;`,
          [id]
        );

        // Delete category
        tx.executeSql(
          `DELETE FROM categories WHERE id = ? AND id != 1;`,
          [id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };
return { addCategory, getCategories, deleteCategory };
}