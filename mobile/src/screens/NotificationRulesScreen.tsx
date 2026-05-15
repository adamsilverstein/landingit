import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import type {
  NotificationRule,
  RuleCondition,
  RuleField,
  RuleOp,
} from '../../../shared/types.js';
import {
  BUILTIN_PRESETS,
  notificationsMatchingRule,
} from '../../../shared/hooks/useNotificationRules.js';
import { useNotificationsContext } from '../context/NotificationsContext';

const FIELD_OPTIONS: ReadonlyArray<{ value: RuleField; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'repo', label: 'Repo' },
  { value: 'reason', label: 'Reason' },
  { value: 'subjectType', label: 'Subject type' },
];

const OP_OPTIONS: ReadonlyArray<{ value: RuleOp; label: string }> = [
  { value: 'startsWith', label: 'starts with' },
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'regex', label: 'regex' },
];

function emptyDraft(): Omit<NotificationRule, 'id' | 'createdAt'> {
  return {
    name: '',
    enabled: true,
    autoApply: false,
    conditions: [{ field: 'title', op: 'startsWith', value: '' }],
    action: 'mark-read',
  };
}

function CycleButton<T>({
  options,
  value,
  onChange,
  style,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  style?: object;
}) {
  return (
    <TouchableOpacity
      style={[styles.cycleBtn, style]}
      onPress={() => {
        const idx = options.findIndex((o) => o.value === value);
        const next = options[(idx + 1) % options.length];
        onChange(next.value);
      }}
    >
      <Text style={styles.cycleText}>
        {options.find((o) => o.value === value)?.label ?? String(value)}
      </Text>
    </TouchableOpacity>
  );
}

