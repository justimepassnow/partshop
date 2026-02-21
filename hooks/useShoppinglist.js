import { db } from '../lib/database';

export function useShoppingList() {
  const addToShoppingList = async (categoryId, name, targetQty = 1) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO shopping_list
         (target_category_id, name, target_quantity)
         VALUES (?, ?, ?);`,
        [categoryId, name, targetQty]
      );
      return result;
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      throw error;
    }
  };

  const getShoppingList = async () => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT sl.*, c.name as category_name 
         FROM shopping_list sl 
         LEFT JOIN categories c ON sl.target_category_id = c.id 
         ORDER BY sl.is_purchased ASC;`
      );
      return allRows;
    } catch (error) {
      console.error('Error getting shopping list:', error);
      throw error;
    }
  };

  const togglePurchased = async (id, currentValue) => {
    try {
      await db.runAsync(
        `UPDATE shopping_list SET is_purchased = ? WHERE id = ?;`,
        [currentValue ? 0 : 1, id]
      );
    } catch (error) {
      console.error('Error toggling purchased status:', error);
      throw error;
    }
  };

  const deleteShoppingItem = async (id) => {
    try {
      await db.runAsync(
        `DELETE FROM shopping_list WHERE id = ?;`,
        [id]
      );
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  };

  const purchaseShoppingItem = async (item) => {
    try {
      await db.withTransactionAsync(async () => {
        // 1. Check if item already exists in inventory (by category and name)
        const targetCatId = item.target_category_id || 1;
        const existing = await db.getFirstAsync(
          'SELECT id, quantity FROM items WHERE category_id = ? AND name = ?',
          [targetCatId, item.name]
        );

        if (existing) {
          // 2a. Update quantity if it exists
          await db.runAsync(
            'UPDATE items SET quantity = quantity + ? WHERE id = ?',
            [item.target_quantity, existing.id]
          );
        } else {
          // 2b. Insert as new item if it doesn't exist
          await db.runAsync(
            'INSERT INTO items (category_id, name, quantity) VALUES (?, ?, ?)',
            [targetCatId, item.name, item.target_quantity]
          );
        }
        // 3. Remove from shopping list
        await db.runAsync(`DELETE FROM shopping_list WHERE id = ?;`, [item.id]);
      });
    } catch (error) {
      console.error('Error purchasing shopping item:', error);
      throw error;
    }
  };

  const purchaseShoppingItemById = async (id) => {
    try {
      // Get the item details first
      const item = await db.getFirstAsync(`SELECT * FROM shopping_list WHERE id = ?;`, [id]);
      if (item) {
        await purchaseShoppingItem(item);
      }
    } catch (error) {
      console.error('Error purchasing shopping item by id:', error);
      throw error;
    }
  };

  const searchShoppingList = async (query) => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT sl.*, c.name as category_name 
         FROM shopping_list sl 
         LEFT JOIN categories c ON sl.target_category_id = c.id 
         WHERE sl.name LIKE ? OR c.name LIKE ?
         ORDER BY sl.is_purchased ASC;`,
        [`%${query}%`, `%${query}%`]
      );
      return allRows;
    } catch (error) {
      console.error('Error searching shopping list:', error);
      throw error;
    }
  };

  return {
    addToShoppingList,
    getShoppingList,
    togglePurchased,
    deleteShoppingItem,
    purchaseShoppingItem,
    purchaseShoppingItemById,
    searchShoppingList,
  };
}
