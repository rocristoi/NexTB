import { StyleSheet, Alert, Button, TextInput } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
const API_LINK = 'http://x.x.x.x:3000/'


export default function TabTwoScreen() {
  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleRequest = async (action: 'add' | 'remove') => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter a vehicle number.');
      return;
    }

    try {
      const response = await fetch(`${API_LINK}api/vehicle/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNumber }),
      });
      const data = await response.json(); 
      if (response.ok) {
        Alert.alert('Success', `Vehicle ${vehicleNumber} ${action}ed successfully!`);
        setVehicleNumber(''); 
      } else {
        Alert.alert('Error', `Failed to ${action} vehicle. ${data.error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <MaterialIcons name="severe-cold" size={280} color="#808080" style={styles.headerImage} />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Faulty AC vehicles</ThemedText>
      </ThemedView>

      <ThemedText style={{ textAlign: 'left', fontSize: 16, fontWeight: '500' }}>
      Add vehicles with faulty AC units by entering their ID.  
      If the AC is working but the status seems incorrect, you can remove the vehicle from the faulty AC list.
    </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Enter a vehicle ID"
        keyboardType="numeric"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
      />

      <Button title="Add" onPress={() => handleRequest('add')} />
      <Button title="Remove" onPress={() => handleRequest('remove')} color="red" />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    color: '#fff'
  },
});
