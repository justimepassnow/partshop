import * as FileSystem from 'expo-file-system/legacy';

const IMAGES_DIR = `${FileSystem.documentDirectory}images/`;
const DATASHEETS_DIR = `${FileSystem.documentDirectory}datasheets/`;

/**
 * Safely deletes a file from the filesystem if it exists.
 * @param {string} uri - The URI of the file to delete.
 */
export const safeDeleteFile = async (uri) => {
  if (!uri) return;
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.error(`Error deleting file at ${uri}:`, error);
  }
};

/**
 * Deletes the entire images and datasheets directories and recreates them.
 */
export const clearAllDataFiles = async () => {
  try {
    // Clear Images
    const imgDirInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (imgDirInfo.exists) {
      await FileSystem.deleteAsync(IMAGES_DIR, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });

    // Clear Datasheets
    const dsDirInfo = await FileSystem.getInfoAsync(DATASHEETS_DIR);
    if (dsDirInfo.exists) {
      await FileSystem.deleteAsync(DATASHEETS_DIR, { idempotent: true });
    }
    await FileSystem.makeDirectoryAsync(DATASHEETS_DIR, { intermediates: true });
  } catch (error) {
    console.error('Error clearing data directories:', error);
  }
};
