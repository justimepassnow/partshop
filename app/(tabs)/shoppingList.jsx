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
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useShoppingList } from '../../hooks/useShoppinglist';
import { useCategories } from '../../hooks/useCategories';
import { useTheme } from '../../lib/ThemeContext';
import { useToast } from '../../lib/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

export default function ShoppingList() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [targetQty, setTargetQty] = useState('1');
  const [selectedCategoryId, setSelectedCategoryId] = useState('1');
  const [loading, setLoading] = useState(false);

  const { 
    getShoppingList, 
    addToShoppingList, 
    deleteShoppingItem, 
    purchaseShoppingItemById,
    searchShoppingList
  } = useShoppingList();
  const { getCategories } = useCategories();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const fetchData = async (query = '') => {
    try {
      let listData;
      if (query.trim()) {
        listData = await searchShoppingList(query);
      } else {
        listData = await getShoppingList();
      }
      const catData = await getCategories();
      setList(listData);
      setCategories(catData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchData(searchQuery);
    }, [searchQuery])
  );

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setLoading(true);
    try {
      await addToShoppingList(parseInt(selectedCategoryId), name.trim(), parseInt(targetQty) || 1);
      resetForm();
      fetchData(searchQuery);
      showToast('Added to shopping list', 'success');
    } catch (error) {
      Alert.alert('Error', 'Could not add to list');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePurchase = async (item) => {
    setLoading(true);
    try {
      // Automatically move to inventory when checked
      await purchaseShoppingItemById(item.id);
      fetchData(searchQuery);
      showToast(`${item.name} moved to inventory`, 'success');
    } catch (error) {
      Alert.alert('Error', 'Could not process purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
      await deleteShoppingItem(id);
      fetchData(searchQuery);
      showToast('Item removed', 'info');
  };

  const resetForm = () => {
    setName('');
    setTargetQty('1');
    setSelectedCategoryId('1');
    setModalVisible(false);
    setLoading(false);
  };

  const renderItem = ({ item, index }) => (
    <FadeInView delay={index * 50}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <TouchableOpacity 
          onPress={() => handleTogglePurchase(item)} 
          style={[styles.checkButton, { backgroundColor: colors.surface, borderRadius: radius.full, borderColor: colors.primary }]}
          disabled={loading}
        >
          <View style={[styles.checkInner, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons 
              name="checkmark" 
              size={18} 
              color={loading ? colors.border : colors.primary} 
            />
          </View>
        </TouchableOpacity>

        <View style={styles.cardInfo}>
          <Text style={[styles.itemName, { color: colors.text, ...typography.bodySemi }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.qtyBadge, { backgroundColor: colors.surface, borderRadius: radius.sm }]}>
              <Text style={[styles.itemSub, { color: colors.textSecondary, ...typography.small }]}>
                {item.target_quantity} pcs
              </Text>
            </View>
            <Text style={[styles.categoryLabel, { color: colors.textSecondary, ...typography.small }]} numberOfLines={1}>
              in {item.category_name || 'Uncategorized'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => handleDelete(item.id)} 
          style={[styles.deleteButton, { backgroundColor: colors.danger + '10', borderRadius: radius.md }]}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </FadeInView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, ...typography.body }]}
          placeholder="Search shopping list..."
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
        data={list}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: spacing.sm, paddingBottom: 80 + insets.bottom }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, ...typography.body }]}>Your shopping list is empty.</Text>
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
        onRequestClose={() => !loading && resetForm()}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <Text style={[styles.modalTitle, { color: colors.text, ...typography.h3 }]}>Add to Shopping List</Text>
            
            <Text style={[styles.label, { color: colors.textSecondary, ...typography.small }]}>Item Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              placeholder="e.g. Capacitor 100uF"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textSecondary, ...typography.small }]}>Target Quantity</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              value={targetQty}
              onChangeText={setTargetQty}
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textSecondary, ...typography.small }]}>Destination Category</Text>
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
                        backgroundColor: selectedCategoryId === item.id.toString() ? colors.primary : colors.surface,
                        borderColor: selectedCategoryId === item.id.toString() ? colors.primary : colors.border,
                        borderRadius: radius.full
                      }
                    ]}
                    disabled={loading}
                  >
                    <Text style={{ 
                      color: selectedCategoryId === item.id.toString() ? '#FFF' : colors.text,
                      ...typography.small
                    }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
               />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={resetForm}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary, ...typography.bodySemi }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary, borderRadius: radius.md }]} 
                onPress={handleAddItem}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: '#FFF', ...typography.bodySemi }]}>
                  {loading ? "Adding..." : "Add"}
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
  container: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    height: 48,
    marginTop: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1 },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { 
    flex: 1,
    justifyContent: 'center',
  },
  itemName: { fontSize: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  itemSub: { fontSize: 11, fontWeight: '600' },
  categoryLabel: { fontSize: 12, opacity: 0.6 },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: { marginTop: 16, textAlign: 'center' },
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
  input: { borderWidth: 1, padding: 12, marginBottom: 16 },
  label: { marginBottom: 6, marginLeft: 4 },
  pickerContainer: { marginBottom: 24 },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { },
});