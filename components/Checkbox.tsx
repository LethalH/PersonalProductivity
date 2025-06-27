import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onPress, style }) => (
  <TouchableOpacity
    style={[styles.checkbox, checked && styles.checked, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {checked && <Text style={styles.checkmark}>✓</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  checked: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default Checkbox;
