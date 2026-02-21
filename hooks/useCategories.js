import { db } from '../lib/database';
import { safeDeleteFile } from '../lib/fileUtils';

export function useCategories() {
  const addCategory = async (name, imageUri = null) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO categories (name, image_uri) VALUES (?, ?);`,
        [name, imageUri]
      );
      return result;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (id, name, imageUri = null) => {
    try {
      const current = await getCategoryById(id);
      
      await db.runAsync(
        `UPDATE categories SET name = ?, image_uri = ? WHERE id = ?;`,
        [name, imageUri, id]
      );

      if (imageUri && current && current.image_uri && current.image_uri !== imageUri) {
        await safeDeleteFile(current.image_uri);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const getCategories = async () => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT c.*, COUNT(i.id) as item_count 
         FROM categories c 
         LEFT JOIN items i ON c.id = i.category_id 
         GROUP BY c.id 
         ORDER BY (c.id = 1) ASC, c.name ASC;`
      );
      return allRows;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    try {
      if (id === 1) return;

      const category = await getCategoryById(id);

      await db.withTransactionAsync(async () => {
        // 1. Move inventory items to Uncategorized (id = 1)
        await db.runAsync(
          `UPDATE items SET category_id = 1 WHERE category_id = ?;`,
          [id]
        );

        // 2. Move shopping list items to Uncategorized (id = 1)
        // This is crucial to avoid FOREIGN KEY constraint failure
        await db.runAsync(
          `UPDATE shopping_list SET target_category_id = 1 WHERE target_category_id = ?;`,
          [id]
        );

        // 3. Delete category
        await db.runAsync(
          `DELETE FROM categories WHERE id = ? AND id != 1;`,
          [id]
        );
      });

      if (category && category.image_uri) {
        await safeDeleteFile(category.image_uri);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  const getCategoryById = async (id) => {
    try {
      const category = await db.getFirstAsync(`SELECT * FROM categories WHERE id = ?;`, [id]);
      return category;
    } catch (error) {
      console.error('Error getting category by id:', error);
      throw error;
    }
  };

  const searchCategories = async (query) => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT * FROM categories WHERE name LIKE ? ORDER BY (id = 1) ASC, name ASC;`,
        [`%${query}%`]
      );
      return allRows;
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  };

  return { 
    addCategory, 
    getCategories, 
    deleteCategory, 
    getCategoryById, 
    searchCategories, 
    updateCategory 
  };
}
