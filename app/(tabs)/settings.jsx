import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { useToast } from '../../lib/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { importFromCSV, exportToCSV } from '../../lib/importUtils';

export default function SettingsScreen() {
  const { colors, spacing, radius, typography, userTheme, setThemePreference } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
      contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.md }}
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

      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.textSecondary, ...typography.small }]}>
          PartShop v2.0.1
        </Text>
      </View>
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
});
