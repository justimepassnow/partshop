import { db } from '../lib/database';

export function useItems() {
  const addItem = async (categoryId, name, quantity = 0, datasheetUri = null) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO items (category_id, name, quantity, datasheet_uri)
         VALUES (?, ?, ?, ?);`,
        [categoryId, name, quantity, datasheetUri]
      );
      return result;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const getItemsByCategory = async (categoryId) => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT * FROM items WHERE category_id = ?;`,
        [categoryId]
      );
      return allRows;
    } catch (error) {
      console.error('Error getting items by category:', error);
      throw error;
    }
  };

  const updateItem = async (id, name, quantity, datasheetUri = null) => {
    try {
      await db.runAsync(
        `UPDATE items SET name = ?, quantity = ?, datasheet_uri = ? WHERE id = ?;`,
        [name, quantity, datasheetUri, id]
      );
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  const deleteItem = async (id) => {
    try {
      await db.runAsync(
        `DELETE FROM items WHERE id = ?;`,
        [id]
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  const searchItems = async (query) => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT i.*, c.name as category_name 
         FROM items i 
         JOIN categories c ON i.category_id = c.id
         WHERE i.name LIKE ? OR c.name LIKE ?;`,
        [`%${query}%`, `%${query}%`]
      );
      return allRows;
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  };

  return { addItem, getItemsByCategory, updateItem, deleteItem, searchItems };
}
