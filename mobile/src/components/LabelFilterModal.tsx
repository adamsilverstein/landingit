import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import type { LabelInfo } from '../../../shared/types.js';
import { contrastColor } from '../../../shared/utils/contrastColor.js';

interface LabelFilterModalProps {
  visible: boolean;
  onClose: () => void;
  labels: LabelInfo[];
  selectedLabels: Set<string>;
  onToggle: (label: string) => void;
  onClear: () => void;
}

export function LabelFilterModal({
  visible, onClose, labels, selectedLabels, onToggle, onClear,
}: LabelFilterModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Filter by Label</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {labels.map((label) => {
            const selected = selectedLabels.has(label.name);
            const bg = `#${label.color}`;
            const fg = contrastColor(label.color);
            return (
              <TouchableOpacity
                key={label.name}
                style={styles.labelRow}
                onPress={() => onToggle(label.name)}
              >
                <View style={[styles.labelBadge, { backgroundColor: bg }]}>
                  <Text style={[styles.labelText, { color: fg }]}>{label.name}</Text>
                </View>
                <Text style={styles.checkmark}>{selected ? '\u2713' : ''}</Text>
              </TouchableOpacity>
            );
          })}
          {labels.length === 0 && (
            <Text style={styles.emptyText}>No labels found in current items.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
    backgroundColor: '#161b22',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#e6edf3',
  },
  clearText: {
    fontSize: 15,
    color: '#f85149',
  },
  doneText: {
    fontSize: 15,
    color: '#58a6ff',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  labelBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: '#58a6ff',
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#484f58',
    textAlign: 'center',
    paddingTop: 40,
  },
});
