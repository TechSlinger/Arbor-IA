import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';

interface Tree {
  id: string;
  farm_id: string;
  position: string;
  species: string;
  variety?: string;
}

interface Farm {
  id: string;
  name: string;
  grid_rows: number;
  grid_cols: number;
}

export default function DuplicateScreen() {
  const router = useRouter();
  const { treeId } = useLocalSearchParams();
  const id = Array.isArray(treeId) ? treeId[0] : treeId;

  const [tree, setTree] = useState<Tree | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load tree
      const treeRes = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`);
      if (!treeRes.ok) throw new Error('Failed to load tree');
      const treeData = await treeRes.json();
      setTree(treeData);
      setSelectedFarmId(treeData.farm_id);

      // Load farms
      const farmsRes = await fetch(`${EXPO_BACKEND_URL}/api/farms`);
      if (!farmsRes.ok) throw new Error('Failed to load farms');
      const farmsData = await farmsRes.json();
      setFarms(farmsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!targetPosition.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une position cible (ex: A5, B10)');
      return;
    }

    // Validate position format
    const positionRegex = /^[A-Z]\d+$/i;
    if (!positionRegex.test(targetPosition.trim())) {
      Alert.alert('Erreur', 'Format de position invalide. Utilisez le format lettre+chiffre (ex: A5, B10)');
      return;
    }

    try {
      setDuplicating(true);

      const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_tree_id: id,
          target_position: targetPosition.toUpperCase().trim(),
          target_farm_id: selectedFarmId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Duplication failed');
      }

      Alert.alert('Succès', 'Arbre dupliqué avec succès !', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error duplicating:', error);
      Alert.alert('Erreur', error.message || 'Impossible de dupliquer l\'arbre');
    } finally {
      setDuplicating(false);
    }
  };

  const getColumnLabel = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  if (loading) {
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
        <Text style={styles.headerTitle}>Dupliquer l'arbre</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Source Tree Info */}
        {tree && (
          <View style={styles.sourceCard}>
            <Text style={styles.sectionTitle}>Arbre source</Text>
            <View style={styles.sourceInfo}>
              <View style={styles.sourceIcon}>
                <Ionicons name="leaf" size={24} color="#556B2F" />
              </View>
              <View style={styles.sourceDetails}>
                <Text style={styles.sourceSpecies}>{tree.species}</Text>
                {tree.variety && <Text style={styles.sourceVariety}>{tree.variety}</Text>}
                <Text style={styles.sourcePosition}>Position: {tree.position}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Target Farm Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ferme de destination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmScroll}>
            {farms.map(farm => (
              <TouchableOpacity
                key={farm.id}
                style={[
                  styles.farmChip,
                  selectedFarmId === farm.id && styles.farmChipActive,
                ]}
                onPress={() => setSelectedFarmId(farm.id)}
              >
                <Text style={[
                  styles.farmChipText,
                  selectedFarmId === farm.id && styles.farmChipTextActive,
                ]}>
                  {farm.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Target Position */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position cible *</Text>
          <TextInput
            style={styles.positionInput}
            placeholder="Ex: A5, B10, C15..."
            value={targetPosition}
            onChangeText={setTargetPosition}
            autoCapitalize="characters"
            placeholderTextColor="#999"
          />
          {selectedFarm && (
            <Text style={styles.positionHint}>
              Colonnes disponibles: A-{getColumnLabel(selectedFarm.grid_cols - 1)}\n
              Lignes disponibles: 1-{selectedFarm.grid_rows}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color="#556B2F" />
          <Text style={styles.infoText}>
            La duplication copiera l'espèce, la variété et l'origine de l'arbre source.
            La date de plantation sera la date actuelle et l'état de santé sera "Bonne santé".
          </Text>
        </View>

        {/* Duplicate Button */}
        <TouchableOpacity
          style={[styles.duplicateButton, duplicating && styles.buttonDisabled]}
          onPress={handleDuplicate}
          disabled={duplicating}
        >
          {duplicating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="copy-outline" size={24} color="#fff" />
              <Text style={styles.duplicateButtonText}>Dupliquer</Text>
            </>
          )}
        </TouchableOpacity>
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
  sourceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f0f5ea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceDetails: {
    flex: 1,
  },
  sourceSpecies: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sourceVariety: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sourcePosition: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  farmScroll: {
    marginTop: 8,
  },
  farmChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  farmChipActive: {
    backgroundColor: '#556B2F',
    borderColor: '#556B2F',
  },
  farmChipText: {
    fontSize: 14,
    color: '#666',
  },
  farmChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  positionInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  positionHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f5ea',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#556B2F',
    lineHeight: 20,
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#556B2F',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  duplicateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});