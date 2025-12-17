import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const EXPO_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "https://6f6167cb-6516-4e54-8fa7-01ef2429da00.preview.emergentagent.com";

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
  const farmId = Array.isArray(id) ? id[0] : id;

  const scrollViewRef = useRef<ScrollView | null>(null);

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
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!farmId) {
      console.log("❌ ERROR: farmId is missing");
      Alert.alert("Erreur", "ID de la ferme manquant.");
      return;
    }
    loadFarmData();
  }, [farmId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);
      console.log("➡️ Fetch:", `${EXPO_BACKEND_URL}/api/farms/${farmId}`);

      // Load farm
      const farmRes = await fetch(`${EXPO_BACKEND_URL}/api/farms/${farmId}`);
      if (!farmRes.ok) {
        console.warn("Farm fetch status:", farmRes.status);
        throw new Error("Farm request failed");
      }
      const farmData = await farmRes.json();
      setFarm(farmData);

      // Load trees
      const treesRes = await fetch(
        `${EXPO_BACKEND_URL}/api/trees?farm_id=${farmId}`
      );
      if (!treesRes.ok) {
        console.warn("Trees fetch status:", treesRes.status);
        throw new Error("Trees request failed");
      }
      const treesData = await treesRes.json();
      const treesMap: { [key: string]: Tree } = {};
      if (Array.isArray(treesData)) {
        treesData.forEach((tree: Tree) => {
          if (tree && tree.position) {
            treesMap[tree.position] = tree;
          }
        });
      } else {
        console.warn("Unexpected trees data:", treesData);
      }
      setTrees(treesMap);

      // Load statistics
      const statsRes = await fetch(
        `${EXPO_BACKEND_URL}/api/statistics/${farmId}`
      );
      if (!statsRes.ok) {
        console.warn("Stats fetch status:", statsRes.status);
        throw new Error("Statistics request failed");
      }
      const statsData = await statsRes.json();
      setStatistics(statsData);
    } catch (error) {
      console.log("❌ FETCH ERROR:", error);
      Alert.alert("Erreur", "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

 const handleDeleteFarm = () => {
    const treeCount = Object.keys(trees).length;
    
    Alert.alert(
      "Supprimer la ferme",
      treeCount > 0
        ? `Êtes-vous sûr de vouloir supprimer "${farm?.name}" ?\n\nCette action supprimera également ${treeCount} arbre${treeCount > 1 ? 's' : ''}.`
        : `Êtes-vous sûr de vouloir supprimer "${farm?.name}" ?`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: confirmDeleteFarm,
        },
      ]
    );
  };

  const confirmDeleteFarm = async () => {
    if (!farmId) return;

    try {
      setDeleting(true);
      console.log("🗑️ Deleting farm:", farmId);
      console.log("🗑️ DELETE URL:", `${EXPO_BACKEND_URL}/api/farms/${farmId}`);

      const response = await fetch(`${EXPO_BACKEND_URL}/api/farms/${farmId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("🗑️ DELETE Response status:", response.status);
      console.log("🗑️ DELETE Response ok:", response.ok);

      // Check for successful deletion (200, 201, 204 are all valid)
      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        console.log("🗑️ DELETE Error response:", errorText);
        throw new Error(`Failed to delete farm: ${response.status}`);
      }

      console.log("✅ Farm deleted successfully");
      
      Alert.alert("Succès", "La ferme a été supprimée.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("❌ DELETE ERROR:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert("Erreur", `Impossible de supprimer la ferme: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCellPress = (position: string) => {
    if (!farmId) return;

    const tree = trees[position];

    // If tree has an id -> open detail; otherwise create
    if (tree?.id) {
      router.push(`/trees/${tree.id}`);
    } else {
      router.push({
        pathname: "/trees/create",
        params: { farmId, position },
      });
    }
  };

  const getColumnLabel = (index: number): string => {
    return String.fromCharCode(65 + index);
  };

  const renderGrid = () => {
    if (!farm) return null;

    const cellSize = 40;
    const rows: React.ReactNode[] = [];

    const headerRow = [
      <View
        key="corner"
        style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]}
      />,
    ];

    for (let col = 0; col < farm.grid_cols; col++) {
      headerRow.push(
        <View
          key={`col-${col}`}
          style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]}
        >
          <Text style={styles.labelText}>{getColumnLabel(col)}</Text>
        </View>
      );
    }

    rows.push(
      <View key="header" style={styles.gridRow}>
        {headerRow}
      </View>
    );

    for (let row = 1; row <= farm.grid_rows; row++) {
      const cells: React.ReactNode[] = [
        <View
          key={`row-${row}`}
          style={[styles.gridCell, styles.labelCell, { width: cellSize, height: cellSize }]}
        >
          <Text style={styles.labelText}>{row}</Text>
        </View>,
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
              tree?.health === "good" && styles.healthGood,
              tree?.health === "fair" && styles.healthFair,
              tree?.health === "poor" && styles.healthPoor,
              tree?.health === "dead" && styles.healthDead,
            ]}
            activeOpacity={0.7}
            onPress={() => handleCellPress(position)}
          >
            {tree && <Ionicons name="leaf" size={20} color="#fff" />}
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
    const sortedTrees = Object.values(trees).sort((a, b) =>
      a.position.localeCompare(b.position)
    );

    if (sortedTrees.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucun arbre</Text>
          <Text style={styles.emptyDescription}>
            Touchez une cellule de la grille pour ajouter un arbre.
          </Text>
        </View>
      );
    }

    const healthText: Record<string, string> = {
      good: "Bonne santé",
      fair: "Santé moyenne",
      poor: "Mauvaise santé",
      dead: "Mort",
    };

    return (
      <View style={styles.listContainer}>
        {sortedTrees.map((tree) => (
          <TouchableOpacity
            key={tree.id || tree.position}
            style={styles.listItem}
            onPress={() => (tree?.id ? router.push(`/trees/${tree.id}`) : null)}
          >
            <View style={styles.listItemHeader}>
              <Text style={styles.listItemTitle}>
                {tree.position} — {tree.species}
              </Text>

              <View
                style={[
                  styles.healthBadge,
                  tree.health === "good" && styles.healthGoodBadge,
                  tree.health === "fair" && styles.healthFairBadge,
                  tree.health === "poor" && styles.healthPoorBadge,
                  tree.health === "dead" && styles.healthDeadBadge,
                ]}
              >
                <Text style={styles.healthBadgeText}>
                  {healthText[tree.health]}
                </Text>
              </View>
            </View>

            <Text style={styles.listItemDetails}>
              {tree.variety ? `${tree.variety} • ` : ""}
              Planté : {new Date(tree.plant_date).toLocaleDateString("fr-FR")}
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
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.centerContainer}>
        <Text>Ferme introuvable.</Text>
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
          <Text style={styles.headerSubtitle}>
            Grille {farm.grid_rows}×{farm.grid_cols}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          style={styles.iconButton}
        >
          <Ionicons
            name={viewMode === "grid" ? "list" : "grid"}
            size={24}
            color="#556B2F"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteFarm}
          style={styles.deleteButton}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#dc3545" />
          ) : (
            <Ionicons name="trash-outline" size={24} color="#dc3545" />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === "grid" ? (
        renderGrid()
      ) : (
        <ScrollView style={styles.content}>{renderList()}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f5ea",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f5ea",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
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
    fontWeight: "bold",
    color: "#556B2F",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#556B2F",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 16,
  },
  gridRow: {
    flexDirection: "row",
  },
  gridCell: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  labelCell: {
    backgroundColor: "#f0f5ea",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#556B2F",
  },
  hasTree: {
    borderWidth: 2,
  },
  healthGood: {
    backgroundColor: "#28a745",
    borderColor: "#1e7e34",
  },
  healthFair: {
    backgroundColor: "#ffc107",
    borderColor: "#d39e00",
  },
  healthPoor: {
    backgroundColor: "#dc3545",
    borderColor: "#bd2130",
  },
  healthDead: {
    backgroundColor: "#6c757d",
    borderColor: "#545b62",
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthGoodBadge: {
    backgroundColor: "#28a745",
  },
  healthFairBadge: {
    backgroundColor: "#ffc107",
  },
  healthPoorBadge: {
    backgroundColor: "#dc3545",
  },
  healthDeadBadge: {
    backgroundColor: "#6c757d",
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#fff",
  },
  listItemDetails: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});