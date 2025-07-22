import { StyleSheet, TextInput, View, ActivityIndicator, TouchableOpacity, Keyboard } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
const API_LINK = process.env.EXPO_PUBLIC_API_URL;


export default function TabTwoScreen() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState<'add' | 'remove' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRequest = async (action: 'add' | 'remove') => {
    if (!vehicleNumber.trim()) {
      setMessage({ type: 'error', text: 'Please enter a vehicle number.' });
      return;
    }
    setLoading(action);
    setMessage(null);
    Keyboard.dismiss();
    try {
      const response = await fetch(`${API_LINK}api/vehicle/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_API_KEY as string,
        },
        body: JSON.stringify({ vehicleNumber }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Vehicle ${vehicleNumber} ${action}${action == 'add' ? 'ed' : 'd'} successfully!` });
        setVehicleNumber('');
      } else {
        setMessage({ type: 'error', text: `Failed to ${action} vehicle. ${data.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
    >
      <ThemedView style={styles.titleContainer}>
        <MaterialIcons name="severe-cold" size={28} color="#3a7afe" style={styles.titleIcon} />
        <ThemedText type="title">Faulty AC vehicles</ThemedText>
      </ThemedView>

      <View style={styles.instructionsCard}>
        <ThemedText style={styles.instructionsTitle}>How it works</ThemedText>
        <ThemedText style={styles.instructionsText}>
          Add vehicles with faulty AC units by entering their ID. If you can feel the AC is working but the status in the app shows the opposite, you can remove the vehicle from the faulty AC list.
        </ThemedText>
      </View>

      <View style={styles.card}>
        {message && (
          <View style={[styles.message, message.type === 'success' ? styles.success : styles.error]}>
            <ThemedText style={styles.messageText}>{message.text}</ThemedText>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Enter a vehicle ID"
          keyboardType="numeric"
          placeholderTextColor="#bbb"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          editable={!loading}
          returnKeyType="done"
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, loading === 'add' && styles.buttonDisabled, !vehicleNumber.trim() && styles.buttonDisabled]}
            onPress={() => handleRequest('add')}
            disabled={loading !== null || !vehicleNumber.trim()}
            activeOpacity={0.8}
          >
            {loading === 'add' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add-circle-outline" size={22} color="#fff" />
                <ThemedText style={styles.buttonText}>Add</ThemedText>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton, loading === 'remove' && styles.buttonDisabled, !vehicleNumber.trim() && styles.buttonDisabled]}
            onPress={() => handleRequest('remove')}
            disabled={loading !== null || !vehicleNumber.trim()}
            activeOpacity={0.8}
          >
            {loading === 'remove' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="remove-circle-outline" size={22} color="#fff" />
                <ThemedText style={styles.buttonText}>Remove</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleIcon: {
    marginRight: 4,
  },
  instructionsCard: {
    backgroundColor: 'rgba(60,60,60,0.12)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
  },
  instructionsTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 15,
    color: '#888',
  },
  card: {
    backgroundColor: 'rgba(40,40,40,0.18)',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
  },
  input: {
    borderWidth: 0,
    backgroundColor: 'rgba(120,120,120,0.18)',
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a7afe',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 2,
    gap: 6,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  success: {
    backgroundColor: 'rgba(46, 204, 113, 0.18)',
  },
  error: {
    backgroundColor: 'rgba(231, 76, 60, 0.18)',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
