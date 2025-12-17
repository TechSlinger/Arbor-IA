import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://6f6167cb-6516-4e54-8fa7-01ef2429da00.preview.emergentagent.com';

interface Farm {
  id: string;
  name: string;
}

interface Tree {
  id: string;
  farm_id: string;
  position: string;
  species: string;
  variety?: string;
  health: string;
  plant_date: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [results, setResults] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setHasSearched(true);

      let url = `${EXPO_BACKEND_URL}/api/search?`;
      const params = new URLSearchParams();

      if (selectedFarmId !== 'all') {
        params.append('farm_id', selectedFarmId);
      }
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      if (healthFilter !== 'all') {
        params.append('health', healthFilter);
      }

      const response = await fetch(`${url}${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthOptions = [
    { value: 'all', label: 'Tous les états' },
    { value: 'good', label: 'Bonne santé', color: '#28a745' },
    { value: 'fair', label: 'Moyenne', color: '#ffc107' },
    { value: 'poor', label: 'Mauvaise', color: '#dc3545' },
    { value: 'dead', label: 'Mort', color: '#6c757d' },
  ];

  const getHealthColor = (health: string) => {
    const option = healthOptions.find(o => o.value === health);
    return option?.color || '#999';
  };

  const getHealthLabel = (health: string) => {
    const option = healthOptions.find(o => o.value === health);
    return option?.label || health;
  };

  const getFarmName = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    return farm?.name || 'Ferme inconnue';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#556B2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recherche</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Filters */}
      <View style={styles.filtersContainer}>
        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par espèce, variété, position..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Farm Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmFilter}>
          <TouchableOpacity
            style={[styles.farmChip, selectedFarmId === 'all' && styles.farmChipActive]}
            onPress={() => setSelectedFarmId('all')}
          >
            <Text style={[styles.farmChipText, selectedFarmId === 'all' && styles.farmChipTextActive]}>
              Toutes les fermes
            </Text>
          </TouchableOpacity>
          {farms.map(farm => (
            <TouchableOpacity
              key={farm.id}
              style={[styles.farmChip, selectedFarmId === farm.id && styles.farmChipActive]}
              onPress={() => setSelectedFarmId(farm.id)}
            >
              <Text style={[styles.farmChipText, selectedFarmId === farm.id && styles.farmChipTextActive]}>
                {farm.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Health Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.healthFilter}>
          {healthOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.healthChip,
                healthFilter === option.value && styles.healthChipActive,
                option.color && healthFilter === option.value && { backgroundColor: option.color },
              ]}
              onPress={() => setHealthFilter(option.value)}
            >
              {option.color && <View style={[styles.healthDot, { backgroundColor: option.color }]} />}
              <Text
                style={[
                  styles.healthChipText,
                  healthFilter === option.value && styles.healthChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.searchButtonText}>Rechercher</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.results}>
        {hasSearched && results.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptyDescription}>Essayez de modifier vos filtres</Text>
          </View>
        )}

        {results.length > 0 && (
          <>
            <Text style={styles.resultsCount}>{results.length} arbre(s) trouvé(s)</Text>
            {results.map(tree => (
              <TouchableOpacity
                key={tree.id}
                style={styles.resultCard}
                onPress={() => router.push(`/trees/${tree.id}`)}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultPosition}>
                    <Ionicons name="location" size={16} color="#556B2F" />
                    <Text style={styles.positionText}>{tree.position}</Text>
                  </View>
                  <View style={[styles.healthBadge, { backgroundColor: getHealthColor(tree.health) }]}>
                    <Text style={styles.healthBadgeText}>{getHealthLabel(tree.health)}</Text>
                  </View>
                </View>
                <Text style={styles.resultSpecies}>{tree.species}</Text>
                {tree.variety && <Text style={styles.resultVariety}>{tree.variety}</Text>}
                <Text style={styles.resultFarm}>{getFarmName(tree.farm_id)}</Text>
              </TouchableOpacity>
            ))}
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
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  farmFilter: {
    marginBottom: 12,
  },
  farmChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  farmChipActive: {
    backgroundColor: '#556B2F',
  },
  farmChipText: {
    fontSize: 14,
    color: '#666',
  },
  farmChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  healthFilter: {
    marginBottom: 12,
  },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  healthChipActive: {
    backgroundColor: '#556B2F',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthChipText: {
    fontSize: 14,
    color: '#666',
  },
  healthChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#556B2F',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#556B2F',
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  resultSpecies: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultVariety: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  resultFarm: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  },
});