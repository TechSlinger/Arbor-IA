import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';
export default function CreateFarmScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gridRows, setGridRows] = useState('20');
  const [gridCols, setGridCols] = useState('20');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);

  const handleGetLocation = async () => {
    try {
      setLoadingGPS(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la localisation pour utiliser cette fonctionnalité.'
        );
        return;
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setGpsCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      Alert.alert('Succès', 'Position GPS enregistrée!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir la position GPS');
    } finally {
      setLoadingGPS(false);
    }
  };

const handleSubmit = async () => {
  if (!name.trim()) {
    Alert.alert('Erreur', 'Veuillez entrer un nom pour la ferme');
    return;
  }

  const rows = parseInt(gridRows);
  const cols = parseInt(gridCols);

  if (isNaN(rows) || rows < 5 || rows > 50) {
    Alert.alert('Erreur', 'Le nombre de lignes doit être entre 5 et 50');
    return;
  }

  if (isNaN(cols) || cols < 5 || cols > 50) {
    Alert.alert('Erreur', 'Le nombre de colonnes doit être entre 5 et 50');
    return;
  }

  try {
    setLoading(true);

    const farmData: any = {
      name: name.trim(),
      description: description.trim(),
      grid_rows: rows,
      grid_cols: cols,
    };

    if (gpsCoords) {
      farmData.gps_coords = gpsCoords;
    }

    // ---- Fetch POST replace Axios ----
    const response = await fetch(`${EXPO_BACKEND_URL}/api/farms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(farmData),
    });

    if (!response.ok) {
      throw new Error("Farm creation failed");
    }

    Alert.alert('Succès', 'Ferme créée avec succès!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  } catch (error) {
    console.error('Error creating farm:', error);
    Alert.alert('Erreur', 'Impossible de créer la ferme');
  } finally {
    setLoading(false);
  }
};


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#556B2F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvelle Ferme</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom de la ferme *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ferme Oasis"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description de la ferme..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.gridSection}>
            <Text style={styles.sectionTitle}>Configuration de la grille</Text>
            
            <View style={styles.gridInputsRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Lignes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  value={gridRows}
                  onChangeText={setGridRows}
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Colonnes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  value={gridCols}
                  onChangeText={setGridCols}
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <Text style={styles.helpText}>
              Taille recommandée: 10×10 à 30×30 (5-50 pour chaque dimension)
            </Text>
          </View>

          <View style={styles.gpsSection}>
            <Text style={styles.sectionTitle}>Position GPS (optionnel)</Text>
            
            {gpsCoords ? (
              <View style={styles.gpsInfo}>
                <Ionicons name="location" size={20} color="#556B2F" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.gpsText}>
                    Lat: {gpsCoords.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.gpsText}>
                    Long: {gpsCoords.longitude.toFixed(6)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setGpsCoords(null)}>
                  <Ionicons name="close-circle" size={24} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={handleGetLocation}
                disabled={loadingGPS}
              >
                {loadingGPS ? (
                  <ActivityIndicator color="#556B2F" />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={20} color="#556B2F" />
                    <Text style={styles.gpsButtonText}>Obtenir ma position</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Créer la ferme</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5ea',
  },
  scrollView: {
    flex: 1,
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
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  gridSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#556B2F',
    marginBottom: 12,
  },
  gridInputsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  gpsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f5ea',
    borderRadius: 8,
  },
  gpsText: {
    fontSize: 14,
    color: '#333',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f5ea',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#556B2F',
    borderStyle: 'dashed',
    gap: 8,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#556B2F',
  },
  submitButton: {
    backgroundColor: '#556B2F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});