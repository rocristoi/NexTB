import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Image, View, StatusBar, TouchableOpacity, Text, ScrollView, Vibration } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import axios from 'axios';
import stops from '@/assets/data/stops.json'
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
const API_LINK = 'http://x.x.x.x:3000/'
const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 200;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.65;
const CLOSE_THRESHOLD = COLLAPSED_HEIGHT + 100;

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<Number | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); 
  const y = useSharedValue(0);
  const height = useSharedValue(COLLAPSED_HEIGHT); 


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (modalVisible) {
      fetchData();

      interval = setInterval(() => {
        fetchData();
      }, 45000);
    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modalVisible]); 


  const fetchData = async () => {
    try {
      const response = await axios.get(`${API_LINK}api?stationID=${selectedPoint}`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };




  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
    getCurrentLocation();
  }, []);

  const centerMap = () => {
    if (location) {
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const toggleModal = async (stationID: any) => {
    if (!modalVisible) {
      try {
        console.log('Checking for ' + stationID)
        const r = await axios.get(`${API_LINK}api?stationID=${stationID}`);
        setData(r.data);
      } catch (error: any) {
        console.log('Error fetching data:', error);
        if (error.response) {
          console.log('Response Data:', error.response.data);
          console.log('Response Status:', error.response.status);
          console.log('Response Headers:', error.response.headers);
        } else if (error.request) {
          console.log('Request Details:', error.request);
        } else {
          console.log('Error Message:', error);
        }
      }
      setModalVisible(true);
    } else if(selectedPoint !== stationID) {
      setModalVisible(false);
      setData(null);
      try {
        console.log('Checking for ' + stationID)
        const r = await axios.get(`${API_LINK}api?stationID=${stationID}`);
        setData(r.data);
      } catch (error: any) {
        console.log('Error fetching data:', error);
        if (error.response) {
          console.log('Response Data:', error.response.data);
          console.log('Response Status:', error.response.status);
          console.log('Response Headers:', error.response.headers);
        } else if (error.request) {
          console.log('Request Details:', error.request);
        } else {
          console.log('Error Message:', error);
        }
      }
      setModalVisible(true);
    } else {
      setModalVisible(false)
      setSelectedPoint(null);
      setData(null);

    }
  };



  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      height.value = Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, height.value - event.translationY));
    })
    .onEnd((event) => {
      if (height.value > COLLAPSED_HEIGHT + (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) / 2) {
        height.value = withSpring(EXPANDED_HEIGHT);
        runOnJS(setIsExpanded)(true); 
      } else if (height.value < CLOSE_THRESHOLD) {
        height.value = withSpring(COLLAPSED_HEIGHT);
        runOnJS(setIsExpanded)(false); 
      } else {
        if (isExpanded) {
          height.value = withSpring(EXPANDED_HEIGHT);
        } else {
          height.value = withSpring(COLLAPSED_HEIGHT);
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <MapView
        style={styles.map}
        mapType="mutedStandard"
        region={region}
        showsUserLocation={true}
      >
        {stops.filter(stop => stop.location_type !== 2).map(stop => (
          <Marker
            coordinate={{
              latitude: stop.stop_lat,
              longitude: stop.stop_lon,
            }}
            key={stop.stop_id}
            onPress={() =>  { 
              setSelectedPoint(stop.stop_id);
              Vibration.vibrate(50);
              toggleModal(stop.stop_id)
            }} 
          >
<Svg width={24} height={24} viewBox="0 0 24 24"> 
  <Circle fill="rgb(6, 87, 255)" cx="12" cy="12" r="11" />
  <Circle cx="12" cy="12" r="7" fill={selectedPoint == stop.stop_id ? 'rgb(6, 87, 255)' : 'white'} />
</Svg>
          </Marker>
        ))}
      </MapView>

      {data != null && modalVisible && (
        <Animated.View
          style={[
            styles.modalContainer,
            { bottom: modalVisible ? 0 : -COLLAPSED_HEIGHT, marginBottom: 40 },
            animatedStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={styles.modalStationText}>
              <View style={styles.line} />
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                textAlign: 'center',
                marginTop: 10,
                color: 'white'
              }}>{data?.name} ({String(selectedPoint)})</Text>
            </View>
          </GestureDetector>

          <ScrollView
            style={{ flex: 1, marginTop: 10 }}
            contentContainerStyle={{ paddingHorizontal: '5%', paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {Object.keys(data.lines).map(lineName => (
              <View
                key={lineName}
                style={{
                  backgroundColor: '#121212',
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 15,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  alignItems: 'center'
                }}
              >
                {data.lines[lineName].length == 0}
                <View
                  style={{
                    borderRadius: 20,
                    backgroundColor: data.lines[lineName].length == 0 ? '#666' : 'rgb(6, 87, 255)',
                    paddingVertical: 8,
                    paddingHorizontal: 20,
                    minWidth: 80,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: 18
                    }}
                  >
                    {lineName}
                  </Text>
                </View>

                <View style={{ width: '100%' }}>
                  {data.lines[lineName].slice(0, 4).map((tram: any) => (
                    <View
                      key={tram.id}
                      style={{
                        backgroundColor: 'black',
                        padding: 12,
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        alignItems: 'center',
                        marginBottom: 10, 
                        width: '100%'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: 'white',
                          marginBottom: 5
                        }}
                      >
                        {tram.time?.toString() === 'm' ? '17+ minutes' : tram.time == 0 ? 'Now' : tram.time == 1 ? '1 minute' : tram.time == undefined ? `No AT` : `${tram.time?.toString()} minutes` || "17+ minutes"}
                        
                      </Text>

                      <View style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}>
                      <Image 
                      source={{ uri: tram.image }} 
                      resizeMode="contain" 
                      style={{ width: 170, height: 110 }} 
                    />                    
                     <Text style={{ fontSize: 14, color: '#666' }}>
                        {tram.type || "No additional info!"}
                      </Text>
                      <View style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 10,
                      }}>
                        {tram.id !== null && (
                       <Text style={{ fontSize: 14, color: '#666' }}>
                        {tram.id}
                      </Text>
                        )}
                      <Text style={{ fontSize: 14, color: '#666' }}>
                        {tram.plate}
                      </Text>
                      </View>
                      </View>
                      <View style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        marginTop: 10,
                      }}>
                      {tram.on_board !== null && (
                      <Text style={{ fontSize: 14, color: '#fff' }}>
                        {`${tram.on_board} people on board`}
                      </Text>
                      )}
                      {tram.id !== null && (
                    <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center', 
                      gap: 4 
                    }}
                  >

                    <FontAwesome name="snowflake-o" size={12} color={tram.ac ? "blue" : "red"} />
                    <Text style={{ fontSize: 14, color: '#fff' }}>
                      {tram.ac ? `AC` : 'No AC'}
                    </Text>
                  </View>
                      )}

                      </View>
                    
                     
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: 'black',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  map: {
    flex: 1,
  },
  logo: {
    width: 300,
    height: 60,
    marginBottom: 10,
  },
  centerButton: {
    position: 'absolute',
    bottom: 100,
    right: 10,
    backgroundColor: 'black',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'black',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowColor: '#000',
    elevation: 10,
  },
  modalStationText: {
    display: 'flex',
    alignItems: 'center',
  },
  line: {
    width: '30%',
    height: 6,
    backgroundColor: 'gray',
    alignSelf: 'center',
    borderRadius: 2,
    marginVertical: 10,
  }
});