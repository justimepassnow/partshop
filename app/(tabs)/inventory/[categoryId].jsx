import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useItems } from '../../../hooks/useItems';
import { useCategories } from '../../../hooks/useCategories';
import { useTheme } from '../../../lib/ThemeContext';
import { useToast } from '../../../lib/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

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

  const { getItemsByCategory, addItem, updateItem, deleteItem, searchItems } = useItems();
  const { getCategoryById, getCategories } = useCategories();
  const { theme } = useTheme();
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
        data = await searchItems(searchQuery);
        // Filter by category if searching across all
        data = data.filter(item => item.category_id === parseInt(categoryId));
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
    try {
      const qty = parseInt(quantity) || 0;
      if (editingItem) {
        await updateItem(editingItem.id, name.trim(), qty, datasheetUri);
        showToast('Item updated', 'success');
      } else {
        await addItem(parseInt(categoryId), name.trim(), qty, datasheetUri);
        showToast('Item added', 'success');
      }
      resetForm();
      fetchItems();
    } catch (error) {
      Alert.alert('Error', 'Could not save item');
    }
  };

  const handleMoveItem = async () => {
    if (!targetCategoryId || !itemToMove) return;
    try {
      await updateItem(itemToMove.id, itemToMove.name, itemToMove.quantity, itemToMove.datasheet_uri, targetCategoryId);
      setMoveModalVisible(false);
      setItemToMove(null);
      setTargetCategoryId(null);
      fetchItems();
      showToast('Item moved successfully', 'success');
    } catch (error) {
      Alert.alert('Error', 'Could not move item');
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
    setEditingItem(null);
    setModalVisible(false);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity.toString());
    setDatasheetUri(item.datasheet_uri);
    setModalVisible(true);
  };

  const openMoveModal = (item) => {
    setItemToMove(item);
    setTargetCategoryId(null);
    setMoveModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.itemHeader}>
        <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => openMoveModal(item)} style={styles.iconButton}>
            <Ionicons name="arrow-forward-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteItem(item.id, item.name)} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <Text style={[styles.itemQty, { color: theme.text }]}>Quantity: {item.quantity}</Text>
        {item.datasheet_uri && (
          <TouchableOpacity 
            style={[styles.datasheetButton, { backgroundColor: theme.primary }]}
            onPress={() => handleViewDatasheet(item.datasheet_uri)}
          >
            <Ionicons name="document-text-outline" size={16} color="#FFF" />
            <Text style={styles.datasheetText}>View PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.border} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search items..."
          placeholderTextColor={theme.border}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <Text style={[styles.emptyText, { color: theme.text }]}>No items in this category.</Text>
        )}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </Text>
            
            <Text style={[styles.label, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Resistor 10k"
              placeholderTextColor={theme.border}
            />

            <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={[styles.pickButton, { borderColor: theme.primary }]} 
              onPress={handlePickDocument}
            >
              <Ionicons name="attach" size={20} color={theme.primary} />
              <Text style={{ color: theme.primary, marginLeft: 8 }}>
                {datasheetUri ? 'Change Datasheet' : 'Select Datasheet (PDF)'}
              </Text>
            </TouchableOpacity>
            {datasheetUri && <Text style={{color: theme.text, fontSize: 12, marginBottom: 10}} numberOfLines={1}>Selected: {datasheetUri.split('/').pop()}</Text>}

            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={resetForm} color={theme.danger} />
              <Button title="Save" onPress={handleSaveItem} color={theme.primary} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Move Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={moveModalVisible}
        onRequestClose={() => setMoveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Move to Category</Text>
            <FlatList
              data={allCategories.filter(c => c.id !== parseInt(categoryId))}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    { borderColor: theme.border, backgroundColor: targetCategoryId === item.id ? theme.primary : 'transparent' }
                  ]}
                  onPress={() => setTargetCategoryId(item.id)}
                >
                  <Text style={{ color: targetCategoryId === item.id ? '#FFF' : theme.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300, marginBottom: 20 }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.customButton, { backgroundColor: theme.danger }]} 
                onPress={() => setMoveModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.customButton, 
                  { backgroundColor: targetCategoryId ? theme.primary : '#ccc' }
                ]} 
                onPress={handleMoveItem}
                disabled={!targetCategoryId}
              >
                <Text style={styles.buttonText}>Move</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1 },
  itemCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  itemActions: { flexDirection: 'row' },
  iconButton: { marginLeft: 16 },
  itemDetails: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 10 
  },
  itemQty: { fontSize: 16 },
  datasheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  datasheetText: { color: '#FFF', marginLeft: 6, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '85%', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 4 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 16 },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  categoryOption: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  customButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
