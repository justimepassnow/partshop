import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCategories } from '../../../hooks/useCategories';
import { useItems } from '../../../hooks/useItems';
import { useTheme } from '../../../lib/ThemeContext';
import { useToast } from '../../../lib/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const FadeInView = (props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      delay: props.delay || 0,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={{ ...props.style, opacity: fadeAnim }}>
      {props.children}
    </Animated.View>
  );
};

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
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const router = useRouter();

  const fetchCategories = async () => {
    try {
      const data = await getCategories(); // Fetch all categories
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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const targetDir = `${FileSystem.documentDirectory}images/`;
        
        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }
        
        const newUri = `${targetDir}${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });
        setCategoryImageUri(newUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
      console.error('Pick Image Error:', error);
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

  const renderItem = ({ item, index }) => {
    if (item.type === 'item') {
      const itemDisplayImage = item.image_uri || item.category_image_uri;
      return (
        <FadeInView delay={index * 50} style={[styles.gridItemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
          <View style={styles.gridItemContent}>
            {itemDisplayImage ? (
              <Image source={{ uri: itemDisplayImage }} style={[styles.gridItemThumbnail, { borderRadius: radius.md }]} />
            ) : (
              <View style={[styles.gridItemThumbnail, { backgroundColor: colors.surface, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
              </View>
            )}
            <Text style={[styles.gridItemName, { color: colors.text, ...typography.bodySemi }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.gridCategoryLabel, { color: colors.primary, ...typography.small }]} numberOfLines={1}>{item.category_name}</Text>
            <Text style={[styles.gridItemQty, { color: colors.textSecondary, ...typography.small }]}>Qty: {item.quantity}</Text>
          </View>
          {item.datasheet_uri && (
            <TouchableOpacity 
              onPress={() => handleViewDatasheet(item.datasheet_uri)}
              style={styles.gridDatasheetIcon}
            >
              <Ionicons name="document-text" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </FadeInView>
      );
    }

    return (
      <FadeInView delay={index * 50}>
        <TouchableOpacity
          style={[styles.categoryCard, { backgroundColor: colors.card, borderRadius: radius.xl }]}
          onPress={() => router.push(`/inventory/${item.id}`)}
        >
          {item.image_uri ? (
            <Image source={{ uri: item.image_uri }} style={styles.categoryCardImage} />
          ) : (
            <View style={[styles.categoryCardImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="folder-outline" size={50} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.categoryCardOverlay}>
            <Text style={[styles.categoryCardName, { ...typography.bodySemi }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.categoryCountText, { ...typography.small }]}>{item.item_count || 0} items</Text>
          </View>
          {item.id !== 1 && !searchQuery.trim() && (
            <View style={styles.categoryCardActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.cardIconButton, { borderRadius: radius.full }]}>
                <Ionicons name="pencil" size={14} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCategory(item.id, item.name)} style={[styles.cardIconButton, { borderRadius: radius.full }]}>
                <Ionicons name="trash" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </FadeInView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, ...typography.body }]}
          placeholder="Search inventory..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={searchQuery.trim() ? searchResults : categories}
        keyExtractor={(item) => (item.type || 'category') + item.id.toString()}
        renderItem={renderItem}
        numColumns={2}
        key={searchQuery.trim() ? 'grid-search' : 'grid-categories'}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, ...typography.body }]}>
              {searchQuery.trim() ? 'No results found.' : 'No categories found.'}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.full, shadowColor: colors.primary, bottom: 24 }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, ...typography.h3 }]}>
              {categoryToEdit ? 'Edit Category' : 'Add Category'}
            </Text>
            
            <TouchableOpacity 
              style={[styles.imagePicker, { borderColor: colors.border, borderRadius: radius.lg }]} 
              onPress={handlePickImage}
            >
              {categoryImageUri ? (
                <Image source={{ uri: categoryImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, ...typography.small }}>Add Image</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              placeholder="Category Name"
              placeholderTextColor={colors.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={resetModal}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary, ...typography.bodySemi }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary, borderRadius: radius.md }]} 
                onPress={handleSaveCategory}
              >
                <Text style={[styles.buttonText, { color: '#FFF', ...typography.bodySemi }]}>
                  {categoryToEdit ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
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
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 16,
    height: 48,
    marginTop: 8,
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
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    backdropFilter: 'blur(10px)',
  },
  categoryCardName: {
    color: '#FFF',
    textAlign: 'center',
  },
  categoryCountText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  categoryCardActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
  },
  cardIconButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  gridItemCard: {
    width: cardWidth,
    margin: 8,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  gridItemContent: {
    alignItems: 'center',
  },
  gridItemThumbnail: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  gridItemName: {
    textAlign: 'center',
  },
  gridCategoryLabel: {
    marginVertical: 2,
  },
  gridItemQty: {
  },
  gridDatasheetIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    padding: 12,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
  },
});
