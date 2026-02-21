import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { db } from './database';

/**
 * Basic CSV Parser
 * Handles simple CSV structures. For complex ones (with quoted commas), 
 * a library like papaparse would be better, but this keeps the app lightweight.
 */
const parseCSV = (text) => {
  if (!text) return [];
  // Split by newline (handles CRLF and LF)
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const row = line.split(',').map(cell => cell.trim());
    if (row.length !== headers.length) continue;

    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = row[index];
    });
    results.push(entry);
  }
  return results;
};

export const importFromCSV = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/comma-separated-values',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return { success: false, message: 'Import cancelled' };

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    const data = parseCSV(fileContent);

    if (data.length === 0) {
      return { success: false, message: 'No valid data found in CSV' };
    }

    // Validate headers
    const required = ['category', 'name', 'quantity'];
    const headers = Object.keys(data[0]);
    const missing = required.filter(r => !headers.includes(r));

    if (missing.length > 0) {
      return { success: false, message: `Missing columns: ${missing.join(', ')}` };
    }

    let importedCount = 0;
    let errorCount = 0;

    // Use a transaction for performance and atomicity
    await db.withTransactionAsync(async () => {
      for (const row of data) {
        try {
          const categoryName = row.category || 'Uncategorized';
          const itemName = row.name;
          const quantity = parseInt(row.quantity) || 0;

          if (!itemName) {
            errorCount++;
            continue;
          }

          // 1. Ensure category exists
          await db.runAsync(
            'INSERT OR IGNORE INTO categories (name) VALUES (?)',
            [categoryName]
          );

          // 2. Get Category ID and image
          const cat = await db.getFirstAsync(
            'SELECT id, image_uri FROM categories WHERE name = ?',
            [categoryName]
          );

          // 3. Insert or Update Item
          // If inserting a NEW item (not updating), we can default its image to the category's image
          await db.runAsync(
            `INSERT INTO items (category_id, name, quantity, image_uri) 
             VALUES (?, ?, ?, ?)
             ON CONFLICT(category_id, name) DO UPDATE SET
             quantity = quantity + excluded.quantity`,
            [cat.id, itemName, quantity, cat.image_uri]
          );

          importedCount++;
        } catch (err) {
          console.error('Row import error:', err);
          errorCount++;
        }
      }
    });

    return { 
      success: true, 
      message: `Imported ${importedCount} items successfully.${errorCount > 0 ? ` (${errorCount} rows failed)` : ''}` 
    };
  } catch (error) {
    console.error('Import Error:', error);
    return { success: false, message: 'Failed to process CSV file' };
  }
};

export const exportToCSV = async () => {
  try {
    const allRows = await db.getAllAsync(
      `SELECT c.name as category, i.name, i.quantity 
       FROM items i 
       JOIN categories c ON i.category_id = c.id
       ORDER BY c.name ASC, i.name ASC;`
    );

    if (allRows.length === 0) {
      return { success: false, message: 'No data to export' };
    }

    const headers = 'category,name,quantity\n';
    const csvContent = allRows.map(row => 
      `${row.category},${row.name},${row.quantity}`
    ).join('\n');

    const fileUri = `${FileSystem.cacheDirectory}partshop_export_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, headers + csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Inventory Data',
        UTI: 'public.comma-separated-values-text',
      });
      return { success: true, message: 'Data exported successfully' };
    } else {
      return { success: false, message: 'Sharing is not available on this device' };
    }
  } catch (error) {
    console.error('Export Error:', error);
    return { success: false, message: 'Failed to export CSV file' };
  }
};
