import { StyleSheet, Alert, Button, TextInput } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
const API_LINK = process.env.EXPO_PUBLIC_API_URL;


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
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_API_KEY as string,
         },
        body: JSON.stringify({ vehicleNumber }),
      });
      const data = await response.json(); 
      if (response.ok) {
        Alert.alert('Success', `Vehicle ${vehicleNumber} ${action}${action == 'add' ? 'ed' : 'd'} successfully!`);
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
      If you can feel the AC is working but the status in the app shows the opposite, you can remove the vehicle from the faulty AC list.
    </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Enter a vehicle ID"
        keyboardType="numeric"
        placeholderTextColor='white'
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
