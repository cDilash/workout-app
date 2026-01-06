import { StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

import { Text, View } from '@/components/Themed';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ready to Train?</Text>

      <Link href="/workout/new" asChild>
        <Pressable style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Workout</Text>
        </Pressable>
      </Link>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        <Text style={styles.emptyText}>No workouts yet. Start your first one!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  recentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
