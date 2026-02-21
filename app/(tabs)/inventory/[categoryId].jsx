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
  Animated,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useItems } from '../../../hooks/useItems';
import { useCategories } from '../../../hooks/useCategories';
import { useTheme } from '../../../lib/ThemeContext';
import { useToast } from '../../../lib/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';

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

export default function CategoryItems() {
  const { categoryId } = useLocalSearchParams();
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToMove, setItemToMove] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [datasheetUri, setDatasheetUri] = useState(null);
  const [itemImageUri, setItemImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const { getItemsByCategory, addItem, updateItem, deleteItem, searchItems } = useItems();
  const { getCategoryById, getCategories } = useCategories();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const fetchCategory = async () => {
    try {
      const data = await getCategoryById(parseInt(categoryId));
      setCategory(data);
      if (data) {
        navigation.setOptions({ title: data.name });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const data = await getCategories();
      setAllCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchItems = async () => {
    try {
      let data;
      if (searchQuery.trim()) {
        data = await searchItems(searchQuery, parseInt(categoryId));
      } else {
        data = await getItemsByCategory(parseInt(categoryId));
      }
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCategory();
    fetchItems();
    fetchAllCategories();
  }, [categoryId, searchQuery]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const asset = result.assets[0];
        const fileName = asset.name;
        const targetDir = `${FileSystem.documentDirectory}datasheets/`;
        
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }

        const newUri = `${targetDir}${Date.now()}_${fileName}`;
        await FileSystem.copyAsync({
          from: asset.uri,
          to: newUri,
        });
        setDatasheetUri(newUri);
        showToast('Datasheet attached', 'info');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setLoading(false);
    }
  };

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
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop();
        const targetDir = `${FileSystem.documentDirectory}images/`;
        
        const dirInfo = await FileSystem.getInfoAsync(targetDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
        }

        const newUri = `${targetDir}${Date.now()}_${fileName}`;
        await FileSystem.copyAsync({
          from: asset.uri,
          to: newUri,
        });
        setItemImageUri(newUri);
        showToast('Image attached', 'info');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setLoading(false);
    }
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

  const handleSaveItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setLoading(true);
    try {
      const qty = parseInt(quantity) || 0;
      if (editingItem) {
        await updateItem(editingItem.id, name.trim(), qty, datasheetUri, null, itemImageUri);
        showToast('Item updated', 'success');
      } else {
        await addItem(parseInt(categoryId), name.trim(), qty, datasheetUri, itemImageUri);
        showToast('Item added', 'success');
      }
      resetForm();
      fetchItems();
    } catch (error) {
      Alert.alert('Error', 'Could not save item');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveItem = async () => {
    if (!targetCategoryId || !itemToMove) return;
    setLoading(true);
    try {
      await updateItem(itemToMove.id, itemToMove.name, itemToMove.quantity, itemToMove.datasheet_uri, targetCategoryId);
      setMoveModalVisible(false);
      setItemToMove(null);
      setTargetCategoryId(null);
      fetchItems();
      showToast('Item moved successfully', 'success');
    } catch (error) {
      Alert.alert('Error', 'Could not move item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (id, itemName) => {
    Alert.alert('Delete Item', `Delete "${itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(id);
          fetchItems();
          showToast('Item deleted', 'info');
        },
      },
    ]);
  };

  const resetForm = () => {
    setName('');
    setQuantity('0');
    setDatasheetUri(null);
    setItemImageUri(null);
    setEditingItem(null);
    setModalVisible(false);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity.toString());
    setDatasheetUri(item.datasheet_uri);
    setItemImageUri(item.image_uri);
    setModalVisible(true);
  };

  const openMoveModal = (item) => {
    setItemToMove(item);
    setTargetCategoryId(null);
    setMoveModalVisible(true);
  };

  const renderItem = ({ item, index }) => (
    <FadeInView delay={index * 50} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfoSection}>
          {item.image_uri ? (
            <Image source={{ uri: item.image_uri }} style={[styles.itemThumbnail, { borderRadius: radius.md }]} />
          ) : (
            <View style={[styles.itemThumbnail, { backgroundColor: colors.surface, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.itemNameContainer}>
            <Text style={[styles.itemName, { color: colors.text, ...typography.bodySemi }]}>{item.name}</Text>
            <Text style={[styles.itemQty, { color: colors.textSecondary, ...typography.small }]}>Quantity: {item.quantity}</Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => openMoveModal(item)} style={styles.iconButton}>
            <Ionicons name="arrow-forward-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteItem(item.id, item.name)} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      {item.datasheet_uri && (
        <TouchableOpacity 
          style={[styles.datasheetButton, { backgroundColor: colors.surface, borderRadius: radius.md, marginTop: spacing.sm }]}
          onPress={() => handleViewDatasheet(item.datasheet_uri)}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.primary} />
          <Text style={[styles.datasheetText, { color: colors.primary, ...typography.small }]}>View PDF Datasheet</Text>
        </TouchableOpacity>
      )}
    </FadeInView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, ...typography.body }]}
          placeholder="Search items..."
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
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, ...typography.body }]}>No items in this category.</Text>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, borderRadius: radius.full, shadowColor: colors.primary, bottom: 24 }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, ...typography.h3 }]}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>
            
            <Text style={[styles.label, { color: colors.textSecondary, ...typography.small }]}>Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Resistor 10k"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.textSecondary, ...typography.small }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            <View style={styles.pickerActions}>
              <TouchableOpacity 
                style={[styles.pickButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={handlePickImage}
              >
                <Ionicons name="image-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, marginLeft: 8, ...typography.small }}>
                  {itemImageUri ? 'Change Image' : 'Add Image'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.pickButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={handlePickDocument}
              >
                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, marginLeft: 8, ...typography.small }}>
                  {datasheetUri ? 'Change PDF' : 'Add PDF'}
                </Text>
              </TouchableOpacity>
            </View>

            {(itemImageUri || datasheetUri) && (
              <View style={styles.attachmentsPreview}>
                {itemImageUri && <Image source={{ uri: itemImageUri }} style={[styles.previewThumbnail, { borderRadius: radius.sm }]} />}
                {datasheetUri && (
                  <View style={[styles.fileBadge, { backgroundColor: colors.primary + '20', borderRadius: radius.sm }]}>
                    <Ionicons name="document" size={12} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 10, marginLeft: 4 }} numberOfLines={1}>PDF Attached</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={resetForm}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary, ...typography.bodySemi }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary, borderRadius: radius.md }]} 
                onPress={handleSaveItem}
              >
                <Text style={[styles.buttonText, { color: '#FFF', ...typography.bodySemi }]}>
                  {loading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={moveModalVisible}
        onRequestClose={() => !loading && setMoveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, ...typography.h3 }]}>Move to Category</Text>
            <FlatList
              data={allCategories.filter(c => c.id !== parseInt(categoryId))}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    { 
                      borderColor: colors.border, 
                      borderRadius: radius.md,
                      backgroundColor: targetCategoryId === item.id ? colors.primary : colors.surface 
                    }
                  ]}
                  onPress={() => setTargetCategoryId(item.id)}
                  disabled={loading}
                >
                  <Text style={{ color: targetCategoryId === item.id ? '#FFF' : colors.text, ...typography.body }}>{item.name}</Text>
                  {targetCategoryId === item.id && <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300, marginBottom: 20 }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={() => setMoveModalVisible(false)}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary, ...typography.bodySemi }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  { backgroundColor: targetCategoryId ? colors.primary : colors.border, borderRadius: radius.md }
                ]} 
                onPress={handleMoveItem}
                disabled={!targetCategoryId || loading}
              >
                <Text style={[styles.buttonText, { color: '#FFF', ...typography.bodySemi }]}>{loading ? 'Moving...' : 'Move'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
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
  itemCard: {
    padding: 12,
    marginHorizontal: 8,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemInfoSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemThumbnail: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  itemNameContainer: { flex: 1 },
  itemName: { },
  itemQty: { marginTop: 2 },
  itemActions: { flexDirection: 'row' },
  iconButton: { marginLeft: 12, padding: 4 },
  datasheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datasheetText: { marginLeft: 6 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: { marginTop: 16 },
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
  modalContent: { width: '100%', padding: 24, elevation: 10 },
  modalTitle: { marginBottom: 20, textAlign: 'center' },
  label: { marginBottom: 6, marginLeft: 4 },
  input: { borderWidth: 1, padding: 12, marginBottom: 16 },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'center',
  },
  attachmentsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  previewThumbnail: {
    width: 40,
    height: 40,
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
  },
});