export function NotificationRulesScreen() {
  const {
    rules,
    notifications,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    applyRule,
  } = useNotificationsContext();

  const [draft, setDraft] =
    useState<Omit<NotificationRule, 'id' | 'createdAt'> | null>(null);

  const draftMatchCount = useMemo(() => {
    if (!draft) return 0;
    return notificationsMatchingRule(
      { ...draft, id: '__draft__', createdAt: new Date().toISOString() },
      notifications
    ).length;
  }, [draft, notifications]);

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim() || draft.conditions.length === 0) return;
    addRule(draft);
    setDraft(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={styles.sectionTitle}>Add preset</Text>
      <View style={styles.presetsRow}>
        {BUILTIN_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.name}
            onPress={() => addRule({ ...preset })}
            style={styles.chip}
          >
            <Text style={styles.chipText}>+ {preset.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setDraft(emptyDraft())}
          disabled={draft !== null}
          style={[styles.chip, draft !== null && styles.chipDisabled]}
        >
          <Text style={styles.chipText}>+ Custom</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Rules</Text>
      {rules.length === 0 && !draft && (
        <Text style={styles.empty}>
          No rules yet. Add a preset above or build a custom rule.
        </Text>
      )}

      {rules.map((rule) => {
        const matchCount = notificationsMatchingRule(rule, notifications).length;
        return (
          <View key={rule.id} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <Switch
                value={rule.enabled}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ true: '#58a6ff', false: '#30363d' }}
              />
              <Text
                style={[styles.ruleName, !rule.enabled && styles.ruleNameDisabled]}
              >
                {rule.name}
              </Text>
              <Text style={styles.ruleMatch}>{matchCount} match</Text>
            </View>
            <View style={styles.conditionsSummary}>
              {rule.conditions.map((c, i) => (
                <Text key={i} style={styles.conditionText}>
                  {c.field} {c.op} "{c.value}"
                  {i < rule.conditions.length - 1 ? ' AND ' : ''}
                </Text>
              ))}
            </View>
            <View style={styles.ruleActions}>
              <View style={styles.autoToggleRow}>
                <Switch
                  value={rule.autoApply}
                  onValueChange={(v) => updateRule(rule.id, { autoApply: v })}
                  trackColor={{ true: '#58a6ff', false: '#30363d' }}
                />
                <Text style={styles.autoLabel}>Auto-apply</Text>
              </View>
              <TouchableOpacity
                onPress={() => applyRule(rule)}
                disabled={matchCount === 0 || !rule.enabled}
                style={[
                  styles.applyBtn,
                  (matchCount === 0 || !rule.enabled) && styles.applyBtnDisabled,
                ]}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteRule(rule.id)}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {draft && (
        <View style={[styles.ruleCard, styles.draftCard]}>
          <TextInput
            style={styles.input}
            placeholder="Rule name"
            placeholderTextColor="#6e7681"
            value={draft.name}
            onChangeText={(text) =>
              setDraft((prev) => prev && { ...prev, name: text })
            }
            autoFocus
          />
          {draft.conditions.map((cond, idx) => (
            <View key={idx} style={styles.conditionEdit}>
              <CycleButton
                options={FIELD_OPTIONS}
                value={cond.field}
                onChange={(v) =>
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = [...prev.conditions];
                    next[idx] = { ...next[idx], field: v };
                    return { ...prev, conditions: next };
                  })
                }
                style={{ flex: 0.3 }}
              />
              <CycleButton
                options={OP_OPTIONS}
                value={cond.op}
                onChange={(v) =>
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = [...prev.conditions];
                    next[idx] = { ...next[idx], op: v };
                    return { ...prev, conditions: next };
                  })
                }
                style={{ flex: 0.35 }}
              />
              <TextInput
                style={[styles.input, { flex: 0.35, marginTop: 0 }]}
                placeholder="value"
                placeholderTextColor="#6e7681"
                value={cond.value}
                onChangeText={(text) =>
                  setDraft((prev) => {
                    if (!prev) return prev;
                    const next = [...prev.conditions];
                    next[idx] = { ...next[idx], value: text };
                    return { ...prev, conditions: next };
                  })
                }
              />
            </View>
          ))}
          <TouchableOpacity
            onPress={() =>
              setDraft(
                (prev) =>
                  prev && {
                    ...prev,
                    conditions: [
                      ...prev.conditions,
                      { field: 'title', op: 'startsWith', value: '' } as RuleCondition,
                    ],
                  }
              )
            }
          >
            <Text style={styles.linkBtn}>+ Add condition (AND)</Text>
          </TouchableOpacity>
          <Text style={styles.ruleMatch}>
            Would match {draftMatchCount} current
          </Text>
          <View style={styles.ruleActions}>
            <TouchableOpacity onPress={() => setDraft(null)}>
              <Text style={styles.linkBtn}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveDraft}
              disabled={!draft.name.trim()}
              style={[
                styles.applyBtn,
                !draft.name.trim() && styles.applyBtnDisabled,
              ]}
            >
              <Text style={styles.applyBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  sectionTitle: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: '#e6edf3', fontSize: 12 },
  empty: {
    color: '#7d8590',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  ruleCard: {
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 12,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#21262d',
    borderRadius: 8,
  },
  draftCard: { borderColor: '#58a6ff' },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleName: { color: '#e6edf3', fontSize: 14, fontWeight: '600', flex: 1 },
  ruleNameDisabled: { color: '#7d8590' },
  ruleMatch: { color: '#6e7681', fontSize: 11 },
  conditionsSummary: { marginTop: 6, gap: 2 },
  conditionText: { color: '#7d8590', fontSize: 12, fontFamily: 'Menlo' },
  conditionEdit: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  autoToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 'auto',
  },
  autoLabel: { color: '#7d8590', fontSize: 12 },
  applyBtn: {
    backgroundColor: '#58a6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#f85149',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtnText: { color: '#f85149', fontSize: 12 },
  input: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#e6edf3',
    fontSize: 13,
    marginTop: 6,
  },
  cycleBtn: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  cycleText: { color: '#e6edf3', fontSize: 12 },
  linkBtn: { color: '#58a6ff', fontSize: 12, marginTop: 8 },
});
