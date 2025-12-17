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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const EXPO_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://6f6167cb-6516-4e54-8fa7-01ef2429da00.preview.emergentagent.com';

interface Intervention {
  id: string;
  tree_id: string;
  type: string;
  notes?: string;
  date: string;
  created_at: string;
}

interface Tree {
  id: string;
  position: string;
  species: string;
}

const INTERVENTION_TYPES = [
  { value: 'watering', label: 'Arrosage', icon: 'water-outline', color: '#17a2b8' },
  { value: 'treatment', label: 'Traitement', icon: 'medical-outline', color: '#6f42c1' },
  { value: 'pruning', label: 'Taille', icon: 'cut-outline', color: '#fd7e14' },
  { value: 'harvest', label: 'Récolte', icon: 'basket-outline', color: '#28a745' },
  { value: 'fertilization', label: 'Fertilisation', icon: 'leaf-outline', color: '#556B2F' },
  { value: 'observation', label: 'Observation', icon: 'eye-outline', color: '#6c757d' },
];

export default function InterventionsScreen() {
  const router = useRouter();
  const { treeId } = useLocalSearchParams();
  const id = Array.isArray(treeId) ? treeId[0] : treeId;

  const [tree, setTree] = useState<Tree | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newType, setNewType] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load tree info
      const treeRes = await fetch(`${EXPO_BACKEND_URL}/api/trees/${id}`);
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        setTree(treeData);
      }

      // Load interventions
      const intRes = await fetch(`${EXPO_BACKEND_URL}/api/interventions?tree_id=${id}`);
      if (intRes.ok) {
        const intData = await intRes.json();
        setInterventions(intData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntervention = async () => {
    if (!newType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type d\'intervention');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${EXPO_BACKEND_URL}/api/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree_id: id,
          type: newType,
          notes: newNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to add intervention');

      setShowModal(false);
      setNewType('');
      setNewNotes('');
      loadData();
      Alert.alert('Succès', 'Intervention ajoutée');
    } catch (error) {
      console.error('Error adding intervention:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'intervention');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntervention = (interventionId: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cette intervention ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_BACKEND_URL}/api/interventions/${interventionId}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error('Delete failed');
              loadData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const getTypeInfo = (type: string) => {
    return INTERVENTION_TYPES.find(t => t.value === type) || INTERVENTION_TYPES[5];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#556B2F" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Interventions</Text>
          {tree && (
            <Text style={styles.headerSubtitle}>
              {tree.position} - {tree.species}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#556B2F" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {interventions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucune intervention</Text>
            <Text style={styles.emptyDescription}>
              Ajoutez une intervention pour cet arbre
            </Text>
          </View>
        ) : (
          interventions.map((intervention) => {
            const typeInfo = getTypeInfo(intervention.type);
            return (
              <View key={intervention.id} style={styles.interventionCard}>
                <View style={[styles.typeIcon, { backgroundColor: typeInfo.color }]}>
                  <Ionicons name={typeInfo.icon as any} size={24} color="#fff" />
                </View>
                <View style={styles.interventionContent}>
                  <Text style={styles.interventionType}>{typeInfo.label}</Text>
                  <Text style={styles.interventionDate}>{formatDate(intervention.date)}</Text>
                  {intervention.notes && (
                    <Text style={styles.interventionNotes}>{intervention.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteIntervention(intervention.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Intervention Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle intervention</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Type d'intervention *</Text>
            <View style={styles.typeGrid}>
              {INTERVENTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    newType === type.value && { borderColor: type.color, borderWidth: 2 },
                  ]}
                  onPress={() => setNewType(type.value)}
                >
                  <View style={[styles.typeOptionIcon, { backgroundColor: type.color }]}>
                    <Ionicons name={type.icon as any} size={20} color="#fff" />
                  </View>
                  <Text style={styles.typeOptionLabel}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes (optionnel)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Ajouter des notes..."
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddIntervention}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Ajouter l'intervention</Text>
              )}
            </TouchableOpacity>
          </View>
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
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
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
  interventionCard: {
    flexDirection: 'row',
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
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  interventionContent: {
    flex: 1,
  },
  interventionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  interventionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  interventionNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  typeOption: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  typeOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeOptionLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#556B2F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});