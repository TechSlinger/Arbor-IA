import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';

interface Farm {
  id: string;
  name: string;
}

export default function ExportScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loadingFarms, setLoadingFarms] = useState(true);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const response = await fetch(`${EXPO_BACKEND_URL}/api/farms`);
      if (!response.ok) throw new Error('Failed to load farms');
      const data = await response.json();
      setFarms(data);
    } catch (error) {
      console.error('Error loading farms:', error);
    } finally {
      setLoadingFarms(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      let url = `${EXPO_BACKEND_URL}/api/export`;
      if (selectedFarmId !== 'all') {
        url += `?farm_id=${selectedFarmId}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();

      const jsonString = JSON.stringify(data, null, 2);
      const filename = `arboria_export_${new Date().toISOString().split('T')[0]}.json`;
      
      // Save to local storage for backup
      await AsyncStorage.setItem('lastExport', jsonString);
      await AsyncStorage.setItem('lastExportDate', new Date().toISOString());

      // Share the data
      await Share.share({
        message: jsonString,
        title: filename,
      });

      Alert.alert(
        'Export réussi',
        `Données exportées:\n- ${data.farms.length} ferme(s)\n- ${data.trees.length} arbre(s)\n- ${data.interventions.length} intervention(s)`
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', "Impossible d'exporter les données");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setLoading(true);

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content);

      // Validate data structure
      if (!data.farms || !data.trees) {
        throw new Error('Format de fichier invalide');
      }

      // Confirm import
      Alert.alert(
        'Confirmer l\'import',
        `Vous allez importer:\n- ${data.farms?.length || 0} ferme(s)\n- ${data.trees?.length || 0} arbre(s)\n- ${data.interventions?.length || 0} intervention(s)\n\nCette action ajoutera les données existantes.`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setLoading(false) },
          {
            text: 'Importer',
            onPress: async () => {
              try {
                const response = await fetch(`${EXPO_BACKEND_URL}/api/import`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                });

                if (!response.ok) throw new Error('Import failed');
                const result = await response.json();

                Alert.alert(
                  'Import réussi',
                  `Importé:\n- ${result.imported.farms} ferme(s)\n- ${result.imported.trees} arbre(s)\n- ${result.imported.interventions} intervention(s)`
                );
              } catch (error) {
                console.error('Import error:', error);
                Alert.alert('Erreur', "Impossible d'importer les données");
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Erreur', 'Fichier invalide ou corrompu');
      setLoading(false);
    }
  };

  const handleRestoreLastExport = async () => {
    try {
      const lastExport = await AsyncStorage.getItem('lastExport');
      const lastExportDate = await AsyncStorage.getItem('lastExportDate');

      if (!lastExport) {
        Alert.alert('Aucune sauvegarde', "Aucune sauvegarde locale n'a été trouvée");
        return;
      }

      const data = JSON.parse(lastExport);
      const date = lastExportDate ? new Date(lastExportDate).toLocaleDateString('fr-FR') : 'Inconnue';

      Alert.alert(
        'Restaurer la sauvegarde',
        `Dernière sauvegarde: ${date}\n\n- ${data.farms?.length || 0} ferme(s)\n- ${data.trees?.length || 0} arbre(s)\n- ${data.interventions?.length || 0} intervention(s)`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Restaurer',
            onPress: async () => {
              try {
                setLoading(true);
                const response = await fetch(`${EXPO_BACKEND_URL}/api/import`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: lastExport,
                });

                if (!response.ok) throw new Error('Restore failed');
                Alert.alert('Succès', 'Données restaurées avec succès');
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de restaurer les données');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Erreur', 'Impossible de lire la sauvegarde');
    }
  };

  if (loadingFarms) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#556B2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export / Import</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Export Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exporter les données</Text>
          <Text style={styles.sectionDescription}>
            Sauvegardez vos données dans un fichier JSON que vous pouvez partager ou conserver.
          </Text>

          {/* Farm Selection */}
          <Text style={styles.label}>Sélectionner les données à exporter</Text>
          <View style={styles.farmOptions}>
            <TouchableOpacity
              style={[styles.farmOption, selectedFarmId === 'all' && styles.farmOptionActive]}
              onPress={() => setSelectedFarmId('all')}
            >
              <Ionicons
                name={selectedFarmId === 'all' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedFarmId === 'all' ? '#556B2F' : '#999'}
              />
              <Text style={[styles.farmOptionText, selectedFarmId === 'all' && styles.farmOptionTextActive]}>
                Toutes les fermes
              </Text>
            </TouchableOpacity>
            {farms.map(farm => (
              <TouchableOpacity
                key={farm.id}
                style={[styles.farmOption, selectedFarmId === farm.id && styles.farmOptionActive]}
                onPress={() => setSelectedFarmId(farm.id)}
              >
                <Ionicons
                  name={selectedFarmId === farm.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedFarmId === farm.id ? '#556B2F' : '#999'}
                />
                <Text style={[styles.farmOptionText, selectedFarmId === farm.id && styles.farmOptionTextActive]}>
                  {farm.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton, loading && styles.buttonDisabled]}
            onPress={handleExport}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Exporter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Import Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importer des données</Text>
          <Text style={styles.sectionDescription}>
            Restaurez vos données à partir d'un fichier JSON précédemment exporté.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.importButton, loading && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={loading}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#556B2F" />
            <Text style={styles.importButtonText}>Choisir un fichier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton, loading && styles.buttonDisabled]}
            onPress={handleRestoreLastExport}
            disabled={loading}
          >
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.restoreButtonText}>Restaurer dernière sauvegarde locale</Text>
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={20} color="#856404" />
          <Text style={styles.warningText}>
            L'import ajoutera les données sans supprimer celles existantes. Assurez-vous de ne pas importer des données en double.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5ea',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f5ea',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  farmOptions: {
    marginBottom: 16,
  },
  farmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  farmOptionActive: {
    backgroundColor: '#f0f5ea',
    borderWidth: 1,
    borderColor: '#556B2F',
  },
  farmOptionText: {
    fontSize: 16,
    color: '#666',
  },
  farmOptionTextActive: {
    color: '#556B2F',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#556B2F',
  },
  importButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#556B2F',
    marginBottom: 12,
  },
  restoreButton: {
    backgroundColor: '#f5f5f5',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#556B2F',
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#666',
  },
  warning: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});