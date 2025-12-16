import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-mirror-16.preview.emergentagent.com';
const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

interface Tree {
  id: string;
  position: string;
  species: string;
  photos?: string[];
  photo?: string;
}

export default function PhotosScreen() {
  const router = useRouter();
  const { treeId } = useLocalSearchParams();
  const id = Array.isArray(treeId) ? treeId[0] : treeId;

  const [tree, setTree] = useState<Tree | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, [id]);

  const loadTree = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`);
      if (!response.ok) throw new Error('Failed to load tree');
      const data = await response.json();
      setTree(data);
      
      // Combine photos array and single photo
      const allPhotos = data.photos || [];
      if (data.photo && !allPhotos.includes(data.photo)) {
        allPhotos.unshift(data.photo);
      }
      setPhotos(allPhotos);
    } catch (error) {
      console.error('Error loading tree:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la caméra');
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
        await uploadPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
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
        Alert.alert('Permission refusée', 'Veuillez autoriser l\'accès à la galerie');
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
        await uploadPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadPhoto = async (photoData: string) => {
    try {
      setUploading(true);
      const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: photoData }),
      });

      if (!response.ok) throw new Error('Upload failed');
      
      loadTree();
      Alert.alert('Succès', 'Photo ajoutée');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoIndex: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}/photos/${photoIndex}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Delete failed');
              setSelectedPhoto(null);
              loadTree();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la photo');
            }
          },
        },
      ]
    );
  };

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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Photos</Text>
          {tree && (
            <Text style={styles.headerSubtitle}>
              {tree.position} - {tree.species}
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Add Photo Buttons */}
        <View style={styles.addSection}>
          <TouchableOpacity
            style={[styles.addButton, uploading && styles.addButtonDisabled]}
            onPress={handleTakePhoto}
            disabled={uploading}
          >
            <Ionicons name="camera" size={24} color="#556B2F" />
            <Text style={styles.addButtonText}>Prendre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, uploading && styles.addButtonDisabled]}
            onPress={handlePickImage}
            disabled={uploading}
          >
            <Ionicons name="images" size={24} color="#556B2F" />
            <Text style={styles.addButtonText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        {uploading && (
          <View style={styles.uploadingIndicator}>
            <ActivityIndicator color="#556B2F" />
            <Text style={styles.uploadingText}>Ajout en cours...</Text>
          </View>
        )}

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucune photo</Text>
            <Text style={styles.emptyDescription}>Ajoutez des photos pour cet arbre</Text>
          </View>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoItem}
                onPress={() => setSelectedPhoto(photo)}
              >
                <Image source={{ uri: photo }} style={styles.photoThumbnail} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Photo Preview Modal */}
      <Modal visible={!!selectedPhoto} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const index = photos.indexOf(selectedPhoto!);
                if (index >= 0) handleDeletePhoto(index);
              }}
              style={styles.deletePhotoButton}
            >
              <Ionicons name="trash-outline" size={24} color="#dc3545" />
            </TouchableOpacity>
          </View>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.fullPhoto} resizeMode="contain" />
          )}
        </View>
      </Modal>
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
  headerInfo: {
    flex: 1,
    marginLeft: 12,
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
  content: {
    flex: 1,
    padding: 16,
  },
  addSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#556B2F',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#556B2F',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#666',
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  closeButton: {
    padding: 8,
  },
  deletePhotoButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  fullPhoto: {
    width: '100%',
    height: '70%',
  },
});