import { db } from '../lib/database';

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
      await db.runAsync(
        `UPDATE categories SET name = ?, image_uri = ? WHERE id = ?;`,
        [name, imageUri, id]
      );
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const getCategories = async () => {
    try {
      const allRows = await db.getAllAsync(
        `SELECT * FROM categories ORDER BY (id = 1) ASC, name ASC;`
      );
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
      
          return { addCategory, getCategories, deleteCategory, getCategoryById, searchCategories, updateCategory };
        }