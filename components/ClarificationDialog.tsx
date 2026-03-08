import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '../constants/colors';
import { ActionPayload, ClarificationField } from '../types';

interface Props {
  sheetRef: React.RefObject<BottomSheet | null>;
  action: ActionPayload;
  missingFields: ClarificationField[];
  onConfirm: (updatedAction: ActionPayload) => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  send_email: 'Send Email',
  create_event: 'Create Event',
  create_meeting: 'Schedule Meeting',
};

export function ClarificationDialog({ sheetRef, action, missingFields, onConfirm, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    missingFields.forEach((f) => { init[f.key] = f.value ?? ''; });
    return init;
  });

  const handleConfirm = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated: any = { ...action };
    for (const field of missingFields) {
      const val = values[field.key]?.trim();
      if (val) {
        updated[field.key] = val;
      }
    }
    onConfirm(updated);
  };

  const allFilled = missingFields.every((f) => values[f.key]?.trim());

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['45%', '70%']}
      enablePanDownToClose
      onClose={onCancel}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Text style={styles.title}>{ACTION_LABELS[action.actionType] ?? 'Complete Action'}</Text>
          <Text style={styles.subtitle}>Fill in the missing details:</Text>

          {missingFields.map((field) => (
            <View key={field.key} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={values[field.key] ?? ''}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.accent}
                multiline={field.key === 'body'}
              />
            </View>
          ))}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !allFilled && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!allFilled}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: Colors.surface },
  handle: { backgroundColor: Colors.textTertiary },
  content: { padding: 20 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20, color: Colors.text, marginBottom: 4 },
  subtitle: { fontFamily: 'Syne_400Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontFamily: 'Syne_500Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Syne_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cancelBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 15, color: Colors.textSecondary },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 15, color: '#fff' },
});
