import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  phone: string;
  is_demo?: boolean;
  is_guest?: boolean;
}

export default function MenuScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('user');
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'home-outline',
      label: 'Accueil',
      description: 'Liste des fermes',
      onPress: () => router.push('/'),
    },
    {
      icon: 'stats-chart-outline',
      label: 'Statistiques',
      description: 'Vue d\'ensemble de vos données',
      onPress: () => router.push('/stats'),
    },
    {
      icon: 'search-outline',
      label: 'Recherche',
      description: 'Rechercher et filtrer les arbres',
      onPress: () => router.push('/search'),
    },
    {
      icon: 'download-outline',
      label: 'Export/Import',
      description: 'Sauvegarder ou restaurer les données',
      onPress: () => router.push('/export'),
    },
    {
      icon: 'information-circle-outline',
      label: 'À propos',
      description: 'Version 2.0.0',
      onPress: () => Alert.alert('Arbor\'iA', 'Version 2.0.0\n\nApplication de gestion arboricole intelligente.'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#556B2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#556B2F" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.is_demo ? 'Utilisateur Démo' : user?.is_guest ? 'Invité' : user?.phone || 'Non connecté'}
            </Text>
            <Text style={styles.userStatus}>
              {user?.is_demo ? 'Mode démonstration' : user?.is_guest ? 'Mode hors ligne' : 'Connecté'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>
                <Ionicons name={item.icon as any} size={24} color="#556B2F" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        {user && !user.is_guest && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#dc3545" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        )}

        {user?.is_guest && (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="log-in-outline" size={24} color="#556B2F" />
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  userAvatar: {
    width: 56,
    height: 56,
    backgroundColor: '#f0f5ea',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f5ea',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc3545',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#556B2F',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});