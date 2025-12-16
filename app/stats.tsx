import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';

interface Farm {
  id: string;
  name: string;
}

interface Statistics {
  total: number;
  good: number;
  fair: number;
  poor: number;
  dead: number;
  species_count: { [key: string]: number };
  recent_plantings: number;
  total_interventions: number;
  interventions_by_type: { [key: string]: number };
}

export default function StatsScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      loadStats();
    }
  }, [selectedFarmId]);

  const loadFarms = async () => {
    try {
      const response = await fetch(`${EXPO_BACKEND_URL}/api/farms`);
      if (!response.ok) throw new Error('Failed to load farms');
      const data = await response.json();
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarmId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
      Alert.alert('Erreur', 'Impossible de charger les fermes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_BACKEND_URL}/api/statistics/${selectedFarmId}`);
      if (!response.ok) throw new Error('Failed to load statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthLabels: { [key: string]: { label: string; color: string } } = {
    good: { label: 'Bonne santé', color: '#28a745' },
    fair: { label: 'Moyenne', color: '#ffc107' },
    poor: { label: 'Mauvaise', color: '#dc3545' },
    dead: { label: 'Mort', color: '#6c757d' },
  };

  const interventionLabels: { [key: string]: string } = {
    watering: 'Arrosage',
    treatment: 'Traitement',
    pruning: 'Taille',
    harvest: 'Récolte',
    fertilization: 'Fertilisation',
    observation: 'Observation',
  };

  if (loading && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
        <Text style={styles.loadingText}>Chargement...</Text>
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
        <Text style={styles.headerTitle}>Statistiques</Text>
        <TouchableOpacity onPress={loadStats} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#556B2F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Farm Selector */}
        {farms.length > 0 && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Sélectionner une ferme</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedFarmId}
                onValueChange={(value) => setSelectedFarmId(value)}
                style={styles.picker}
              >
                {farms.map((farm) => (
                  <Picker.Item key={farm.id} label={farm.name} value={farm.id} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {farms.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucune ferme</Text>
            <Text style={styles.emptyDescription}>Créez d'abord une ferme pour voir les statistiques</Text>
          </View>
        )}

        {stats && (
          <>
            {/* Total Trees */}
            <View style={styles.totalCard}>
              <Ionicons name="leaf" size={40} color="#556B2F" />
              <View style={styles.totalInfo}>
                <Text style={styles.totalNumber}>{stats.total}</Text>
                <Text style={styles.totalLabel}>Arbres au total</Text>
              </View>
            </View>

            {/* Health Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>État de santé</Text>
              <View style={styles.statsGrid}>
                {Object.entries(healthLabels).map(([key, { label, color }]) => (
                  <View key={key} style={styles.statCard}>
                    <View style={[styles.statIndicator, { backgroundColor: color }]} />
                    <Text style={styles.statValue}>{stats[key as keyof Statistics] || 0}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Species Distribution */}
            {Object.keys(stats.species_count).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Par espèce</Text>
                <View style={styles.speciesList}>
                  {Object.entries(stats.species_count)
                    .sort(([, a], [, b]) => b - a)
                    .map(([species, count]) => (
                      <View key={species} style={styles.speciesItem}>
                        <Text style={styles.speciesName}>{species}</Text>
                        <View style={styles.speciesBarContainer}>
                          <View
                            style={[
                              styles.speciesBar,
                              { width: `${(count / stats.total) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.speciesCount}>{count}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {/* Interventions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interventions</Text>
              <View style={styles.interventionCard}>
                <Text style={styles.interventionTotal}>{stats.total_interventions}</Text>
                <Text style={styles.interventionLabel}>Interventions totales</Text>
              </View>
              {Object.keys(stats.interventions_by_type).length > 0 && (
                <View style={styles.interventionsList}>
                  {Object.entries(stats.interventions_by_type).map(([type, count]) => (
                    <View key={type} style={styles.interventionItem}>
                      <Text style={styles.interventionType}>
                        {interventionLabels[type] || type}
                      </Text>
                      <Text style={styles.interventionCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Recent Plantings */}
            <View style={styles.section}>
              <View style={styles.recentCard}>
                <Ionicons name="time-outline" size={24} color="#556B2F" />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentNumber}>{stats.recent_plantings}</Text>
                  <Text style={styles.recentLabel}>Plantations récentes (30 jours)</Text>
                </View>
              </View>
            </View>
          </>
        )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  refreshButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  totalInfo: {
    marginLeft: 16,
  },
  totalNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  speciesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  speciesName: {
    width: 100,
    fontSize: 14,
    color: '#333',
  },
  speciesBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  speciesBar: {
    height: '100%',
    backgroundColor: '#556B2F',
    borderRadius: 4,
  },
  speciesCount: {
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  interventionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  interventionTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  interventionLabel: {
    fontSize: 14,
    color: '#666',
  },
  interventionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  interventionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  interventionType: {
    fontSize: 14,
    color: '#333',
  },
  interventionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#556B2F',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recentInfo: {
    marginLeft: 12,
  },
  recentNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  recentLabel: {
    fontSize: 12,
    color: '#666',
  },
});