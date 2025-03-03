import { View, Text, Switch, Pressable, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { FontAwesome } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Constants from 'expo-constants';

export default function SettingsScreen() {
const {displayAdditionalInfo, toggleDisplayAdditionalInfo, selectedPrimaryDetail, setSelectedPrimaryDetail} = useStore();

  return (
    <View style={{ flex: 1, justifyContent: 'flex-start', paddingVertical: 70, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#121212', display: 'flex' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Settings</Text>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, alignItems: 'center', backgroundColor: 'black', padding: 14, borderRadius: 8, width: '100%'}}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>Display extra vehicle information</Text>
            <Switch value={displayAdditionalInfo} onValueChange={toggleDisplayAdditionalInfo} ios_backgroundColor='rgb(6, 87, 255)'/>
        </View>
        <View style={{padding: 14, borderRadius: 8, backgroundColor: 'black', display: 'flex', marginTop: 14, width: '100%', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>Which primary detail do you prefer to display?</Text>
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, paddingHorizontal: 30 }}>
            {Platform.OS === 'ios' ? (
            <>
            <Pressable onPress={() => setSelectedPrimaryDetail('ac')}>
            <View style={{padding: 8, borderRadius: 8, backgroundColor: '#121212',
                 shadowColor: 'rgb(6, 87, 255)', 
                 shadowOpacity: selectedPrimaryDetail == 'ac' ? 0.8 : 0, 
                 shadowRadius: 5, 
                 elevation: 5, 
                 shadowOffset: { width: 0, height: 0 }, 

             }}>
                 <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <FontAwesome name="snowflake-o" size={16} color="blue" />
                        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                            AC Status
                        </Text>
                </View>
            </View>
            </Pressable>
            <Pressable onPress={() => {
            setSelectedPrimaryDetail('psg')}}>
               
            <View style={{padding: 8, borderRadius: 8, backgroundColor: '#121212',
                                 shadowColor: 'rgb(6, 87, 255)', 
                                 shadowOpacity: selectedPrimaryDetail == 'psg' ? 0.8 : 0, 
                                 shadowRadius: 5, 
                                 elevation: 5, 
                                 shadowOffset: { width: 0, height: 0 }, 
             }}>
                 <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <FontAwesome6 name="person" size={16} color="#DEDEDE" />
                        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                            Psg. Count
                        </Text>
                </View>
            </View>
            </Pressable>
            </>
            ) : (
                <>
            <Pressable onPress={() => setSelectedPrimaryDetail('ac')}>
            <View style={{padding: 8, borderRadius: 8, backgroundColor: '#121212',
                borderColor: 'rgb(6, 87, 255)',
                borderWidth:  selectedPrimaryDetail == 'ac' ? 1 : 0,      
             }}>
                 <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <FontAwesome name="snowflake-o" size={16} color="blue" />
                        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                            AC Status
                        </Text>
                </View>
            </View>
            </Pressable>
            <Pressable onPress={() => {
            setSelectedPrimaryDetail('psg')}}>
               
            <View style={{padding: 8, borderRadius: 8, backgroundColor: '#121212',
                borderColor: 'rgb(6, 87, 255)',
                borderWidth:  selectedPrimaryDetail == 'psg' ? 1 : 0,  
             }}>
                 <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <FontAwesome6 name="person" size={16} color="#DEDEDE" />
                        <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                            Psg. Count
                        </Text>
                </View>
            </View>
            </Pressable>
                </>
            )}

        </View>

        </View>
             <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#DEDEDE', marginTop: 20 }}>NexTB by dev.cristoi.ro</Text>
             <Text style={{ fontSize: 10, fontWeight: 'normal', color: '#DEDEDE', marginTop: 2 }}>App Version: {Constants.expoConfig?.version || 'Unknown'}</Text>
    </View>
  );
}