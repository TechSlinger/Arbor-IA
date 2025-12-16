import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';
console.log("Backend URL:", EXPO_BACKEND_URL);

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
  created_at: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
  try {
    setLoading(true);
    setError('');

    const response = await fetch(`${EXPO_BACKEND_URL}/api/farms`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load farms");
    }

    const data = await response.json();
    setFarms(data);

  } catch (err) {
    console.error('Error loading farms:', err);
    setError('Impossible de charger les fermes. Vérifiez votre connexion.');
  } finally {
    setLoading(false);
  }
};


  const handleCreateFarm = () => {
    router.push('/farms/create');
  };

  const handleFarmPress = (farmId: string) => {
    router.push(`/farms/${farmId}`);
  };

  if (loading) {
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
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="leaf" size={32} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>ArborIA</Text>
            <Text style={styles.subtitle}>Gestion Arboricole</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => router.push('/menu')}
        >
          <Ionicons name="menu" size={28} color="#556B2F" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#856404" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Content */}
      <ScrollView style={styles.content}>
        {farms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucune ferme</Text>
            <Text style={styles.emptyDescription}>
              Commencez par créer votre première ferme
            </Text>
          </View>
        ) : (
          <View style={styles.farmsList}>
            {farms.map((farm) => (
              <TouchableOpacity
                key={farm.id}
                style={styles.farmCard}
                onPress={() => handleFarmPress(farm.id)}
                activeOpacity={0.7}
              >
                <View style={styles.farmCardHeader}>
                  <View style={styles.farmCardIcon}>
                    <Ionicons name="leaf" size={24} color="#556B2F" />
                  </View>
                  <View style={styles.farmCardContent}>
                    <Text style={styles.farmCardTitle}>{farm.name}</Text>
                    {farm.description ? (
                      <Text style={styles.farmCardDescription} numberOfLines={2}>
                        {farm.description}
                      </Text>
                    ) : null}
                    <Text style={styles.farmCardInfo}>
                      Grille: {farm.grid_rows}×{farm.grid_cols}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateFarm}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#556B2F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#fff3cd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#856404',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
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
  farmsList: {
    gap: 12,
  },
  farmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  farmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmCardIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f0f5ea',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmCardContent: {
    flex: 1,
  },
  farmCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  farmCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  farmCardInfo: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#556B2F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});