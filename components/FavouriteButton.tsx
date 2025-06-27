import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface FavouriteButtonProps {
  isFavourite: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

const FavouriteButton: React.FC<FavouriteButtonProps> = ({ isFavourite, onPress, style }) => (
  <TouchableOpacity style={[styles.heartBtn, style]} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.heartIcon, isFavourite && styles.heartIconActive]}>{isFavourite ? '♥' : '♡'}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  heartBtn: {
    marginLeft: 10,
    padding: 4,
  },
  heartIcon: {
    fontSize: 20,
    color: '#888',
  },
  heartIconActive: {
    color: 'red',
  },
});

export default FavouriteButton; 