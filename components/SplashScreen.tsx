import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000); // 3 seconds
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.title}>Personal Productivity</Text>
        <View style={styles.woodGrain} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#966F33', // rich wooden color
  },
  card: {
    backgroundColor: '#FFF8E1',
    borderRadius: 24,
    paddingVertical: 48,
    paddingHorizontal: 36,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#654321',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    borderWidth: 2,
    borderColor: '#B8860B',
    position: 'relative',
  },
  welcome: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#654321',
    marginBottom: 12,
    textShadowColor: '#B8860B',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5C2A',
    letterSpacing: 1,
    textShadowColor: '#FFF8E1',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  woodGrain: {
    position: 'absolute',
    bottom: -16,
    left: 0,
    right: 0,
    height: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: '#B8860B',
    opacity: 0.2,
  },
});

export default SplashScreen; 