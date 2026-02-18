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
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCategories } from '../../../hooks/useCategories';
import { useTheme } from '../../../lib/ThemeContext';
import { useToast } from '../../../lib/ToastContext';
import { Ionicons } from '@expo/vector-icons';

export default function InventoryIndex() {
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { getCategories, addCategory, deleteCategory } = useCategories();
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

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [])
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }
    try {
      const name = newCategoryName.trim();
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      await addCategory(capitalized);
      setNewCategoryName('');
      setModalVisible(false);
      fetchCategories();
      showToast('Category added successfully', 'success');
    } catch (error) {
      Alert.alert('Error', 'Could not add category');
    }
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

  const renderItem = ({ item }) => (
    <View style={[styles.categoryItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={styles.categoryInfo}
        onPress={() => router.push(`/inventory/${item.id}`)}
      >
        <Text style={[styles.categoryName, { color: theme.text }]}>{item.name}</Text>
      </TouchableOpacity>
      {item.id !== 1 && (
        <TouchableOpacity onPress={() => handleDeleteCategory(item.id, item.name)}>
          <Ionicons name="trash-outline" size={24} color={theme.danger} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <Text style={[styles.emptyText, { color: theme.text }]}>No categories found.</Text>
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
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Category</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Category Name"
              placeholderTextColor={theme.border}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} color={theme.danger} />
              <Button title="Add" onPress={handleAddCategory} color={theme.primary} />
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
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '500',
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