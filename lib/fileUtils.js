import * as FileSystem from 'expo-file-system/legacy';

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
