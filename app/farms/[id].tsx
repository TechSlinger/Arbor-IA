import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
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
}

interface Tree {
  id?: string;
  farm_id: string;
  position: string;
  species: string;
  variety?: string;
  plant_date: string;
  health: string;
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
  const [trees, setTrees] = useState<Record<string, Tree>>({});
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
      Alert.alert("Erreur", "ID de la ferme manquant.");
      return;
    }
    loadFarmData();
  }, [farmId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      const farmRes = await fetch(`${EXPO_BACKEND_URL}/api/farms/${farmId}`);
      if (!farmRes.ok) throw new Error("Farm fetch failed");
      setFarm(await farmRes.json());

      const treesRes = await fetch(
        `${EXPO_BACKEND_URL}/api/trees?farm_id=${farmId}`
      );
      if (!treesRes.ok) throw new Error("Trees fetch failed");

      const treesData: Tree[] = await treesRes.json();
      const map: Record<string, Tree> = {};
      treesData.forEach((t) => (map[t.position] = t));
      setTrees(map);

      const statsRes = await fetch(
        `${EXPO_BACKEND_URL}/api/statistics/${farmId}`
      );
      if (statsRes.ok) setStatistics(await statsRes.json());
    } catch (e) {
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
        ? `Êtes-vous sûr de vouloir supprimer "${farm?.name}" ?\n\nCette action supprimera également ${treeCount} arbre${treeCount > 1 ? "s" : ""}.`
        : `Êtes-vous sûr de vouloir supprimer "${farm?.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: confirmDeleteFarm },
      ]
    );
  };

  const confirmDeleteFarm = async () => {
    if (!farmId) return;

    try {
      setDeleting(true);
      const res = await fetch(`${EXPO_BACKEND_URL}/api/farms/${farmId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("Delete failed");
      }

      Alert.alert("Succès", "La ferme a été supprimée.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de supprimer la ferme.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCellPress = (position: string) => {
    const tree = trees[position];
    if (tree?.id) router.push(`/trees/${tree.id}`);
    else
      router.push({
        pathname: "/trees/create",
        params: { farmId, position },
      });
  };

  const getColumnLabel = (i: number) => String.fromCharCode(65 + i);

  const renderGrid = () => {
    if (!farm) return null;

    const rows = [];
    for (let r = 1; r <= farm.grid_rows; r++) {
      const cells = [];
      for (let c = 0; c < farm.grid_cols; c++) {
        const pos = `${getColumnLabel(c)}${r}`;
        const tree = trees[pos];
        cells.push(
          <TouchableOpacity
            key={pos}
            style={[
              styles.gridCell,
              tree?.health === "good" && styles.healthGood,
              tree?.health === "fair" && styles.healthFair,
              tree?.health === "poor" && styles.healthPoor,
              tree?.health === "dead" && styles.healthDead,
            ]}
            onPress={() => handleCellPress(pos)}
          >
            {tree && <Ionicons name="leaf" size={18} color="#fff" />}
          </TouchableOpacity>
        );
      }
      rows.push(
        <View key={r} style={styles.gridRow}>
          {cells}
        </View>
      );
    }
    return <View style={styles.gridContainer}>{rows}</View>;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#556B2F" />
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.center}>
        <Text>Ferme introuvable.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#556B2F" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{farm.name}</Text>
          <Text style={styles.subtitle}>
            Grille {farm.grid_rows}×{farm.grid_cols}
          </Text>
        </View>

        <TouchableOpacity onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
          <Ionicons
            name={viewMode === "grid" ? "list" : "grid"}
            size={24}
            color="#556B2F"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteFarm}
          disabled={deleting}
          style={{ marginLeft: 12 }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#dc3545" />
          ) : (
            <Ionicons name="trash-outline" size={24} color="#dc3545" />
          )}
        </TouchableOpacity>
      </View>

      {viewMode === "grid" ? (
        renderGrid()
      ) : (
        <ScrollView ref={scrollViewRef}>{/* list view here */}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f5ea" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#556B2F" },
  subtitle: { fontSize: 14, color: "#666" },

  gridContainer: { padding: 16 },
  gridRow: { flexDirection: "row" },
  gridCell: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  healthGood: { backgroundColor: "#28a745" },
  healthFair: { backgroundColor: "#ffc107" },
  healthPoor: { backgroundColor: "#dc3545" },
  healthDead: { backgroundColor: "#6c757d" },
});
