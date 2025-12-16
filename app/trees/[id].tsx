import React, { useEffect, useState } from 'react';
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
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRef } from 'react';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';
const TREE_SPECIES = [
  'Olivier',
  'Palmier dattier',
  'Figuier',
  'Oranger',
  'Citronnier',
  'Clémentinier',
  'Amandier',
  'Grenadier',
  'Caroubier',
  'Abricotier',
  'Pêcher',
  'Prunier',
  'Pommier',
  'Poirier',
  'Néflier du Japon',
  'Noyer',
  'Pistachier',
  'Arganier',
  "Cèdre de l'Atlas",
  'Chêne-liège',
  "Pin d'Alep",
  'Thuya de Berbérie',
  'Eucalyptus',
  'Jujubier',
];

export default function TreeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [species, setSpecies] = useState('');
  const [variety, setVariety] = useState('');
  const [plantDate, setPlantDate] = useState('');
  const [health, setHealth] = useState('good');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);

  useEffect(() => {
    loadTree();
  }, [id]);

  const loadTree = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load tree');
      }
      const tree = await response.json();
      
      setSpecies(tree.species);
      setVariety(tree.variety || '');
      setPlantDate(tree.plant_date);
      setHealth(tree.health);
      setNotes(tree.notes || '');
      setPhoto(tree.photo || null);
      setGpsCoords(tree.gps_coords || null);
    } catch (error) {
      console.error('Error loading tree:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de l\'arbre');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la caméra pour prendre des photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la galerie pour sélectionner des photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la localisation.'
        );
        return;
      }

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
    }
  };

 const handleUpdate = async () => {
  if (!species) {
    Alert.alert('Erreur', 'Veuillez sélectionner une espèce');
    return;
  }

  try {
    setSaving(true);

    const treeData: any = {
      species,
      variety,
      plant_date: plantDate,
      health,
      notes,
    };

    if (photo) {
      treeData.photo = photo;
    }

    if (gpsCoords) {
      treeData.gps_coords = gpsCoords;
    }

    // ---- Fetch PUT replace Axios ----
    const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(treeData),
    });

    if (!response.ok) {
      throw new Error("Tree update failed");
    }

    Alert.alert('Succès', 'Arbre modifié avec succès!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  } catch (error) {
    console.error('Error updating tree:', error);
    Alert.alert('Erreur', 'Impossible de modifier l’arbre');
  } finally {
    setSaving(false);
  }
};
const handleDelete = () => {
  Alert.alert(
    'Confirmer la suppression',
    'Êtes-vous sûr de vouloir supprimer cet arbre?',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            // ---- Fetch DELETE replace Axios ----
            const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              throw new Error("Tree deletion failed");
            }

            Alert.alert('Succès', 'Arbre supprimé!', [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]);
          } catch (error) {
            console.error('Error deleting tree:', error);
            Alert.alert('Erreur', 'Impossible de supprimer l’arbre');
          }
        },
      },
    ]
  );
};

  const healthOptions = [
    { value: 'good', label: 'Bonne santé', color: '#28a745' },
    { value: 'fair', label: 'Santé moyenne', color: '#ffc107' },
    { value: 'poor', label: 'Mauvaise santé', color: '#dc3545' },
    { value: 'dead', label: 'Mort', color: '#6c757d' },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Modifier l'arbre</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash" size={24} color="#dc3545" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            {photo ? (
              <View>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setPhoto(null)}
                >
                  <Ionicons name="close-circle" size={32} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={32} color="#556B2F" />
                  <Text style={styles.photoButtonText}>Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                  <Ionicons name="images" size={32} color="#556B2F" />
                  <Text style={styles.photoButtonText}>Choisir depuis galerie</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Species Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Espèce *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowSpeciesPicker(!showSpeciesPicker)}
            >
              <Text style={species ? styles.inputText : styles.placeholderText}>
                {species || 'Sélectionner une espèce...'}
              </Text>
              <Ionicons
                name={showSpeciesPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {showSpeciesPicker && (
              <ScrollView style={styles.speciesList} nestedScrollEnabled>
                {TREE_SPECIES.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={styles.speciesItem}
                    onPress={() => {
                      setSpecies(spec);
                      setShowSpeciesPicker(false);
                    }}
                  >
                    <Text style={styles.speciesItemText}>{spec}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Variety */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Variété</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Zitoun, Chemlali..."
              value={variety}
              onChangeText={setVariety}
              placeholderTextColor="#999"
            />
          </View>

          {/* Plant Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date de plantation</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={plantDate}
              onChangeText={setPlantDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Health Status */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>État de santé *</Text>
            <View style={styles.healthOptions}>
              {healthOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.healthOption,
                    health === option.value && { borderColor: option.color, borderWidth: 2 },
                  ]}
                  onPress={() => setHealth(option.value)}
                >
                  <View
                    style={[
                      styles.healthIndicator,
                      { backgroundColor: option.color },
                    ]}
                  />
                  <Text style={styles.healthOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observations, interventions..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* GPS */}
          <View style={styles.gpsSection}>
            <Text style={styles.label}>Position GPS (optionnel)</Text>
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
              <TouchableOpacity style={styles.gpsButton} onPress={handleGetLocation}>
                <Ionicons name="location-outline" size={20} color="#556B2F" />
                <Text style={styles.gpsButtonText}>Obtenir la position</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#556B2F',
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#556B2F',
    borderStyle: 'dashed',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#556B2F',
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  speciesList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 8,
  },
  speciesItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  speciesItemText: {
    fontSize: 16,
    color: '#333',
  },
  healthOptions: {
    gap: 8,
  },
  healthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 12,
  },
  healthIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  healthOptionText: {
    fontSize: 16,
    color: '#333',
  },
  gpsSection: {
    marginBottom: 24,
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
    backgroundColor: '#fff',
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