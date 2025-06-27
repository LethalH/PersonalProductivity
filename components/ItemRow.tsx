import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Checkbox from './Checkbox';
import FavouriteButton from './FavouriteButton';

interface ItemRowProps {
  id: string;
  text: string;
  completed: boolean;
  isFavourite: boolean;
  onToggleComplete: () => void;
  onToggleFavourite: () => void;
  onLongPress: () => void;
  type?: 'inbox' | 'projects' | 'nextActions';
  meta?: React.ReactNode;
  style?: ViewStyle;
  actions?: React.ReactNode;
}

const ItemRow: React.FC<ItemRowProps> = ({
  text,
  completed,
  isFavourite,
  onToggleComplete,
  onToggleFavourite,
  onLongPress,
  type,
  meta,
  style,
  actions,
}) => (
  <TouchableOpacity onLongPress={onLongPress} delayLongPress={300} activeOpacity={0.8}>
    <View style={[styles.item, completed && styles.completed, style]}>
      <View style={styles.contentRow}>
        <Checkbox checked={completed} onPress={onToggleComplete} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.text,
              completed && styles.textCompleted,
            ]}
          >
            {text}
          </Text>
          {meta}
        </View>
        <FavouriteButton isFavourite={isFavourite} onPress={onToggleFavourite} />
      </View>
      {/* Only show action buttons for inbox type and not completed */}
      {type === 'inbox' && !completed && actions && (
        <View style={styles.actionButtons}>{actions}</View>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  completed: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});

export default ItemRow; 