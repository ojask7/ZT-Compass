import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.shieldIcon}>🛡️</Text>
        <Text style={styles.title}>ZT Compass</Text>
        <Text style={styles.subtitle}>Zero Trust Maturity Assessment</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assess your Zero Trust maturity</Text>
        <Text style={styles.cardDesc}>
          Evaluate your organisation's security posture across identity, devices, networks, applications, and data.
        </Text>
      </View>
      <TouchableOpacity style={styles.scanButton} onPress={() => router.push('/main')}>
        <Text style={styles.scanButtonText}>Start QuickScan 🚀</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.learnButton} onPress={() => router.push('/main')}>
        <Text style={styles.learnButtonText}>View Full Assessment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'space-between', padding: 24, paddingTop: 80, paddingBottom: 48 },
  header: { alignItems: 'center' },
  shieldIcon: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#e2e8f0' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#e2e8f0', marginBottom: 12 },
  cardDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
  scanButton: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 18, alignItems: 'center' },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  learnButton: { borderWidth: 1, borderColor: '#334155', borderRadius: 14, padding: 16, alignItems: 'center' },
  learnButtonText: { color: '#94a3b8', fontSize: 16 },
});
