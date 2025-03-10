import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SafeAreaView, StyleSheet, Image, View, StatusBar, Text, Platform, Pressable, LayoutAnimation, ActivityIndicator } from 'react-native';
import { Marker, Region } from 'react-native-maps';
import { default as ClusteredMapView } from "react-native-map-clustering";
import Svg, { Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import axios from 'axios';
import stops from '@/assets/data/stops.json';
import { FontAwesome } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Collapsible from 'react-native-collapsible';
import { useStore } from '../store/useStore';
import * as Haptics from 'expo-haptics';
import LottieView from "lottie-react-native";

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
  const [selectedPoint, setSelectedPoint] = useState<Number | null>(null);
  const [data, setData] = useState<any | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["20%", "70%"], []);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const {displayAdditionalInfo, selectedPrimaryDetail} = useStore();




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
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    async function getCurrentLocation() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          return;
        }
  
        let lastKnownLocation = await Location.getLastKnownPositionAsync();
        if (lastKnownLocation) {
          setLocation(lastKnownLocation);
          setRegion({
            latitude: lastKnownLocation.coords.latitude,
            longitude: lastKnownLocation.coords.longitude,
            latitudeDelta: 0.05, 
            longitudeDelta: 0.05,
          });
        }
  
        let preciseLocation = await Location.getCurrentPositionAsync({
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
      } catch (error: any) {
        console.log('Error fetching data:', error);
      
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
    } else {
      setModalVisible(false)
      setSelectedPoint(null);
      setData(null);
      setActiveCard(null);
    }
  };

  if(Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <View style={styles.header}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
  
        <ClusteredMapView
          style={styles.map}
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
                <View style={{ padding: 8, backgroundColor: "rgb(6, 87, 255)", borderRadius: 100, width: 37, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{color: 'white', fontSize: 14, fontWeight: '700'}}>{points > 9 ? '9+' : points}</Text>
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
                console.log('Checking for ' + stop.stop_id)
              }} 
            >
            <Svg width={24} height={24} viewBox="0 0 24 24"> 
              <Circle fill="rgb(6, 87, 255)" cx="12" cy="12" r="11" />
              <Circle cx="12" cy="12" r="7" fill={selectedPoint == stop.stop_id ? 'rgb(6, 87, 255)' : 'white'} />
            </Svg>
            </Marker>
          ))}
        </ClusteredMapView>

        { modalVisible && (
                  <BottomSheet
                  ref={sheetRef}
                  index={1}
                  snapPoints={snapPoints}
                  enableDynamicSizing={false}
                  backgroundStyle={{ backgroundColor: "#121212" }}
                  handleIndicatorStyle={{backgroundColor: "white"}}
                  detached={true}
                  enablePanDownToClose={true}
                  onClose={() => {
                    setModalVisible(false)
                    setSelectedPoint(null);
                    setData(null);
                    setActiveCard(null);
                  }}
                >
                  <BottomSheetScrollView style={{backgroundColor: "#121212", marginBottom: 80}}  contentContainerStyle={styles.bottomContainer} >
                  {data != null ? (
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
                                      {data.lines[lineName][0]?.time == undefined ? '-' :  data.lines[lineName][0]?.time == 'm' ? '17+' :
                                      data.lines[lineName][1]?.time == undefined ? data.lines[lineName][0].time :
                                      data.lines[lineName][2]?.time == undefined ? `${data.lines[lineName][0].time}, ${data.lines[lineName][1].time == 'm' ? '17+' : data.lines[lineName][1].time}` :
                                      `${data.lines[lineName][0].time }, ${data.lines[lineName][1].time == 'm' ? '17+' :data.lines[lineName][1].time  }, ${data.lines[lineName][2].time == 'm' ? '17+' : data.lines[lineName][2].time}`
                                      } minutes
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
                                      {tram.time?.toString() === 'm' ? '17+ minutes' : tram.time == 0 ? 'Now' : tram.time == 1 ? '1 minute' : tram.time == undefined ? data.lines[lineName][index-1]?.time == 'm' ? '17+ minutes' : `${data.lines[lineName][index-1]?.time}+ minutes`  : `${tram.time?.toString()} minutes` || "17+ minutes"}
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
                                  <View style={{paddingHorizontal: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row'}}>
                                    
                                  {selectedPrimaryDetail != 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined  && (
                                    <View style={{display: 'flex', flexDirection: 'row', gap: 2}}>
                                      <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                      <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400' }}>
                                        {tram.on_board}
                                      </Text>
                                    </View>
                                      )}
                                      {selectedPrimaryDetail != 'ac' && (
                                          <View style={{display: 'flex', flexDirection: 'row', gap: 2}}>
                                          <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "blue" : "red"} />
                                            <Text style={{ fontSize: 14, color: '#fff' }}>
                                              {tram.ac ? `AC` : 'No AC'}
                                            </Text>
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
    );
  } else {
    const filteredStops = useMemo(() => 
      stops.filter(stop => (stop.location_type == 0 || stop.location_type == 1) && stop.parent_station == ""), 
      [stops]
    );
  
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
  
      <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
      <Mapbox.UserLocation />

      <Mapbox.Camera
        zoomLevel={16}
        centerCoordinate={region ? [region.longitude, region.latitude] : [ 26.102377, 44.426858]}
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
                  }}
                >
                  <BottomSheetScrollView style={{backgroundColor: "#121212", marginBottom: 80}}  contentContainerStyle={styles.bottomContainer} >
                    {data != null ? (
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
                                      {data.lines[lineName][0]?.time == undefined ? '-' :  data.lines[lineName][0]?.time == 'm' ? '17+' :
                                      data.lines[lineName][1]?.time == undefined ? data.lines[lineName][0].time :
                                      data.lines[lineName][2]?.time == undefined ? `${data.lines[lineName][0].time}, ${data.lines[lineName][1].time == 'm' ? '17+' : data.lines[lineName][1].time}` :
                                      `${data.lines[lineName][0].time }, ${data.lines[lineName][1].time == 'm' ? '17+' :data.lines[lineName][1].time  }, ${data.lines[lineName][2].time == 'm' ? '17+' : data.lines[lineName][2].time}`
                                      } minutes
                                    </Text>
                                    <Image 
                                      source={require('@/assets/images/arrow.png')} 
                                      style={{width: 14, height: 14}} 
                                      resizeMode="contain"
                                    />
                                  </View>
                                </View>
                              </Pressable>
          
                              <Collapsible collapsed={activeCard == null ? true : activeCard != lineName} >
                                <View style={{marginTop: 10, display: 'flex', flexDirection: 'column'}}>
                                {data.lines[lineName].slice(0, 4).map((tram: any, index: number) => (
                                      <View key={tram.plate} style={{
                                        flexDirection: 'column',
                                        padding: 8,
                                        backgroundColor: 'black',
                                        borderRadius: 8,
                                        elevation: 5,
                                      }}>
                                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                          <Text style={{color: 'white', fontSize: 14, fontWeight: '700'}}>
                                            {tram.time?.toString() === 'm' ? '17+ minutes' : tram.time == 0 ? 'Now' : tram.time == 1 ? '1 minute' : tram.time == undefined ? data.lines[lineName][index-1]?.time == 'm' ? '17+ minutes' : `${data.lines[lineName][index-1]?.time}+ minutes`  : `${tram.time?.toString()} minutes` || "17+ minutes"}
                                          </Text>
                                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            {selectedPrimaryDetail == 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined && (
                                              <>
                                                <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                                <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400', marginLeft: 4 }}>
                                                  {tram.on_board}
                                                </Text>
                                              </>
                                            )}
                                            {selectedPrimaryDetail == 'ac' && (
                                              <>
                                                <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "blue" : "red"} />
                                                <Text style={{ fontSize: 14, color: '#fff', marginLeft: 4 }}>
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
                                          <View style={{paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                            {selectedPrimaryDetail != 'psg' && tram.on_board !== null && tram.on_board !== '' && tram.on_board !== undefined && (
                                              <View style={{flexDirection: 'row'}}>
                                                <FontAwesome6 name="person" size={14} color="#DEDEDE" />
                                                <Text style={{ color: '#DEDEDE', fontSize: 14, fontWeight: '400', marginLeft: 2 }}>
                                                  {tram.on_board}
                                                </Text>
                                              </View>
                                            )}
                                            {selectedPrimaryDetail != 'ac' && (
                                              <View style={{flexDirection: 'row'}}>
                                                <FontAwesome name="snowflake-o" size={14} color={tram.ac ? "blue" : "red"} />
                                                <Text style={{ fontSize: 14, color: '#fff', marginLeft: 2 }}>
                                                  {tram.ac ? `AC` : 'No AC'}
                                                </Text>
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
                                      <View style={{justifyContent: 'center', alignItems: 'center'}}>
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
                    ): 
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
                    }


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
    width: 420,
    height: 90,
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
  bottomContainer: { backgroundColor: "#121212"}
});