
import { db } from '../lib/database';

export function useShoppingList() {

  const addToShoppingList = (categoryId, name, targetQty = 1) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO shopping_list
           (target_category_id, name, target_quantity)
           VALUES (?, ?, ?);`,
          [categoryId, name, targetQty],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  };

  const getShoppingList = () => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM shopping_list ORDER BY is_purchased ASC;`,
          [],
          (_, result) => resolve(result.rows._array),
          (_, error) => reject(error)
        );
      });
    });
  };

  const togglePurchased = (id, currentValue) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE shopping_list SET is_purchased = ? WHERE id = ?;`,
          [currentValue ? 0 : 1, id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };

  const deleteShoppingItem = (id) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `DELETE FROM shopping_list WHERE id = ?;`,
          [id],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  };

  return {
    addToShoppingList,
    getShoppingList,
    togglePurchased,
    deleteShoppingItem
  };
}
