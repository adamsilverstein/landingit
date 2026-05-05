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
  SafeAreaView,
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

const STEP_ORDER: Step[] = ['welcome', 'add', 'confirm'];

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

  const stepIndex = STEP_ORDER.indexOf(step);
  const stepNumber = stepIndex + 1;
  const totalSteps = STEP_ORDER.length;
  const percent = Math.round((stepNumber / totalSteps) * 100);

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerLabel}>SETUP</Text>
          <TouchableOpacity onPress={step === 'welcome' ? onSignOut : onFinish} hitSlop={12}>
            <Text style={styles.headerLink}>{step === 'welcome' ? 'Sign out' : 'Skip'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>Step {stepNumber} of {totalSteps}</Text>
          <Text style={styles.progressPercent}>{percent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'welcome' && (
            <WelcomePane username={username} />
          )}
          {step === 'add' && (
            <AddPane
              input={input}
              onChange={(v) => {
                setInput(v);
                if (error) setError(null);
              }}
              error={error}
            />
          )}
          {step === 'confirm' && (
            <ConfirmPane repos={repos} />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 'welcome' && (
            <PrimaryButton label="Get started" onPress={() => setStep('add')} />
          )}
          {step === 'add' && (
            <>
              <PrimaryButton
                label="Add repository"
                onPress={handleAdd}
                disabled={!input.trim()}
              />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('welcome')}>
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
          {step === 'confirm' && (
            <>
              <PrimaryButton label="Open dashboard" onPress={onFinish} />
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('add')}>
                <Text style={styles.secondaryText}>Add another repository</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomePane({ username }: { username: string | null }) {
  return (
    <>
      <View style={styles.brandIcon}>
        <Text style={styles.brandIconText}>L</Text>
      </View>
      <Text style={styles.title}>
        Welcome to <Text style={styles.titleAccent}>LandinGit</Text>
        {username ? <Text style={styles.titleAccent}>, {username}</Text> : null}
      </Text>
      <Text style={styles.tagline}>where prs land.</Text>
      <Text style={styles.body}>
        Track pull requests across your repositories — reviews, CI, mentions —
        all in one fast, keyboard-friendly feed.
      </Text>

      <View style={styles.featureRow}>
        <FeatureGlyph kind="eye" />
        <Text style={styles.featureText}>See every PR that needs your attention</Text>
      </View>
      <View style={styles.featureRow}>
        <FeatureGlyph kind="layers" />
        <Text style={styles.featureText}>All your repos, one quiet feed</Text>
      </View>
      <View style={styles.featureRow}>
        <FeatureGlyph kind="bolt" />
        <Text style={styles.featureText}>Stale-aware — spot stuck PRs early</Text>
      </View>
    </>
  );
}

function AddPane({
  input,
  onChange,
  error,
}: {
  input: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <>
      <Text style={styles.title}>Add a repository</Text>
      <Text style={styles.body}>
        Enter a GitHub repository to track. You can add more later from the
        Settings tab.
      </Text>
      <Text style={styles.fieldLabel}>Repository</Text>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={onChange}
        placeholder="owner/repo (e.g., facebook/react)"
        placeholderTextColor="#666"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        accessibilityLabel="Repository owner and name"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.hint}>
        You can also paste a github.com URL — we'll handle the rest.
      </Text>
    </>
  );
}

function ConfirmPane({ repos }: { repos: RepoConfig[] }) {
  return (
    <>
      <Text style={styles.title}>You're all set.</Text>
      <Text style={styles.body}>
        {repos.length === 1
          ? "You're tracking your first repository:"
          : `You're tracking ${repos.length} repositories:`}
      </Text>
      {repos.map((r) => (
        <View key={`${r.owner}/${r.name}`} style={styles.repoRow}>
          <Text style={styles.repoText}>{r.owner}/{r.name}</Text>
        </View>
      ))}
    </>
  );
}

function FeatureGlyph({ kind }: { kind: 'eye' | 'layers' | 'bolt' }) {
  const glyph = kind === 'eye' ? '◉' : kind === 'layers' ? '❖' : '⚡';
  return (
    <View style={styles.glyphBox}>
      <Text style={styles.glyphText}>{glyph}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.primaryDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryText}>{label}  →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 12,
    color: '#7d8590',
    letterSpacing: 1.5,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerLink: {
    fontSize: 14,
    color: '#7d8590',
    position: 'absolute',
    right: 24,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#7d8590',
  },
  progressPercent: {
    fontSize: 13,
    color: '#7d8590',
  },
  progressTrack: {
    marginHorizontal: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#21262d',
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#58a6ff',
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#1f2a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  brandIconText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#3fb950',
    letterSpacing: -1,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#e6edf3',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 6,
  },
  titleAccent: {
    color: '#58a6ff',
  },
  tagline: {
    fontSize: 15,
    color: '#7d8590',
    fontStyle: 'italic',
    marginBottom: 18,
  },
  body: {
    fontSize: 15,
    color: '#7d8590',
    lineHeight: 22,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  glyphBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(88, 166, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: {
    fontSize: 18,
    color: '#58a6ff',
  },
  featureText: {
    fontSize: 15,
    color: '#e6edf3',
    flex: 1,
    lineHeight: 22,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7d8590',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#e6edf3',
  },
  error: {
    color: '#f85149',
    fontSize: 13,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: '#7d8590',
    marginTop: 8,
  },
  repoRow: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  repoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#e6edf3',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    color: '#7d8590',
    fontSize: 14,
  },
});
