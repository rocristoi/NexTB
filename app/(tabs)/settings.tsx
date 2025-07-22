import { View, Text, Switch, Pressable, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useStore } from '../store/useStore';
import { FontAwesome } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const {
    displayAdditionalInfo,
    toggleDisplayAdditionalInfo,
    selectedPrimaryDetail,
    setSelectedPrimaryDetail,
  } = useStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your app experience</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Options</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <MaterialIcons name="info-outline" size={20} color="#4FC3F7" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Show additional vehicle info</Text>
                <Text style={styles.cardSubtitle}>Display extra details like AC status and passenger count</Text>
              </View>
            </View>
            <Switch
              value={displayAdditionalInfo}
              onValueChange={toggleDisplayAdditionalInfo}
              ios_backgroundColor="#23263A"
              thumbColor={displayAdditionalInfo ? '#4FC3F7' : '#9BA1A6'}
              trackColor={{ false: '#23263A', true: '#1E90FF' }}
              style={styles.switch}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <MaterialIcons name="star-outline" size={20} color="#FFD700" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Primary detail preference</Text>
                <Text style={styles.cardSubtitle}>Choose what information to display prominently</Text>
              </View>
            </View>
            
            <View style={styles.buttonContainer}>
              <Pressable
                onPress={() => setSelectedPrimaryDetail('ac')}
                style={({ pressed }) => [
                  styles.selectButton,
                  selectedPrimaryDetail === 'ac' && styles.selectedButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <View style={styles.buttonContent}>
                  <FontAwesome name="snowflake-o" size={16} color={selectedPrimaryDetail === 'ac' ? '#4FC3F7' : '#9BA1A6'} />
                  <Text style={[
                    styles.buttonText,
                    selectedPrimaryDetail === 'ac' && styles.selectedButtonText
                  ]}>AC Status</Text>
                </View>
              </Pressable>
              
              <Pressable
                onPress={() => setSelectedPrimaryDetail('psg')}
                style={({ pressed }) => [
                  styles.selectButton,
                  selectedPrimaryDetail === 'psg' && styles.selectedButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <View style={styles.buttonContent}>
                  <FontAwesome6 name="person" size={16} color={selectedPrimaryDetail === 'psg' ? '#4FC3F7' : '#9BA1A6'} />
                  <Text style={[
                    styles.buttonText,
                    selectedPrimaryDetail === 'psg' && styles.selectedButtonText
                  ]}>Passenger Count</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <MaterialIcons name="info" size={20} color="#4FC3F7" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>App Information</Text>
                <Text style={styles.cardSubtitle}>Version and developer details</Text>
              </View>
            </View>
            
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>{Constants.expoConfig?.version || 'Unknown'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Developer</Text>
                <Text style={styles.infoValue}>dev.cristoi.ro</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    fontWeight: '400',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#23263A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '400',
  },
  switch: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  selectButton: {
    flex: 1,
    backgroundColor: '#23263A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedButton: {
    borderColor: '#4FC3F7',
    backgroundColor: '#1E1E1E',
  },
  pressedButton: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '600',
  },
  selectedButtonText: {
    color: '#4FC3F7',
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});