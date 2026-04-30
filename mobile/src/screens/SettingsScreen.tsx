import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useConfigContext } from '../context/ConfigContext';
import { authMethodLabel, getAuthMethod } from '../../../shared/auth/method';

export function SettingsScreen() {
  const { token, username, rateLimit, signOut } = useApp();
  const authMethod = getAuthMethod(token);
  const { config, addRepo, removeRepo, toggleRepo, updateDefaults } = useConfigContext();
  const [repoInput, setRepoInput] = useState('');

  const handleAddRepo = useCallback(() => {
    const trimmed = repoInput.trim();
    const match = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (!match) {
      Alert.alert('Invalid format', 'Enter a repository as owner/name (e.g. facebook/react)');
      return;
    }
    addRepo(match[1], match[2]);
    setRepoInput('');
  }, [repoInput, addRepo]);

  const handleRemoveRepo = useCallback((index: number) => {
    Alert.alert('Remove repository?', 'This will stop tracking this repository.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeRepo(index) },
    ]);
  }, [removeRepo]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'This will remove your GitHub token.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }, [signOut]);

  return (
    <ScrollView style={styles.container}>
      {/* User info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{username ?? '...'}</Text>
        </View>
        {authMethod && (
          <View style={styles.row}>
            <Text style={styles.label}>Connection</Text>
            <Text style={styles.value}>{authMethodLabel(authMethod)}</Text>
          </View>
        )}
        {rateLimit && (
          <View style={styles.row}>
            <Text style={styles.label}>API Rate Limit</Text>
            <Text style={styles.value}>{rateLimit.remaining}/{rateLimit.limit}</Text>
          </View>
        )}
      </View>

      {/* Repositories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repositories</Text>

        <View style={styles.addRepoRow}>
          <TextInput
            style={styles.input}
            value={repoInput}
            onChangeText={setRepoInput}
            placeholder="owner/repo"
            placeholderTextColor="#484f58"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleAddRepo}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, !repoInput.trim() && styles.addButtonDisabled]}
            onPress={handleAddRepo}
            disabled={!repoInput.trim()}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {config.repos.map((repo, index) => (
          <View key={`${repo.owner}/${repo.name}`} style={styles.repoRow}>
            <TouchableOpacity
              style={styles.repoToggle}
              onPress={() => toggleRepo(index)}
            >
              <Text style={[styles.repoName, !repo.enabled && styles.repoDisabled]}>
                {repo.enabled ? '◉' : '○'} {repo.owner}/{repo.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveRepo(index)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {config.repos.length === 0 && (
          <Text style={styles.emptyText}>No repositories added yet.</Text>
        )}
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.prefRow}>
          <Text style={styles.label}>Max PRs per repo</Text>
          <TextInput
            style={styles.prefInput}
            value={String(config.defaults.maxPrsPerRepo)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!isNaN(n) && n > 0) updateDefaults({ maxPrsPerRepo: n });
            }}
            keyboardType="number-pad"
            placeholderTextColor="#484f58"
          />
        </View>

        <View style={styles.prefRow}>
          <Text style={styles.label}>Stale after (days)</Text>
          <TextInput
            style={styles.prefInput}
            value={String(config.defaults.staleDays)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 0) updateDefaults({ staleDays: n });
            }}
            keyboardType="number-pad"
            placeholderTextColor="#484f58"
          />
        </View>

        <View style={styles.prefRow}>
          <Text style={styles.label}>Auto-refresh (sec)</Text>
          <TextInput
            style={styles.prefInput}
            value={String(config.defaults.autoRefreshInterval)}
            onChangeText={(v) => {
              const n = parseInt(v, 10);
              if (!isNaN(n) && n >= 0) updateDefaults({ autoRefreshInterval: n });
            }}
            keyboardType="number-pad"
            placeholderTextColor="#484f58"
          />
        </View>

        <Text style={styles.prefHint}>Set auto-refresh to 0 to disable.</Text>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Git Dashboard iOS v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7d8590',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    color: '#e6edf3',
  },
  value: {
    fontSize: 15,
    color: '#7d8590',
  },
  addRepoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#e6edf3',
  },
  addButton: {
    backgroundColor: '#238636',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  repoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  repoToggle: {
    flex: 1,
  },
  repoName: {
    fontSize: 15,
    color: '#e6edf3',
  },
  repoDisabled: {
    color: '#484f58',
  },
  removeText: {
    fontSize: 13,
    color: '#f85149',
  },
  emptyText: {
    fontSize: 14,
    color: '#484f58',
    fontStyle: 'italic',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  prefInput: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: '#e6edf3',
    width: 80,
    textAlign: 'center',
  },
  prefHint: {
    fontSize: 12,
    color: '#484f58',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#21262d',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  signOutText: {
    color: '#f85149',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#484f58',
  },
});
