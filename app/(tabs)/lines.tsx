import axios from "axios";
import { useEffect, useState } from "react";
import { View, StyleSheet, TextInput, Platform, ActivityIndicator, Text, ScrollView, Pressable } from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from "expo-router";
export default function linesSelect() {
const [searchInput, setSearchInput] = useState('');
const [filteredRoutes, setFilteredRoutes] = useState({}); 
const [routes, setRoutes] = useState(null);
useEffect(() => {
  const getRoutes = async () => {
      try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}api/routes` || '', {
          headers: {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY
          }
      });
      setRoutes(response.data)
      setFilteredRoutes(response.data)
  } catch (err) {
      console.log('Error fetching ' + err)
  }
  }
  getRoutes();
}, [])

const handleSearch = (text: string) => {
  setSearchInput(text.trim());

  if (!text.trim() || !routes) {
    setFilteredRoutes(routes || ""); // Temporary fix for the TS error.
    return;
  }

  const filtered = Object.fromEntries(
    Object.entries(routes).filter(([key]) => key.includes(text))
  );

  setFilteredRoutes(filtered);
};


  
    return(
        <View style={styles.background}>
            <View style={{marginTop: 80, paddingHorizontal: 20, height: "87%"}}>
                      <TextInput
                        style={styles.input}
                        placeholder="Search a line number"
                        keyboardType="numeric"
                        placeholderTextColor='white'
                        value={searchInput}
                        onChangeText={handleSearch}
                      />
             {routes != null ? (
              <ScrollView contentContainerStyle={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 30 }}>
                {Object.keys(filteredRoutes).map((route) => (
                  <Pressable  key={route} onPress={() => router.push(`/routeMap?routeId=${(routes[route] as any)?.id}&routeName=${route}`)}>
                <View style={{width: "100%", height: 70, borderRadius: 8, backgroundColor: 'black', display: 'flex',flexDirection: 'row', paddingHorizontal: 20,paddingVertical: 10, justifyContent: "space-between", alignItems: 'center'}}>
                  <View style={{ height: '100%', width: 50,borderRadius: 8, backgroundColor: `#${(routes[route] as any).color}`, justifyContent: 'center', alignItems: 'center'}}>
                    <Text style={{fontWeight: "700", color: 'white', fontSize: 18}}>{route}</Text>
                  </View>
                  <View style={{flexDirection: 'column', gap: 2, alignItems: 'center'}}>
                  <Text style={{fontWeight: '700', fontSize: 15, color: 'white'}}>This is a {(routes[route] as any).type} line.</Text>
                  <Text style={{fontWeight: '500', fontSize: 10, color: 'gray'}}>Click to view route details</Text>

                  </View>
                  <MaterialIcons name={Number.isNaN(parseInt(route)) || parseInt(route) > 99 ? "directions-bus" : "tram"} size={24} color={`#${(routes[route] as any).color}`} />
                </View>
                </Pressable>
                ))}

              </ScrollView>
            ) : (
              <View style={{display: "flex", alignContent: "center", justifyContent: "center", marginTop: 40}}>
                  <ActivityIndicator size="small" color="rgb(255, 255, 255)" />
              </View>
            )}
            </View>


        </View>
    )

}
const styles = StyleSheet.create({
    background: {
        backgroundColor: "#121212",
        width: "100%",
        height: "95%"
    },
    input: {
        height: 50,
        padding: 10,
        marginVertical: 10,
        borderRadius: 8,
        color: '#ffffff',
        backgroundColor: 'black',
        ...Platform.select({
              ios: {
                shadowColor: 'black',
                shadowOffset: { width: 1, height: 2 },
                shadowOpacity: 0.9,
                shadowRadius: 10,
              },
              android: {
                elevation: 5, 
              },
        }),
      },
})

