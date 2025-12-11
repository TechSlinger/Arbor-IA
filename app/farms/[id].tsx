import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SCREEN_WIDTH = Dimensions.get('window').width;

interface Farm {
  id: string;
  name: string;
  description?: string;
  grid_rows: number;
  grid_cols: number;
  gps_coords?: {
    latitude: number;
    longitude: number;
  };
}

interface Tree {
  id?: string;
  farm_id: string;
  position: string;
  species: string;
  variety?: string;
  plant_date: string;
  health: string;
  notes?: string;
  photo?: string;
}

interface Statistics {
  total: number;
  good: number;
  fair: number;
  poor: number;
  dead: number;
}

export default function FarmDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [farm, setFarm] = useState<Farm | null>(null);
  const [trees, setTrees] = useState<{ [key: string]: Tree }>({});
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    good: 0,
    fair: 0,
    poor: 0,
    dead: 0,
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadFarmData();
  }, [id]);

  const loadFarmData = async () => {
    try {
      setLoading(true);
      
      // Load farm details
      const farmResponse = await axios.get(`${EXPO_BACKEND_URL}/api/farms/${id}`);
      setFarm(farmResponse.data);
      
      // Load trees
      const treesResponse = await axios.get(`${EXPO_BACKEND_URL}/api/trees`, {
        params: { farm_id: id },
      });
      
      // Convert array to object with position as key
      const treesMap: { [key: string]: Tree } = {};
      treesResponse.data.forEach((tree: Tree) => {
        treesMap[tree.position] = tree;
      });
      setTrees(treesMap);
      
      // Load statistics
      const statsResponse = await axios.get(`${EXPO_BACKEND_URL}/api/statistics/${id}`);
      setStatistics(statsResponse.data);
    } catch (error) {
      console.error('Error loading farm data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de la ferme');
    } finally {
      setLoading(false);
    }
  };

  const [cellSize, setCellSize] = useState(40);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);

  const handleCellPress = (position: string) => {
    if (trees[position]) {
      // Navigate to tree detail for editing
      router.push(`/trees/${trees[position].id}`);
    } else {
      // Navigate to add new tree
      router.push({
        pathname: '/trees/create',
        params: { farmId: id, position },
      });
    }
  };

  const handleCellLongPress = (position: string) => {
    // Toggle selection
    setSelectedCells(prev => {
      if (prev.includes(position)) {
        return prev.filter(p => p !== position);
      } else {
        return [...prev, position];
      }
    });
  };

  const getColumnLabel = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const renderGrid = () => {
    if (!farm) return null;

    const cellSize = 40;
    const rows = [];
    
    // Header row with column labels
    const headerRow = [
      <View key="corner" style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]} />
    ];
    
    for (let col = 0; col < farm.grid_cols; col++) {
      headerRow.push(
        <View key={`col-${col}`} style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]}>
          <Text style={styles.labelText}>{getColumnLabel(col)}</Text>
        </View>
      );
    }
    rows.push(
      <View key="header" style={styles.gridRow}>
        {headerRow}
      </View>
    );

    // Data rows
    for (let row = 1; row <= farm.grid_rows; row++) {
      const cells = [
        <View key={`row-${row}`} style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]}>
          <Text style={styles.labelText}>{row}</Text>
        </View>
      ];
      
      for (let col = 0; col < farm.grid_cols; col++) {
        const position = `${getColumnLabel(col)}${row}`;
        const tree = trees[position];
        
        cells.push(
          <TouchableOpacity
            key={position}
            style={[
              styles.gridCell,
              { width: cellSize, height: cellSize },
              tree && styles.hasTree,
              tree && tree.health === 'good' && styles.healthGood,
              tree && tree.health === 'fair' && styles.healthFair,
              tree && tree.health === 'poor' && styles.healthPoor,
              tree && tree.health === 'dead' && styles.healthDead,
            ]}
            onPress={() => handleCellPress(position)}
            activeOpacity={0.7}
          >
            {tree && <Ionicons name="leaf" size={cellSize * 0.5} color="#fff" />}
          </TouchableOpacity>
        );
      }
      
      rows.push(
        <View key={`row-${row}`} style={styles.gridRow}>
          {cells}
        </View>
      );
    }

    return <View style={styles.gridContainer}>{rows}</View>;
  };

  const renderList = () => {
    const treesList = Object.values(trees).sort((a, b) => 
      a.position.localeCompare(b.position)
    );

    if (treesList.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucun arbre</Text>
          <Text style={styles.emptyDescription}>
            Touchez une cellule de la grille pour ajouter un arbre
          </Text>
        </View>
      );
    }

    const healthLabels: { [key: string]: string } = {
      good: 'Bonne santé',
      fair: 'Santé moyenne',
      poor: 'Mauvaise santé',
      dead: 'Mort',
    };

    return (
      <View style={styles.listContainer}>
        {treesList.map((tree) => (
          <TouchableOpacity
            key={tree.id || tree.position}
            style={styles.listItem}
            onPress={() => router.push(`/trees/${tree.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.listItemHeader}>
              <Text style={styles.listItemTitle}>
                {tree.position} - {tree.species}
              </Text>
              <View style={[styles.healthBadge, styles[`health${tree.health.charAt(0).toUpperCase() + tree.health.slice(1)}Badge`]]}>
                <Text style={styles.healthBadgeText}>{healthLabels[tree.health]}</Text>
              </View>
            </View>
            <Text style={styles.listItemDetails}>
              {tree.variety ? `${tree.variety} • ` : ''}Planté: {new Date(tree.plant_date).toLocaleDateString('fr-FR')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.centerContainer}>
        <Text>Ferme non trouvée</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{farm.name}</Text>
          <Text style={styles.headerSubtitle}>Grille {farm.grid_rows}×{farm.grid_cols}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          style={styles.iconButton}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={24}
            color="#556B2F"
          />
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#28a745' }]}>{statistics.good}</Text>
            <Text style={styles.statLabel}>Bonne</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#ffc107' }]}>{statistics.fair}</Text>
            <Text style={styles.statLabel}>Moyenne</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#dc3545' }]}>{statistics.poor}</Text>
            <Text style={styles.statLabel}>Mauvaise</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'grid' ? (
        renderGrid()
      ) : (
        <ScrollView style={styles.content}>
          {renderList()}
        </ScrollView>
      )}
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
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  iconButton: {
    padding: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelCell: {
    backgroundColor: '#f0f5ea',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#556B2F',
  },
  hasTree: {
    borderWidth: 2,
  },
  healthGood: {
    backgroundColor: '#28a745',
    borderColor: '#1e7e34',
  },
  healthFair: {
    backgroundColor: '#ffc107',
    borderColor: '#d39e00',
  },
  healthPoor: {
    backgroundColor: '#dc3545',
    borderColor: '#bd2130',
  },
  healthDead: {
    backgroundColor: '#6c757d',
    borderColor: '#545b62',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthGoodBadge: {
    backgroundColor: '#28a745',
  },
  healthFairBadge: {
    backgroundColor: '#ffc107',
  },
  healthPoorBadge: {
    backgroundColor: '#dc3545',
  },
  healthDeadBadge: {
    backgroundColor: '#6c757d',
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  listItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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
});