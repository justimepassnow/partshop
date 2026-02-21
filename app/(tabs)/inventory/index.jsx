import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  Alert,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCategories } from '../../../hooks/useCategories';
import { useItems } from '../../../hooks/useItems';
import { useTheme } from '../../../lib/ThemeContext';
import { useToast } from '../../../lib/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function InventoryIndex() {
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryImageUri, setCategoryImageUri] = useState(null);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const { getCategories, addCategory, deleteCategory, searchCategories, updateCategory } = useCategories();
  const { searchItems } = useItems();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const [catResults, itemResults] = await Promise.all([
        searchCategories(query),
        searchItems(query)
      ]);

      const formattedCats = catResults.map(c => ({ ...c, type: 'category' }));
      const formattedItems = itemResults.map(i => ({ ...i, type: 'item' }));

      setSearchResults([...formattedCats, ...formattedItems]);
    } catch (error) {
      console.error(error);
    }
  };

  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (!searchQueryRef.current.trim()) {
        fetchCategories();
      } else {
        performSearch(searchQueryRef.current);
      }
    }, [])
  );

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const targetDir = `${FileSystem.documentDirectory}images/`;
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }
        const newUri = `${targetDir}${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });
        setCategoryImageUri(newUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }
    try {
      const name = newCategoryName.trim();
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, capitalized, categoryImageUri);
        showToast('Category updated successfully', 'success');
      } else {
        await addCategory(capitalized, categoryImageUri);
        showToast('Category added successfully', 'success');
      }
      
      resetModal();
      fetchCategories();
      if (searchQuery.trim()) performSearch(searchQuery);
    } catch (error) {
      Alert.alert('Error', 'Could not save category');
    }
  };

  const resetModal = () => {
    setNewCategoryName('');
    setCategoryImageUri(null);
    setCategoryToEdit(null);
    setModalVisible(false);
  };

  const openEditModal = (category) => {
    setCategoryToEdit(category);
    setNewCategoryName(category.name);
    setCategoryImageUri(category.image_uri);
    setModalVisible(true);
  };

  const handleDeleteCategory = (id, name) => {
    if (id === 1) {
      Alert.alert('Cannot Delete', 'The Uncategorized category cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? Items in this category will be moved to Uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(id);
            fetchCategories();
            showToast(`Deleted "${name}"`, 'info');
          },
        },
      ]
    );
  };

  const handleViewDatasheet = async (uri) => {
    if (!uri) return;
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        });
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open datasheet');
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === 'item') {
      return (
        <View style={[styles.gridItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.gridItemContent}>
            {item.image_uri ? (
              <Image source={{ uri: item.image_uri }} style={styles.gridItemThumbnail} />
            ) : (
              <View style={[styles.gridItemThumbnail, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="cube-outline" size={30} color={theme.card} />
              </View>
            )}
            <Text style={[styles.gridItemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.gridCategoryLabel, { color: theme.primary }]} numberOfLines={1}>{item.category_name}</Text>
            <Text style={[styles.gridItemQty, { color: theme.text }]}>Qty: {item.quantity}</Text>
          </View>
          {item.datasheet_uri && (
            <TouchableOpacity 
              onPress={() => handleViewDatasheet(item.datasheet_uri)}
              style={styles.gridDatasheetIcon}
            >
              <Ionicons name="document-text" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: theme.card }]}
        onPress={() => router.push(`/inventory/${item.id}`)}
      >
        {item.image_uri ? (
          <Image source={{ uri: item.image_uri }} style={styles.categoryCardImage} />
        ) : (
          <View style={[styles.categoryCardImage, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="folder-outline" size={50} color={theme.card} />
          </View>
        )}
        <View style={styles.categoryCardOverlay}>
          <Text style={styles.categoryCardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.categoryCountText}>{item.item_count || 0} items</Text>
        </View>
        {item.id !== 1 && !searchQuery.trim() && (
          <View style={styles.categoryCardActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.cardIconButton}>
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCategory(item.id, item.name)} style={styles.cardIconButton}>
              <Ionicons name="trash" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.border} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search inventory..."
          placeholderTextColor={theme.border}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={searchQuery.trim() ? searchResults : categories}
        keyExtractor={(item) => (item.type || 'category') + item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        key={searchQuery.trim() ? 'grid-search' : 'grid-categories'}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={() => (
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {searchQuery.trim() ? 'No results found.' : 'No categories found.'}
          </Text>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {categoryToEdit ? 'Edit Category' : 'Add Category'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.imagePicker, { borderColor: theme.border }]} 
              onPress={handlePickImage}
            >
              {categoryImageUri ? (
                <Image source={{ uri: categoryImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={theme.border} />
                  <Text style={{ color: theme.border }}>Add Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Category Name"
              placeholderTextColor={theme.border}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={resetModal} color={theme.danger} />
              <Button title={categoryToEdit ? "Update" : "Add"} onPress={handleSaveCategory} color={theme.primary} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1 },
  row: {
    justifyContent: 'flex-start',
  },
  categoryCard: {
    width: cardWidth,
    height: cardWidth,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryCardImage: {
    width: '100%',
    height: '100%',
  },
  categoryCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
  },
  categoryCardName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  categoryCountText: {
    color: '#EEE',
    fontSize: 12,
    textAlign: 'center',
  },
  categoryCardActions: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
  },
  cardIconButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  gridItemCard: {
    width: cardWidth,
    margin: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  gridItemContent: {
    alignItems: 'center',
  },
  gridItemThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 8,
  },
  gridItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridCategoryLabel: {
    fontSize: 11,
    marginVertical: 2,
  },
  gridItemQty: {
    fontSize: 12,
  },
  gridDatasheetIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
