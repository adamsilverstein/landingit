import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AuthPanel } from '../components/AuthPanel';

export function TokenSetupScreen() {
  const { saveToken } = useApp();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>LandinGit</Text>
        <Text style={styles.subtitle}>GitHub PR Dashboard for iOS</Text>
        <View style={styles.card}>
          <AuthPanel onSave={saveToken} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#e6edf3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7d8590',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
});
