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
import { useFocusEffect } from 'expo-router';
import { useShoppingList } from '../../hooks/useShoppinglist';
import { useCategories } from '../../hooks/useCategories';
import { useTheme } from '../../lib/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function ShoppingList() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetQty, setTargetQty] = useState('1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('1');

  const { 
    getShoppingList, 
    addToShoppingList, 
    togglePurchased, 
    deleteShoppingItem, 
    purchaseShoppingItem 
  } = useShoppingList();
  const { getCategories } = useCategories();
  const { theme } = useTheme();

  const fetchData = async () => {
    try {
      const [listData, catData] = await Promise.all([
        getShoppingList(),
        getCategories()
      ]);
      setList(listData);
      setCategories(catData);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    try {
      await addToShoppingList(parseInt(selectedCategoryId), name.trim(), parseInt(targetQty) || 1);
      resetForm();
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Could not add to list');
    }
  };

  const handlePurchase = (item) => {
    Alert.alert(
      'Mark as Purchased?',
      `Confirming will move "${item.name}" (Qty: ${item.target_quantity}) to your Inventory in category "${item.category_name || 'Uncategorized'}" and remove it from this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            await purchaseShoppingItem(item);
            fetchData();
          } 
        },
      ]
    );
  };

  const resetForm = () => {
    setName('');
    setTargetQty('1');
    setSelectedCategoryId('1');
    setModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.cardInfo}>
        <Text style={[
          styles.itemName, 
          { color: theme.text, textDecorationLine: item.is_purchased ? 'line-through' : 'none' }
        ]}>
          {item.name}
        </Text>
        <Text style={[styles.itemSub, { color: theme.text, opacity: 0.7 }]}>
          Qty: {item.target_quantity} | {item.category_name || 'Uncategorized'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity 
          onPress={() => togglePurchased(item.id, item.is_purchased)} 
          style={styles.iconButton}
        >
          <Ionicons 
            name={item.is_purchased ? "checkbox" : "checkbox-outline"} 
            size={24} 
            color={item.is_purchased ? theme.primary : theme.text} 
          />
        </TouchableOpacity>
        
        {item.is_purchased && (
          <TouchableOpacity 
            onPress={() => handlePurchase(item)} 
            style={[styles.actionBtn, {backgroundColor: theme.primary}]}
          >
            <Ionicons name="archive-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={() => deleteShoppingItem(item.id)} 
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={24} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text }]}>Your shopping list is empty.</Text>
        }
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
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add to Shopping List</Text>
            
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Item Name"
              placeholderTextColor={theme.border}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Target Quantity"
              placeholderTextColor={theme.border}
              value={targetQty}
              onChangeText={setTargetQty}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: theme.text }]}>Destination Category</Text>
            <View style={styles.pickerContainer}>
               <FlatList
                data={categories}
                horizontal
                keyExtractor={(item) => item.id.toString()}
                renderItem={({item}) => (
                  <TouchableOpacity 
                    onPress={() => setSelectedCategoryId(item.id.toString())}
                    style={[
                      styles.catChip, 
                      { 
                        backgroundColor: selectedCategoryId === item.id.toString() ? theme.primary : theme.background,
                        borderColor: theme.primary
                      }
                    ]}
                  >
                    <Text style={{ color: selectedCategoryId === item.id.toString() ? '#FFF' : theme.text }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
               />
            </View>

            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={resetForm} color={theme.danger} />
              <Button title="Add" onPress={handleAddItem} color={theme.primary} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemSub: { fontSize: 14, marginTop: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8 },
  actionBtn: { 
    padding: 8, 
    borderRadius: 8, 
    marginHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
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
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  pickerContainer: { marginBottom: 20 },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginVertical: 4,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around' },
});