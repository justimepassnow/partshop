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
      // Get the current category to check for existing image_uri
      const current = await getCategoryById(id);
      
      await db.runAsync(
        `UPDATE categories SET name = ?, image_uri = ? WHERE id = ?;`,
        [name, imageUri, id]
      );

      // If the image was updated (new uri provided and it's different), cleanup the old one
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
      // Don't delete Uncategorized
      if (id === 1) return;

      // Get the category first to get the image_uri
      const category = await getCategoryById(id);

      await db.withTransactionAsync(async () => {
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
      });

      // Cleanup image after successful transaction
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
      
          return { addCategory, getCategories, deleteCategory, getCategoryById, searchCategories, updateCategory };
        }