import { db } from '../lib/database';
import { safeDeleteFile } from '../lib/fileUtils';

export function useItems() {
  const addItem = async (categoryId, name, quantity = 0, datasheetUri = null, imageUri = null) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO items (category_id, name, quantity, datasheet_uri, image_uri)
         VALUES (?, ?, ?, ?, ?);`,
        [categoryId, name, quantity, datasheetUri, imageUri]
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
        `SELECT i.*, c.image_uri as category_image_uri 
         FROM items i 
         JOIN categories c ON i.category_id = c.id 
         WHERE i.category_id = ?;`,
        [categoryId]
      );
      return allRows;
    } catch (error) {
      console.error('Error getting items by category:', error);
      throw error;
    }
  };

  const getItemById = async (id) => {
    try {
      const item = await db.getFirstAsync(`SELECT * FROM items WHERE id = ?;`, [id]);
      return item;
    } catch (error) {
      console.error('Error getting item by id:', error);
      throw error;
    }
  };

  const updateItem = async (id, name, quantity, datasheetUri = null, categoryId = null, imageUri = null) => {
    try {
      // Get the current item to check for existing media URIs
      const current = await getItemById(id);

      if (categoryId) {
        await db.runAsync(
          `UPDATE items SET name = ?, quantity = ?, datasheet_uri = ?, category_id = ?, image_uri = ? WHERE id = ?;`,
          [name, quantity, datasheetUri, categoryId, imageUri, id]
        );
      } else {
        await db.runAsync(
          `UPDATE items SET name = ?, quantity = ?, datasheet_uri = ?, image_uri = ? WHERE id = ?;`,
          [name, quantity, datasheetUri, imageUri, id]
        );
      }

      // Cleanup old media files if they were changed
      if (current) {
        if (imageUri && current.image_uri && current.image_uri !== imageUri) {
          await safeDeleteFile(current.image_uri);
        }
        if (datasheetUri && current.datasheet_uri && current.datasheet_uri !== datasheetUri) {
          await safeDeleteFile(current.datasheet_uri);
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  const deleteItem = async (id) => {
    try {
      // Get the item first to retrieve media URIs
      const item = await getItemById(id);

      await db.runAsync(
        `DELETE FROM items WHERE id = ?;`,
        [id]
      );

      // Cleanup media files after deletion
      if (item) {
        if (item.image_uri) await safeDeleteFile(item.image_uri);
        if (item.datasheet_uri) await safeDeleteFile(item.datasheet_uri);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  const searchItems = async (query, categoryId = null) => {
    try {
      let queryStr = `
        SELECT i.*, c.name as category_name, c.image_uri as category_image_uri 
        FROM items i 
        JOIN categories c ON i.category_id = c.id
        WHERE (i.name LIKE ? OR c.name LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`];

      if (categoryId) {
        queryStr += ` AND i.category_id = ?`;
        params.push(categoryId);
      }

      const allRows = await db.getAllAsync(queryStr, params);
      return allRows;
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  };

  return { addItem, getItemsByCategory, getItemById, updateItem, deleteItem, searchItems };
}
