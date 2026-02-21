import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useToast } from '../../lib/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { importFromCSV, exportToCSV } from '../../lib/importUtils';
import { deleteAllInventoryData } from '../../lib/database';

export default function SettingsScreen() {
  const { colors, spacing, radius, typography, userTheme, setThemePreference } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCSVImport = async () => {
    setIsImporting(true);
    try {
      const result = await importFromCSV();
      if (result.success) {
        showToast(result.message, 'success');
      } else if (result.message !== 'Import cancelled') {
        Alert.alert('Import Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCSVExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportToCSV();
      if (result.success) {
        showToast(result.message, 'success');
      } else if (result.message !== 'No data to export' && result.message !== 'Sharing is not available on this device') {
        Alert.alert('Export Error', result.message);
      } else if (result.message === 'No data to export') {
        showToast(result.message, 'info');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (confirmText.toLowerCase() !== 'confirm') {
      Alert.alert('Invalid Confirmation', 'Please type "confirm" to proceed.');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAllInventoryData();
      if (result.success) {
        showToast(result.message, 'success');
        setIsDeleteModalVisible(false);
        setConfirmText('');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const ThemeOption = ({ label, value, icon }) => {
    const isActive = userTheme === value;
    return (
      <TouchableOpacity
        onPress={() => setThemePreference(value)}
        style={[
          styles.themeOption,
          {
            backgroundColor: isActive ? colors.primary : colors.card,
            borderColor: isActive ? colors.primary : colors.border,
            borderRadius: radius.md,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? '#FFFFFF' : colors.textSecondary}
        />
        <Text
          style={[
            styles.themeLabel,
            {
              color: isActive ? '#FFFFFF' : colors.text,
              ...typography.small,
              marginTop: 4,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ 
        padding: spacing.md, 
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xl // Ensure space above tab bar and safe area
      }}
    >
      <Text style={[styles.sectionTitle, { color: colors.text, ...typography.h2 }]}>Settings</Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md }]}>
        <Text style={[styles.label, { color: colors.textSecondary, ...typography.bodySemi, marginBottom: spacing.sm }]}>
          App Theme
        </Text>
        <View style={styles.themeRow}>
          <ThemeOption label="Auto" value="auto" icon="contrast-outline" />
          <ThemeOption label="Light" value="light" icon="sunny-outline" />
          <ThemeOption label="Dark" value="dark" icon="moon-outline" />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md }]}>
        <Text style={[styles.label, { color: colors.textSecondary, ...typography.bodySemi, marginBottom: spacing.sm }]}>
          Data Management
        </Text>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.surface, borderRadius: radius.md }]}
          onPress={handleCSVImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
          )}
          <View style={styles.importInfo}>
            <Text style={[styles.importText, { color: colors.text, ...typography.bodySemi }]}>
              {isImporting ? 'Importing...' : 'Import from CSV'}
            </Text>
            <Text style={[styles.importSubtext, { color: colors.textSecondary, ...typography.small }]}>
              Bulk add items and categories from a CSV file
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.surface, borderRadius: radius.md, marginTop: spacing.sm }]}
          onPress={handleCSVExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
          )}
          <View style={styles.importInfo}>
            <Text style={[styles.importText, { color: colors.text, ...typography.bodySemi }]}>
              {isExporting ? 'Exporting...' : 'Export to CSV'}
            </Text>
            <Text style={[styles.importSubtext, { color: colors.textSecondary, ...typography.small }]}>
              Share or save your inventory data as a CSV file
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md }]}>
        <Text style={[styles.label, { color: colors.danger || '#FF3B30', ...typography.bodySemi, marginBottom: spacing.sm }]}>
          Danger Zone
        </Text>
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: colors.surface, borderRadius: radius.md }]}
          onPress={() => setIsDeleteModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={24} color={colors.danger || '#FF3B30'} />
          <View style={styles.importInfo}>
            <Text style={[styles.importText, { color: colors.danger || '#FF3B30', ...typography.bodySemi }]}>
              Delete Entire Inventory
            </Text>
            <Text style={[styles.importSubtext, { color: colors.textSecondary, ...typography.small }]}>
              Permanently remove all categories, items and shopping list
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.border} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.textSecondary, ...typography.small }]}>
          PartShop v1.0.0
        </Text>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
            <Ionicons name="warning-outline" size={48} color={colors.danger || '#FF3B30'} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.text, ...typography.h3 }]}>
              Are you absolutely sure?
            </Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary, ...typography.body, marginBottom: 20, textAlign: 'center' }]}>
              This action cannot be undone. This will permanently delete all items, categories, and your shopping list.
            </Text>
            <Text style={[styles.modalLabel, { color: colors.text, ...typography.bodySemi, marginBottom: 8 }]}>
              Please type <Text style={{ fontWeight: 'bold' }}>confirm</Text> to proceed:
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, ...typography.body }]}
              placeholder="Type 'confirm' here"
              placeholderTextColor={colors.textSecondary}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.surface, borderRadius: radius.md }]} 
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setConfirmText('');
                }}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary, ...typography.bodySemi }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.danger || '#FF3B30', borderRadius: radius.md }]} 
                onPress={handleDeleteAllData}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFF', ...typography.bodySemi }]}>Delete All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 24,
  },
  section: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  label: {
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeLabel: {
    fontWeight: '600',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  importInfo: {
    flex: 1,
    marginLeft: 16,
  },
  importText: {
  },
  importSubtext: {
    marginTop: 2,
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    opacity: 0.5,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
  },
  modalLabel: {
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
