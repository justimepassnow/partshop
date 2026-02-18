import { db } from '../lib/database';

export function useCategories() {
  const addCategory = async (name) => {
    try {
      const result = await db.runAsync(
        `INSERT INTO categories (name) VALUES (?);`,
        [name]
      );
      return result;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const getCategories = async () => {
    try {
      const allRows = await db.getAllAsync(`SELECT * FROM categories ORDER BY name ASC;`);
      return allRows;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  };

  const deleteCategory = async (id) => {
    try {
      // Don't delete Uncategorized
      if (id === 1) return;

      // Move items to Uncategorized (id = 1)
      await db.runAsync(
        `UPDATE items SET category_id = 1 WHERE category_id = ?;`,
        [id]
      );

      // Delete category
      await db.runAsync(
        `DELETE FROM categories WHERE id = ? AND id != 1;`,
        [id]
      );
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return { addCategory, getCategories, deleteCategory };
}