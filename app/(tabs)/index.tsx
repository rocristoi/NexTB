import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SafeAreaView, StyleSheet, Image, View, StatusBar, Text, Platform, Pressable, LayoutAnimation, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Marker, Region } from 'react-native-maps';
import MapView  from "react-native-map-clustering";
interface CustomMapView extends MapView {
  animateToRegion: (region: any, duration?: number) => void;
}
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import axios from 'axios';
import { FontAwesome } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Collapsible from 'react-native-collapsible';
import { useStore } from '../store/useStore';
import * as Haptics from 'expo-haptics';
import LottieView from "lottie-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let Mapbox: any;

if (!(Platform.OS === 'ios')) {
  Mapbox = require('@rnmapbox/maps'); 
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);
}
const API_LINK = process.env.EXPO_PUBLIC_API_URL;


export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region | undefined>(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [data, setData] = useState<any | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["20%", "70%"], []);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const {displayAdditionalInfo, selectedPrimaryDetail} = useStore();
  const mapRef = useRef<CustomMapView | null>(null);

  const [stops, setStops] = useState<any[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);

  const screenHeight = Dimensions.get("window").height;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets(); 
  const bottomSpacing = tabBarHeight + (Platform.OS === "android" ? insets.bottom : 0);
  const animateToCenter = () => {
    const REGION = {
      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    }
    mapRef.current?.animateToRegion(REGION, 1000);
  }

  const HandleChangeActiveCard = (id: string) => {
    if(Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
    }
    setActiveCard(prev => (prev === id ? null : id)); 
  };


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
      const response = await axios.get(`${API_LINK}api?stationID=${selectedPoint}`, {
        headers: {
            "x-api-key": process.env.EXPO_PUBLIC_API_KEY
        }
    });
    setData(response.data);
    setStationError(null);
    } catch (error: any) {
      if (error.response && error.response.status === 503) {
        setStationError('The STB server is unreachable at the moment due to a high volume of requests and their rate limiting.');
        setData(null);
      } else {
        setStationError(null);
        console.error("Error fetching data:", error);
      }
    }
  };

  useEffect(() => {
    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          return;
        }
  
        const lastKnownLocation = await Location.getLastKnownPositionAsync();
        if (lastKnownLocation) {
          setLocation(lastKnownLocation);
          setRegion({
            latitude: lastKnownLocation.coords.latitude,
            longitude: lastKnownLocation.coords.longitude,
            latitudeDelta: 0.05, 
            longitudeDelta: 0.05,
          });
        }
  
        const preciseLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
  
        setLocation(preciseLocation);
        setRegion({
          latitude: preciseLocation.coords.latitude,
          longitude: preciseLocation.coords.longitude,
          latitudeDelta: 0.01, 
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error("Error getting location:", error);
      }
    }
  
    getCurrentLocation();
  }, []);

  useEffect(() => {

    const fetchStops = async () => {
      setStopsLoading(true);
      setStopsError(null);
      try {
        const response = await axios.get(`${API_LINK}api/getstops`, {
          headers: {
            "x-api-key": process.env.EXPO_PUBLIC_API_KEY
          }
        });
        setStops(response.data);
      } catch (error: any) {
        setStopsError('Failed to load stops');
        setStops([]);
      } finally {
        setStopsLoading(false);
      }
    };
    fetchStops();
  }, []);

  const toggleModal = async (stationID: any) => {
    if (!modalVisible) {
      setModalVisible(true);
      try {
        const r = await axios.get(`${API_LINK}api?stationID=${stationID}`, {
          headers: {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY
          }
      });
        setData(r.data);
        setStationError(null);
      } catch (error: any) {
        if (error.response && error.response.status === 503) {
          setStationError('The STB server is unreachable at the moment due to a high volume of requests and their rate limiting.');
          setData(null);
        } else {
          setStationError(null);
          console.log('Error fetching data:', error);
        }
      }
    } else if(selectedPoint !== stationID) {
      setData(null);
      setActiveCard(null);
      try {
        const r = await axios.get(`${API_LINK}api?stationID=${stationID}`, {
          headers: {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY
          }
      });
        setData(r.data);
        setStationError(null);
      } catch (error: any) {
        if (error.response && error.response.status === 503) {
          setStationError('The STB server is unreachable at the moment due to a high volume of requests and their rate limiting.');
          setData(null);
        } else {
          setStationError(null);
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
      }
    } else {
      setModalVisible(false)
      setSelectedPoint(null);
      setData(null);
      setActiveCard(null);
      setStationError(null);
    }
  };

  if (stopsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <ActivityIndicator size="large" color="#0657FF" />
        <Text style={{ color: 'white', marginTop: 16 }}>Loading stops...</Text>
      </SafeAreaView>
    );
  }
  if (stopsError) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <Text style={{ color: 'red' }}>{stopsError}</Text>
      </SafeAreaView>
    );
  }

  if(Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.headerModern}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logoModern} resizeMode="contain" />
        </View>
        <View style={{width: "100%", height: screenHeight - bottomSpacing }}>
        <MapView
          style={styles.map}
          ref={mapRef}
          mapType="mutedStandard"
          region={region || { latitude: 44.426858, longitude:  26.102377, latitudeDelta: 0.1, longitudeDelta: 0.1 }} 
          showsUserLocation={true}
          clusterColor="rgb(6, 87, 255)"
          radius={50}
          renderCluster={cluster => {
            const { id, geometry, onPress, properties } = cluster;
            const points = properties.point_count;
      
            return (
              <Marker
                key={`cluster-${id}`}
                coordinate={{
                  longitude: geometry.coordinates[0],
                  latitude: geometry.coordinates[1]
                }}
                onPress={onPress}
              >
                <View style={styles.clusterMarkerModern}>
                  <Text style={styles.clusterTextModern}>{points > 9 ? '9+' : points}</Text>
                </View>
              </Marker>
            );
          }}
      
        >
          {stops.filter(stop => (stop.location_type == 0 || stop.location_type == 1) && stop.parent_station == "").map(stop => (
            <Marker
              coordinate={{
                latitude: stop.stop_lat,
                longitude: stop.stop_lon,
              }}
              key={stop.stop_id}
              onPress={() =>  { 
                setSelectedPoint(Number(stop.stop_id)); 
                Haptics.selectionAsync();
                toggleModal(stop.stop_id);
              }} 
            >
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle fill="rgb(6, 87, 255)" cx="12" cy="12" r="11" />
              <Circle cx="12" cy="12" r="7" fill={selectedPoint == stop.stop_id ? 'rgb(6, 87, 255)' : 'white'} />
            </Svg>
            </Marker>
          ))}
        </MapView>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.centerButtonModern, { bottom: Math.max(tabBarHeight + insets.bottom - 32, 4) }]}
          onPress={animateToCenter}
        >
          <Text style={styles.centerButtonTextModern}>📍</Text>
        </TouchableOpacity>
        </View>
        { modalVisible && (
                  <BottomSheet
                  ref={sheetRef}
                  index={1}
                  snapPoints={snapPoints}
                  enableDynamicSizing={false}
                  backgroundStyle={{ backgroundColor: "rgba(18,18,18,0.95)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0 }}
                  handleIndicatorStyle={{backgroundColor: "#444", height: 6, width: 60, borderRadius: 3, marginTop: 8, marginBottom: 8, alignSelf: 'center'}}
                  detached={true}
                  enablePanDownToClose={true}
                  onClose={() => {
                    setModalVisible(false)
                    setSelectedPoint(null);
                    setData(null);
                    setActiveCard(null);
                    setStationError(null);
                  }}
                >
                  <BottomSheetScrollView style={{backgroundColor: "transparent", marginBottom: 80}}  contentContainerStyle={styles.bottomContainerModern} >
                  {stationError ? (
                    <View style={{padding: 32, alignItems: 'center', justifyContent: 'center', gap: 16}}>
                      <FontAwesome name="exclamation-circle" size={40} color="#888" style={{marginBottom: 12}} />
                      <Text style={{color: '#DEDEDE', fontSize: 16, textAlign: 'center', fontWeight: '500', marginBottom: 0}}>{stationError}</Text>
                    </View>
                  ) : data != null ? (
                  <View>
                  <View style={styles.stationHeaderModern}>
                    <View style={styles.stationHeaderLeftModern}>
                      <Text style={styles.stationNameModern}>{data.name}</Text>
                      <Text style={styles.stationAddressModern}>{data.address}</Text>
                    </View>
                    <View>
                      <Image source={require('@/assets/images/station.png')} style={{width: 40, height: 40}} resizeMode="contain" />
                    </View>
                  </View>
                  <View style={styles.stationDividerModern}></View>
                  <View style={styles.linesListModern}>
                    {Object.keys(data.lines).map(lineName => (
                      <View key={lineName} style={styles.lineCardModern}>
                        <Pressable onPress={() => HandleChangeActiveCard(lineName)}>
                          <View style={styles.lineCardHeaderModern}>
                            <View style={[styles.lineBadgeModern, {backgroundColor: data.lines[lineName].length == 0 ? '#666' : '#0657FF'}]}>
                              <Text style={styles.lineBadgeTextModern}>{lineName}</Text>
                            </View>
                            <View style={styles.lineTimesModern}>
                              <Text style={styles.lineTimesTextModern}>
                                {data.lines[lineName][0]?.time === undefined
                                  ? '-'
                                  : data.lines[lineName][0]?.time === 'm'
                                    ? '17+'
                                    : data.lines[lineName][0]?.time}
                                min
                              </Text>
                              <Image 
                                source={require('@/assets/images/arrow.png')} 
                                style={{width: 14, height: 14}} 
                                resizeMode="contain"
                              />
                            </View>
                          </View>
                        </Pressable>
                        <Collapsible collapsed={activeCard == null ? true : activeCard != lineName} style={styles.tramListModern}>
                          <View style={{marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8}}>
                          {data.lines[lineName].slice(0, 4).map((tram: any, index: number) => (
                            <View key={tram.plate} style={styles.tramCardModern}>
                              <View style={styles.tramCardHeaderModern}>
                                <Text style={styles.tramTimeModern}>
                                  {tram.time === undefined || tram.time === null
                                    ? '-'
                                    : tram.time?.toString() === 'm'
                                      ? '17+ min'
                                      : tram.time == 0
                                        ? 'Now'
                                        : tram.time == 1
                                          ? '1 min'
                                          : `${tram.time} min`}
                                </Text>
                                <View style={styles.tramDetailsModernCentered}>
                                  {selectedPrimaryDetail == 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined && (
                                    <>
                                      <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                      <Text style={styles.tramDetailTextModern}>{tram.on_board}</Text>
                                    </>
                                  ) }
                                  {selectedPrimaryDetail == 'ac' && (
                                  <>
                                    <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "#0657FF" : "#FF4D4D"} />
                                    <Text style={styles.tramDetailTextModern}>
                                      {tram.ac ? `AC` : 'No AC'}
                                    </Text>
                                  </>
                                  )}
                                </View>
                                <Image 
                                  source={{ uri: tram.image }} 
                                  resizeMode="contain" 
                                  style={styles.tramImageModern} 
                                />        
                              </View>
                              {displayAdditionalInfo && (
                                <View style={[styles.tramExtraModernCentered, { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', width: '100%' }]}> 
                                  {selectedPrimaryDetail != 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined  && (
                                    <View style={styles.tramExtraDetailModern}>
                                      <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                      <Text style={styles.tramDetailTextModern}>{tram.on_board}</Text>
                                    </View>
                                  )}
                                  {selectedPrimaryDetail != 'ac' && (
                                    <View style={styles.tramExtraDetailModern}>
                                      <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "#0657FF" : "#FF4D4D"} />
                                      <Text style={styles.tramDetailTextModern}>{tram.ac ? `AC` : 'No AC'}</Text>
                                    </View>
                                  )}
                                  <Text style={styles.tramDetailTextModern}>{tram.plate}</Text>
                                  {tram.id !== null && tram.id !== 0 && (
                                    <Text style={styles.tramDetailTextModern}>{tram.id}</Text>
                                  )}
                                </View>
                              )}
                            </View>
                          ))}
                          {data.lines[lineName].length == 0 && (
                            <View style={styles.noVehiclesModern}>
                              <Text style={styles.noVehiclesTextModern}>There are currently no vehicles on this route</Text>
                              <Text style={styles.noVehiclesSubTextModern}>However, some may be operating in the opposite direction</Text>
                            </View>
                          )}
                          </View>
                        </Collapsible>
                      </View>
                    ))}
                  </View>
                  </View>
                  ):(
                    <View style={styles.loadingModern}>
                      <View style={styles.stationHeaderModern}>
                        <View style={styles.stationHeaderLeftModern}>
                          <Text style={styles.stationNameModern}>Loading Data</Text>
                          <Text style={styles.stationAddressModern}>Please wait.</Text>
                        </View>
                        <View>
                          <LottieView
                            source={require("@/assets/loader.json")} 
                            autoPlay
                            loop
                            style={{ width: 50, height: 50 }}
                          />
                        </View>
                      </View>
                      <View style={styles.stationDividerModern}></View>
                      <View style={styles.loadingSpinnerModern}>
                        <ActivityIndicator size="large" color="#0657FF" />
                      </View>
                    </View>
                  )}
                  </BottomSheetScrollView>
                </BottomSheet>
        )}
      </SafeAreaView>
    );
  } else {
    const filteredStops = useMemo(() => 
      stops.filter(stop => (stop.location_type == 0 || stop.location_type == 1) && stop.parent_station == ""), 
      [stops]
    );

    const cameraRef = useRef(null);

    const animateToCenterAndroid = async () => {
      const userLocation = await Mapbox.locationManager.getLastKnownLocation();
      if (userLocation) {
        (cameraRef.current as any)?.flyTo([userLocation.coords.longitude, userLocation.coords.latitude], 1000);
      }
    } 
  
    const geoJSON = useMemo(() => ({
      type: "FeatureCollection",
      features: filteredStops.map(stop => ({
        type: "Feature",
        id: stop.stop_id.toString(),
        geometry: {
          type: "Point",
          coordinates: [stop.stop_lon, stop.stop_lat], 
        },
        properties: {
          stop_id: stop.stop_id,
          isSelected: selectedPoint === stop.stop_id, 
        },
      })),
    }), [filteredStops, selectedPoint]);
    
    return (
      <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={{width: "100%", height: screenHeight - bottomSpacing - 20 }}>

      <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
        
      
      <Mapbox.Camera
        zoomLevel={16}
        centerCoordinate={region ? [region.longitude, region.latitude] : [ 26.102377, 44.426858]}
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [26.1025, 44.4268], 
          zoomLevel: 12,
        }}
        />
        
      <Mapbox.Images
        images={{
          "default-marker": require("@/assets/not-selected.png"),
          "selected-marker": require("@/assets/selected.png"),
          "cluster-marker": require("@/assets/more.png"),
          
        }}
        />

      <Mapbox.ShapeSource
        id="stopsSource"
        shape={geoJSON}
        cluster={true} 
        clusterMaxZoom={16} 
        clusterRadius={20}
        onPress={(event: any) => {
          const stopId = event.features[0]?.properties?.stop_id;
          if (stopId) {
            setSelectedPoint(Number(stopId)); 
            Haptics.selectionAsync();
            toggleModal(stopId);
          }
        }}
        >
        <Mapbox.SymbolLayer
            id="stopsLayer"
            style={{
              iconImage: [
                "case",
                ["has", "point_count"], 
                "cluster-marker",
                ["case", ["get", "isSelected"], "selected-marker", "default-marker"] 
              ],
              iconSize: 0.8,
            }}
            />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.centerButton, { bottom: tabBarHeight + insets.bottom + 8 }]}
      onPress={animateToCenterAndroid}
    >
      <Text>📍</Text>
    </TouchableOpacity>
            </View>

      
    { modalVisible && (
                  <BottomSheet
                  ref={sheetRef}
                  index={1}
                  snapPoints={snapPoints}
                  enableDynamicSizing={false}
                  backgroundStyle={{ backgroundColor: "#121212" }}
                  handleIndicatorStyle={{backgroundColor: "white"}}
                  enablePanDownToClose={true}
                  onClose={() => {
                    setModalVisible(false)
                    setSelectedPoint(null);
                    setData(null);
                    setActiveCard(null);
                    setStationError(null);
                  }}
                >
                  <BottomSheetScrollView style={{backgroundColor: "#121212", marginBottom: 80}}  contentContainerStyle={styles.bottomContainer} >
                    {stationError ? (
                      <View style={{padding: 32, alignItems: 'center', justifyContent: 'center', gap: 16}}>
                        <FontAwesome name="exclamation-circle" size={40} color="#888" style={{marginBottom: 12}} />
                        <Text style={{color: '#DEDEDE', fontSize: 16, textAlign: 'center', fontWeight: '500', marginBottom: 0}}>{stationError}</Text>
                      </View>
                    ) : data != null ? (
                  <View>
                  <View style={{paddingHorizontal: 40, marginTop: 10}}>
                            <View style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: "space-between"
                            }}>
                              <View style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                              }}>
                                <Text style={{color: 'white', fontSize: 18, fontWeight: '700'}}>{data.name}</Text>
                                <Text style={{color: '#DEDEDE',  fontWeight: '400'}}>{data.address}</Text>
                              </View>
                              <View>
                              <Image source={require('@/assets/images/station.png')} style={{width: 40, height: 40}} resizeMode="contain" />
                              </View>
                              </View>
                              <View style={{height: 1, width: '100%', backgroundColor: 'white', marginTop: 10 }}></View>
                            </View>
                            <View style={{paddingHorizontal: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, marginTop: 20}}>
                            {Object.keys(data.lines).map(lineName => (
                            <View key={lineName} style={{backgroundColor: 'black', borderRadius: 8, padding: 10, marginBottom: 10}}>
                              
                              <Pressable onPress={() => HandleChangeActiveCard(lineName)}>
                                <View style={{height: 30, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <View style={{height: "100%", backgroundColor: data.lines[lineName].length == 0 ? '#666' : 'rgb(6, 87, 255)', width: '50%', alignItems: 'center', justifyContent: 'center', borderRadius: 5}}>
                                    <Text style={{color: 'white', fontSize: 18, fontWeight: '700'}}>{lineName}</Text>
                                  </View>
                                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                    <Text style={{color: 'white', fontWeight: '600', fontSize: 14}}>
                                      {data.lines[lineName][0]?.time === undefined
                                        ? '-'
                                        : data.lines[lineName][0]?.time === 'm'
                                          ? '17+'
                                          : data.lines[lineName][0]?.time}
                                      minutes
                                    </Text>
                                    <Image 
                                      source={require('@/assets/images/arrow.png')} 
                                      style={{width: 14, height: 14}} 
                                      resizeMode="contain"
                                    />
                                  </View>
                                </View>
                              </Pressable>
          
                              <Collapsible collapsed={activeCard == null ? true : activeCard != lineName} style={{backgroundColor: 'black', padding: 10}}>
                                <View style={{marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5}}>
                                {data.lines[lineName].slice(0, 4).map((tram: any, index: number) => (
                                  <View key={tram.plate} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5,
                                    padding: 8,
                                    backgroundColor: 'black', 
                                    borderRadius: 8,
                                    shadowColor: 'white', 
                                    shadowOffset: { width: 0, height: 0 }, 
                                    shadowOpacity: 0.2, 
                                    shadowRadius: 5, 
                                    elevation: 5, 
                                  }}>
                                    <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Text style={{color: 'white', fontSize: 14, fontWeight: '700'}}>
                                      {tram.time === undefined || tram.time === null
                                        ? '-'
                                        : tram.time?.toString() === 'm'
                                          ? '17+ minutes'
                                          : tram.time == 0
                                            ? 'Now'
                                            : tram.time == 1
                                              ? '1 minute'
                                              : `${tram.time} minutes`}
                                    </Text>
                                    <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                      {selectedPrimaryDetail == 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined && (
                                        <>
                                        <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                        <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400' }}>
                                          {tram.on_board}
                                        </Text>
                                        </>
                                      ) }
                                      {selectedPrimaryDetail == 'ac' && (
                                      <>
                                        <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "blue" : "red"} />
                                        <Text style={{ fontSize: 14, color: '#fff' }}>
                                          {tram.ac ? `AC` : 'No AC'}
                                        </Text>
                                      </>
                                      )}
                                    </View>
                                 
                                       <Image 
                                  source={{ uri: tram.image }} 
                                  resizeMode="contain" 
                                  style={{ width: 150, height: 50 }} 
                                />        
                                  </View>
                                  {displayAdditionalInfo && (
                                  <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' }}>
                                    
                                  {selectedPrimaryDetail != 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined  && (
                                    <View style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                                      <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                      <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400' }}>{tram.on_board}</Text>
                                    </View>
                                      )}
                                      {selectedPrimaryDetail != 'ac' && (
                                          <View style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                                          <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "blue" : "red"} />
                                            <Text style={{ fontSize: 14, color: '#fff' }}>{tram.ac ? `AC` : 'No AC'}</Text>
                                        </View>
                                      )}
                                     <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400'}}>{tram.plate}</Text> 
                                     {tram.id !== null && tram.id !== 0 && (
                                      <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400'}}>{tram.id}</Text> 
                                     )}
                                  </View>
                                  )}
          
                                  </View>
                                ))}
                                {data.lines[lineName].length == 0 && (
                                  <View style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                                    <Text style={{fontSize: 12, color: '#DEDEDE'}}>There are currently no vehicles on this route</Text>
                                    <Text style={{fontSize: 9, color: '#DEDEDE'}}>However, some may be operating in the opposite direction</Text>
                                  </View>
                                )}
                                </View>
                              </Collapsible>
          
                            </View>
                          ))}
                             </View>
                              </View>
                  ):(
                    <View style={{display: 'flex'}}>
                    <View style={{paddingHorizontal: 40, marginTop: 10}}>
                    <View style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: "space-between"
                    }}>
                      <View style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}>
                        <Text style={{color: 'white', fontSize: 18, fontWeight: '700'}}>Loading Data</Text>
                        <Text style={{color: '#DEDEDE',  fontWeight: '400'}}>Please wait.</Text>
                      </View>
                      <View>
                      <LottieView
                        source={require("@/assets/loader.json")} 
                        autoPlay
                        loop
                        style={{ width: 50, height: 50 }}
                      />
                          </View>
                      </View>
                      <View style={{height: 1, width: '100%', backgroundColor: 'white', marginTop: 10 }}></View>
                    </View>

                      <View style={{display: 'flex', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center'} }>
                      <ActivityIndicator size="large" color="rgb(6, 87, 255)" />

                      </View>

                    </View>
                  )}


                  </BottomSheetScrollView>
                </BottomSheet>

        )}
    </SafeAreaView>
  )}

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
    height: 180,
    backgroundColor: 'black',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, 
  },
  map: {
    flex: 1,
  },
  logo: {
    width: 520,
    height: 130,
    marginBottom: 10,
  },
  centerButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#121212',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
      ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 5, 
      },
    }),
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
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 10, color: 'white' },
  listContainer: { paddingHorizontal: '5%', paddingBottom: 20 },
  lineContainer: { backgroundColor: '#121212', borderRadius: 12, padding: 15, marginBottom: 15, alignItems: 'center', elevation: 5 },
  lineBadge: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20, minWidth: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 5 },
  lineText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  tramContainer: { backgroundColor: 'black', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 10, width: '100%', elevation: 5 },
  tramTime: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: 'white', marginBottom: 5 },
  tramImage: { width: 170, height: 110 },
  tramType: { fontSize: 14, color: '#666' },
  tramInfo: { flexDirection: 'row', gap: 10 },
  tramDetail: { fontSize: 14, color: '#666' },
  tramExtraInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  acContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: { color: 'white', fontWeight: 'bold' },
  calloutContainer: { padding: 10 },
  calloutTitle: { fontWeight: 'bold' },
  bottomContainer: { backgroundColor: "#121212"},
  
  headerModern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'black',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  logoModern: {
    width: 320,
    height: 100,
    marginBottom: 0,
  },
  centerButtonModern: {
    position: 'absolute',
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  centerButtonTextModern: {
    fontSize: 24,
    color: '#0657FF',
  },
  clusterMarkerModern: {
    padding: 8,
    backgroundColor: '#0657FF',
    borderRadius: 100,
    width: 40,
    height: 40,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },
  clusterTextModern: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomContainerModern: {
    backgroundColor: 'transparent',
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  stationHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 10,
    marginBottom: 0,
  },
  stationHeaderLeftModern: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  stationNameModern: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  stationAddressModern: {
    color: '#DEDEDE',
    fontWeight: '400',
    fontSize: 14,
  },
  stationDividerModern: {
    height: 1,
    width: '100%',
    backgroundColor: '#222',
    marginTop: 10,
    marginBottom: 0,
  },
  linesListModern: {
    paddingHorizontal: 16,
    paddingTop: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  lineCardModern: {
    backgroundColor: '#181A20',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 4,
  },
  lineCardHeaderModern: {
    height: 36,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  lineBadgeModern: {
    height: 36,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 18,
    marginRight: 8,
  },
  lineBadgeTextModern: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  lineTimesModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lineTimesTextModern: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 4,
  },
  tramListModern: {
    backgroundColor: '#181A20',
    padding: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  tramCardModern: {
    flexDirection: 'column',
    gap: 5,
    padding: 10,
    backgroundColor: '#23242A',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 8,
  },
  tramCardHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  tramTimeModern: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 60,
  },
  tramDetailsModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  tramDetailTextModern: {
    color: '#DEDEDE',
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 2,
  },
  tramImageModern: {
    width: 110,
    height: 36,
    borderRadius: 6,
    marginLeft: 8,
  },
  tramExtraModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  tramExtraDetailModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  noVehiclesModern: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  noVehiclesTextModern: {
    fontSize: 13,
    color: '#DEDEDE',
    fontWeight: '500',
  },
  noVehiclesSubTextModern: {
    fontSize: 10,
    color: '#DEDEDE',
    fontWeight: '400',
  },
  loadingModern: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingSpinnerModern: {
    display: 'flex',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  tramDetailsModernCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: 8,
    flex: 1,
  },
  tramExtraModernCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 8,
    width: '100%',
  },
});