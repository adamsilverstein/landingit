import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { RepoConfig } from '../../../shared/types.js';

interface OnboardingScreenProps {
  username: string | null;
  repos: RepoConfig[];
  onAddRepo: (owner: string, name: string) => void;
  onFinish: () => void;
  onSignOut: () => void;
}

type Step = 'welcome' | 'add' | 'confirm';

export function OnboardingScreen({
  username,
  repos,
  onAddRepo,
  onFinish,
  onSignOut,
}: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);
    const trimmed = input.trim().replace(/^https?:\/\/github\.com\//, '');
    const parts = trimmed.split('/').filter(Boolean);
    if (parts.length !== 2) {
      setError('Enter a repository in owner/name format (e.g., facebook/react).');
      return;
    }
    const [owner, name] = parts;
    if (repos.some((r) => r.owner === owner && r.name === name)) {
      setError(`${owner}/${name} is already in your list.`);
      return;
    }
    onAddRepo(owner, name);
    setInput('');
    setStep('confirm');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Progress step={step} />

        {step === 'welcome' && (
          <View style={styles.card}>
            <Text style={styles.title}>
              Welcome to LandinGit{username ? `, ${username}` : ''}
            </Text>
            <Text style={styles.body}>
              LandinGit gives you a fast dashboard for the pull requests and
              issues you care about across your GitHub repositories.
            </Text>
            <Text style={styles.bullet}>• Track PRs you authored, were assigned, or are involved in.</Text>
            <Text style={styles.bullet}>• See CI status, review state, and stale work at a glance.</Text>
            <Text style={styles.bullet}>• Stay focused with filters and quick search.</Text>
            <Text style={styles.cta}>First, let's connect a repository to monitor.</Text>
            <TouchableOpacity style={styles.button} onPress={() => setStep('add')}>
              <Text style={styles.buttonText}>Get started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={onSignOut}>
              <Text style={styles.linkText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'add' && (
          <View style={styles.card}>
            <Text style={styles.title}>Add a repository</Text>
            <Text style={styles.body}>
              Enter a GitHub repository to track. You can add more later from
              the Settings tab.
            </Text>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (error) setError(null);
              }}
              placeholder="owner/repo (e.g., facebook/react)"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              accessibilityLabel="Repository owner and name"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.button, !input.trim() && styles.buttonDisabled]}
              onPress={handleAdd}
              disabled={!input.trim()}
            >
              <Text style={styles.buttonText}>Add repository</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep('welcome')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.card}>
            <Text style={styles.title}>You're all set</Text>
            <Text style={styles.body}>
              {repos.length === 1
                ? "Great — you're tracking your first repository:"
                : `Great — you're tracking ${repos.length} repositories:`}
            </Text>
            {repos.map((r) => (
              <View key={`${r.owner}/${r.name}`} style={styles.repoRow}>
                <Text style={styles.repoText}>{r.owner}/{r.name}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.button} onPress={onFinish}>
              <Text style={styles.buttonText}>Open dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => setStep('add')}>
              <Text style={styles.linkText}>Add another repository</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Progress({ step }: { step: Step }) {
  const order: Step[] = ['welcome', 'add', 'confirm'];
  const labels: Record<Step, string> = {
    welcome: 'Welcome',
    add: 'Add repo',
    confirm: 'Done',
  };
  const activeIndex = order.indexOf(step);
  return (
    <View style={styles.progress}>
      {order.map((s, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
        return (
          <View key={s} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                state === 'active' && styles.progressDotActive,
                state === 'done' && styles.progressDotDone,
              ]}
            >
              <Text
                style={[
                  styles.progressDotText,
                  state === 'active' && styles.progressDotTextActive,
                  state === 'done' && styles.progressDotTextDone,
                ]}
              >
                {i + 1}
              </Text>
            </View>
            <Text
              style={[styles.progressLabel, state !== 'pending' && styles.progressLabelOn]}
            >
              {labels[s]}
            </Text>
          </View>
        );
      })}
    </View>
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
  progress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#30363d',
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: '#58a6ff',
    borderColor: '#58a6ff',
  },
  progressDotDone: {
    borderColor: '#58a6ff',
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7d8590',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressDotTextDone: {
    color: '#58a6ff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#7d8590',
  },
  progressLabelOn: {
    color: '#e6edf3',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e6edf3',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: '#7d8590',
    lineHeight: 20,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    color: '#7d8590',
    lineHeight: 20,
    marginBottom: 4,
  },
  cta: {
    fontSize: 14,
    color: '#e6edf3',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#e6edf3',
    marginBottom: 12,
  },
  error: {
    color: '#f85149',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#238636',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#58a6ff',
    fontSize: 14,
    textAlign: 'center',
  },
  repoRow: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  repoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#e6edf3',
    fontSize: 14,
  },
});
