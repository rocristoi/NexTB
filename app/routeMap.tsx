import { View, Text, ActivityIndicator, useWindowDimensions, Platform, Pressable, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import MapView, {  Marker, Polyline } from 'react-native-maps';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import RenderHTML from 'react-native-render-html';
import { Image } from 'expo-image';
import { Modal } from 'react-native';
import { Image as RNImage } from 'react-native';

interface RouteData {
  tour: {
    shape: any[];
    vehicles: any[];
  };
  retour: {
    shape: any[];
    vehicles: any[];
  };
}

let Mapbox: any;

if (!(Platform.OS === 'ios')) {
  Mapbox = require('@rnmapbox/maps'); 
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);
}


type LatLng = { latitude: number; longitude: number };

const getVehicleIcon = (vehicleType: string) => {
  const type = vehicleType?.toLowerCase() || '';
  
  if (type.includes('trollino') || type.includes('trolley')) {
    return 'directions-bus';
  } else if (type.includes('tram') || type.includes('streetcar')) {
    return 'tram';
  } else if (type.includes('bus')) {
    return 'directions-bus';
  } else if (type.includes('train') || type.includes('metro')) {
    return 'train';
  } else {
    return 'directions-bus';
  }
};

export default function MapScreen() {
  const TOGGLE_CONTAINER_WIDTH = 320;
  const TOGGLE_SLIDER_WIDTH = 156;
  const TOGGLE_PADDING = 4;
  const TOGGLE_LEFT = TOGGLE_PADDING;
  const TOGGLE_RIGHT = TOGGLE_CONTAINER_WIDTH - TOGGLE_SLIDER_WIDTH - TOGGLE_PADDING;
  const { routeId, routeName, type: lineTypeParam } = useLocalSearchParams();
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [coordinates, setCoordinates] = useState<LatLng[]>([]);
  const [animatedCoordinates, setAnimatedCoordinates] = useState([]);
  const sheetRef = useRef<BottomSheet>(null);
  const [refresh, setRefresh] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const { width } = useWindowDimensions();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selected, setSelected] = useState("Tour"); 
  const translateX = useSharedValue(0); 
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const markerScale = useRef(new Map()).current;
  const mapRef = useRef(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const handleMarkerPress = (veh: any) => {
    if (veh.img) {
      setModalLoading(true);
      RNImage.prefetch(veh.img)
        .then(() => {
          setSelectedVehicle(veh);
          setModalLoading(false);
        })
        .catch(() => {
          setSelectedVehicle(veh);
          setModalLoading(false);
        });
    } else {
      setSelectedVehicle(veh);
    }
  };
  
  useEffect(() => {
    if (!routeId) {
      console.warn("❌ routeId is missing, skipping API request.");
      return;
    }

    const getRouteData = async () => {
      try {

        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}api/routeShape?shapeId=${routeId}&name=${routeName}`,
          {
            headers: {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY,
            },
          }
        );


        if (!response.data || !response.data.tour || !response.data.tour.shape) {
          console.error("❌ Invalid API response structure:", response.data);
          return;
        }
        setRouteData(response.data);
        
        const intermediary = response.data.tour.shape.map((shapePt: any) => ({
          latitude: shapePt[0],
          longitude: shapePt[1],
        }));

        setCoordinates(intermediary);
        animatePolyline(intermediary);
        setRefresh(prev => !prev); 

        const alertResponse = await axios.get(
          process.env.EXPO_PUBLIC_ALERTS_API_URL || '',
          {
            headers: {
              "x-api-key": process.env.EXPO_PUBLIC_API_KEY,
            },
          }
        );


        if (!alertResponse.data) {
          console.error("❌ Invalid API response structure:", response.data);
          return;
        }
        setAlertData(alertResponse.data.notifications.filter(
          (alert: any) =>
            Array.isArray(alert.lines) &&
            alert.lines.some((line: any) => line.name === routeName) &&
            Math.abs(Date.now() - alert.created_at) < 432000000
        ));

      } catch (err) {
        console.error("❌ Error fetching route data:", err);
      }
    };

    getRouteData();
  }, [routeId]);


    useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      
      const fetchVehData = async () => {
        try {
  
          const response = await axios.get(
            `${process.env.EXPO_PUBLIC_API_URL}api/routeShape?shapeId=${routeId}&name=${routeName}`,
            {
              headers: {
                "x-api-key": process.env.EXPO_PUBLIC_API_KEY,
              },
            }
          );
  
  
          if (!response.data || !response.data.tour || !response.data.tour.shape) {
            console.error("❌ Invalid API response structure:", response.data);
            return;
          }
  
          setRouteData(response.data);
          
        } catch (error) {
          console.error(error);
        }
      }

      if (routeData) {
        interval = setInterval(() => {
          fetchVehData();
        }, 10000);
      } else {
        if (interval) clearInterval(interval);
      }
  
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [routeData]); 


  const animatePolyline = (points: any) => {
    let index = 0;
    const startValue = selected;
    setAnimatedCoordinates([]);
  
    if (intervalRef.current) clearInterval(intervalRef.current);
  
    intervalRef.current = setInterval(() => {
      if (selected !== startValue) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        return;
      }
  
      if (index < points.length - 1) {
        setAnimatedCoordinates(((prev: any) => [...prev, points[index]]) as any);
        index++;
      } else {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
  
        setTimeout(() => {
          if (selected === startValue) animatePolyline(points);
        }, 1000);
      }
    }, 20);
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);



  const toggleSwitch = () => {
    if(selected === "Tour") {
      const intermediary = (routeData as any).retour.shape.map((shapePt: any) => ({
        latitude: shapePt[0],
        longitude: shapePt[1],
      }));
      setCoordinates(intermediary);
      animatePolyline(intermediary);
      setRefresh(prev => !prev); 
    } else {
      const intermediary = (routeData as any)?.tour.shape.map((shapePt: any) => ({
        latitude: shapePt[0],
        longitude: shapePt[1],
      }));
      setCoordinates(intermediary);
      animatePolyline(intermediary);
      setRefresh(prev => !prev); 
    }
    setSelected(selected === "Tour" ? "Retour" : "Tour");
    translateX.value = withTiming(selected === "Tour" ? TOGGLE_RIGHT : TOGGLE_LEFT, { duration: 200 });
  };



  const memoizedAlertContent = useMemo(() => {
    return alertData &&
      Array.isArray(alertData) &&
      (alertData as any).map((notif: any) => (
        <View
          key={notif.id}
          style={{
            backgroundColor: '#1E1E1E',
            borderRadius: 14,
            width: '100%',
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>
            {notif.title}
          </Text>
  
          {notif.lines?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {notif.lines.map((line: any) => (
                <View
                  key={line.name}
                  style={{
                    padding: 8,
                    width: 50,
                    borderRadius: 100,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: line.color,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>
                    {line.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
  
          <View style={{ marginTop: 14 }}>
            <RenderHTML
              contentWidth={width}
              source={{ html: notif.message ?? "" }}
              baseStyle={{ color: 'white', fontSize: 16, lineHeight: 22 }}
            />
          </View>
  
          <Text style={{ color: 'gray', marginTop: 16, fontSize: 14 }}>
            {new Date(notif.created_at).toLocaleString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      ));
  }, [alertData, width]);


  const memoizedCoordinates = useMemo(() => {
    return coordinates.map(({ latitude, longitude }) => [longitude, latitude]);
  }, [coordinates]);
  
  useEffect(() => {
    if (routeData && (routeData as any)[selected.toLowerCase()]?.vehicles) {
      (routeData as any)[selected.toLowerCase()].vehicles.forEach((veh: any) => {
        if (!markerScale.has(veh.vehicle.id)) {
          const anim = new RNAnimated.Value(0);
          markerScale.set(veh.vehicle.id, anim);
          RNAnimated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
        }
      });
    }
  }, [routeData, selected]);

  useEffect(() => {
    if (mapRef.current && coordinates.length > 1 && Platform.OS === 'ios') {
      // @ts-ignore
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [coordinates]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <View style={{width: '100%', height: 72, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4}}>
          <View
            style={{
              width: TOGGLE_CONTAINER_WIDTH,
              height: 48,
              flexDirection: "row",
              alignItems: "center",
              padding: TOGGLE_PADDING / 2,
              marginVertical: 4,
              position: 'relative',
              opacity: routeData ? 1 : 0.5,
            }}
          >
            <Animated.View
              style={[
                {
                  width: TOGGLE_SLIDER_WIDTH,
                  height: 40,
                  borderRadius: 12,
                  position: "absolute",
                  backgroundColor: selected === "Tour" ? "#fff" : "#FF4C4C",
                  left: undefined,
                  top: 4,
                },
                animatedStyle,
              ]}
            />
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <Pressable
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                onPress={() => selected !== "Tour" && routeData && toggleSwitch()}
                disabled={!routeData}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: selected === "Tour" ? "#fff" : 'transparent',
                  elevation: selected === "Tour" ? 2 : 0,
                  transform: [{ scale: selected === "Tour" ? 1.05 : 1 }],
                  opacity: routeData ? 1 : 0.6,
                }}>
                  <MaterialIcons name="arrow-forward" size={18} color={selected === "Tour" ? "#222" : "#fff"} />
                  <Text style={{
                    color: selected === "Tour" ? "#222" : "#fff",
                    fontWeight: "600",
                    fontSize: 15,
                    marginLeft: 6,
                  }}>Tour</Text>
                </View>
              </Pressable>
              <View style={{ width: 8 }} />
              <Pressable
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                onPress={() => selected !== "Retour" && routeData && toggleSwitch()}
                disabled={!routeData}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: selected === "Retour" ? "#FF4C4C" : 'transparent',
                  elevation: selected === "Retour" ? 2 : 0,
                  transform: [{ scale: selected === "Retour" ? 1.05 : 1 }],
                  opacity: routeData ? 1 : 0.6,
                }}>
                  <MaterialIcons name="arrow-back" size={18} color={selected === "Retour" ? "#fff" : "#fff"} />
                  <Text style={{
                    color: selected === "Retour" ? "#fff" : "#fff",
                    fontWeight: "600",
                    fontSize: 15,
                    marginLeft: 6,
                  }}>Retour</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
        {Platform.OS === "ios" ? (
            <MapView
            ref={mapRef}
            key={refresh as any} 
            style={{ flex: 1 }}
            showsUserLocation={true}
            initialRegion={{
              latitude: 44.4268,
              longitude: 26.1025,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            >
            {coordinates.length > 0 ? (
              <>
              <Polyline
                coordinates={coordinates}
                strokeWidth={6} 
                strokeColor="white"
                lineCap="butt" 
                lineJoin="miter" 
              />
              <Polyline
              coordinates={animatedCoordinates}
              strokeWidth={6}
              strokeColor="red"
              lineCap="butt"
              lineJoin="miter"
            />
            </>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%' }}>
                <ActivityIndicator size="large" color="red" />
              </View>
            )}

            {coordinates.length > 0 && routeData && (routeData as any)[selected.toLowerCase()]?.vehicles?.length > 0 && (routeData as any)[selected.toLowerCase()].vehicles.map((veh: any) => {
              return (
                <Marker
                  key={veh.vehicle.vehicle.id}
                  coordinate={{
                    longitude: veh.vehicle.position.longitude,
                    latitude: veh.vehicle.position.latitude,
                  }}
                  tracksViewChanges={false}
                  onPress={() => handleMarkerPress(veh)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#FF4C4C",
                      borderRadius: 16,
                      shadowColor: '#000',
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 5,
                      zIndex: 1000,
                    }}
                  >
                    {modalLoading && (
                      <ActivityIndicator size="small" color="#fff" />
                    )}
                    {!modalLoading && (
                      <MaterialIcons
                        name={getVehicleIcon(lineTypeParam || veh.type)}
                        size={20}
                        color="white"
                      />
                    )}
                  </View>
                </Marker>
              );
            })}
            </MapView>
        ) : (
          <View style={{ flex: 1 }}>
          <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
            <Mapbox.Camera
              bounds={coordinates.length > 1 ? {
                ne: [
                  Math.max(...coordinates.map((c: LatLng) => c.longitude)),
                  Math.max(...coordinates.map((c: LatLng) => c.latitude)),
                ],
                sw: [
                  Math.min(...coordinates.map((c: LatLng) => c.longitude)),
                  Math.min(...coordinates.map((c: LatLng) => c.latitude)),
                ],
                padding: 80,
                animationDuration: 1000,
              } : undefined}
              defaultSettings={{
                centerCoordinate: [26.1025, 44.4268],
                zoomLevel: 12,
              }}
            />
    
            {coordinates.length > 0 ? (
              <>
                <Mapbox.ShapeSource
                  id="routeLine"
                  shape={{
                    type: "Feature",
                    geometry: { type: "LineString", coordinates: memoizedCoordinates },
                  }}
                >
                  <Mapbox.LineLayer id="routeLayer" style={{ lineColor: "white", lineWidth: 6 }} />
                </Mapbox.ShapeSource>
    
                {routeData && (routeData as any)[selected.toLowerCase()]?.vehicles?.length > 0 && (routeData as any)[selected.toLowerCase()].vehicles.map((veh: any) => {
                  const { vehicle } = veh;
                  if (!vehicle?.position) return null;
                  return (
                    <Mapbox.MarkerView
                      key={`veh-${vehicle.vehicle.licensePlate || vehicle.vehicle.id}`}
                      id={`vehicle-${vehicle.vehicle.licensePlate || vehicle.vehicle.id}`}
                      coordinate={[vehicle.position.longitude, vehicle.position.latitude]}
                      onSelected={() => handleMarkerPress(veh)}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "#FF4C4C",
                          borderRadius: 16,
                          shadowColor: '#000',
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 5,
                        }}
                      >
                          {modalLoading && (
                            <ActivityIndicator size="small" color="#fff" />
                          )}
                          {!modalLoading && (
                            <MaterialIcons 
                              name={getVehicleIcon(veh.type)} 
                              size={20} 
                              color="white" 
                            />
                          )}
                      </View>
                    </Mapbox.MarkerView>
                  );
                })}
              </>
            ) : (
              <ActivityIndicator
                size="large"
                color="red"
                style={{
                  position: "absolute",
                  alignSelf: "center",
                  top: "50%",
                }}
              />
            )}
          </Mapbox.MapView>
        </View>
        )}
       
        {alertData && Array.isArray(alertData) && (
            <BottomSheet
              ref={sheetRef}
              index={1}
              snapPoints={['10%', '30%', '60%']}
              enableDynamicSizing={false}
              backgroundStyle={{ backgroundColor: "#121212", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
              handleIndicatorStyle={{ backgroundColor: "#fff", width: 60, height: 6, borderRadius: 3, marginVertical: 8 }}
            >
              {(alertData as any).length == 0 ? (
                <BottomSheetView>
                  <View style={{ paddingHorizontal: 30, marginTop: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome6 name="circle-check" size={48} color="white" style={{ marginBottom: 12 }} />
                    <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
                      No events on route {routeName}
                    </Text>
                    <Text style={{ color: "#DEDEDE", fontWeight: "400", fontSize: 18, marginBottom: 16 }}>
                      There aren't any events on this route
                    </Text>
                    <View style={{ height: 1, width: "100%", backgroundColor: "white", marginTop: 10 }} />
                  </View>
                </BottomSheetView>
              ) : (
                <BottomSheetScrollView
                  style={{ backgroundColor: "rgba(18,18,18,0.85)", marginBottom: 30 }}
                  contentContainerStyle={{ backgroundColor: "rgba(18,18,18,0.85)" }}
                >
                  <View>
                    <View style={{ paddingHorizontal: 30, marginTop: 10, alignItems: 'center' }}>
                      <MaterialIcons name="warning-amber" size={48} color="white" style={{ marginBottom: 8 }} />
                      <Text style={{ color: "white", fontSize: 20, fontWeight: "700", marginBottom: 4 }}>
                        {`${(alertData as any).length} event${(alertData as any).length > 1 ? 's' : ''} on route ${routeName}`}
                      </Text>
                      <Text style={{ color: "#DEDEDE", fontWeight: "400", fontSize: 16, marginBottom: 12 }}>
                        { `There are ${(alertData as any).length <= 2 ? `minor disruptions` : (alertData as any).length <= 5 ? 'some disruptions' : `serious disruptions`} on this route.`}
                      </Text>
                      <View style={{ height: 1, width: "100%", backgroundColor: "white", marginTop: 10 }} />
                    </View>
                    <View style={{ paddingHorizontal: 20, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, marginTop: 20 }}>
                      {memoizedAlertContent}
                    </View>
                  </View>
                </BottomSheetScrollView>
              )}
            </BottomSheet>
          )}
      </View>
      {selectedVehicle && (
        <Modal
          visible={!!selectedVehicle}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedVehicle(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              backgroundColor: '#23272F',
              borderRadius: 24,
              padding: 0,
              minWidth: 320,
              maxWidth: 380,
              width: '90%',
              alignItems: 'stretch',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 16,
              overflow: 'hidden',
            }}>
              {/* Header Bar */}
              <View style={{
                backgroundColor: '#FF4C4C',
                paddingVertical: 18,
                paddingHorizontal: 28,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons name={getVehicleIcon(selectedVehicle.type)} size={22} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>
                  {selectedVehicle.type ? selectedVehicle.type.charAt(0).toUpperCase() + selectedVehicle.type.slice(1) : 'Vehicle'}
                </Text>
              </View>
              {/* Image */}
              {selectedVehicle.img && (
                <View style={{ marginTop: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: selectedVehicle.img }}
                    style={{ width: 170, height: 68, resizeMode: 'contain', borderRadius: 10 }}
                  />
                </View>
              )}
              {/* Info Section */}
              <View style={{ width: '100%', paddingHorizontal: 28, paddingTop: selectedVehicle.img ? 18 : 28, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: '#aaa', fontSize: 15 }}>Vehicle ID</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 20 }}>
                    {selectedVehicle.vehicle?.vehicle?.id || 'N/A'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ color: '#aaa', fontSize: 15 }}>Passengers</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 20 }}>
                    {selectedVehicle.on_board ?? 'N/A'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#aaa', fontSize: 15 }}>License Plate</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 20 }}>
                    {selectedVehicle.vehicle?.vehicle?.licensePlate || 'N/A'}
                  </Text>
                </View>
              </View>
              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#363A45', marginHorizontal: 18, marginVertical: 6, borderRadius: 1 }} />
              {/* Close Button */}
              <View style={{ alignItems: 'center', paddingVertical: 18, paddingHorizontal: 28 }}>
                <Pressable
                  onPress={() => setSelectedVehicle(null)}
                  style={{
                    backgroundColor: '#fff',
                    paddingHorizontal: 36,
                    paddingVertical: 12,
                    borderRadius: 16,
                    minWidth: 120,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.10,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text style={{ color: '#FF4C4C', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.2 }}>Close</Text>
                </Pressable>
              </View>
              {/* Info warnings below the Close button */}
              <View style={{ width: '100%' }}>
                {(() => {
                  const genericTypes = [
                    'tram', 'bus', 'train', 'directions-bus', 'streetcar', 'trolley', 'trollino', ''
                  ];
                  const type = (selectedVehicle?.type || '').toLowerCase();
                  const showGenericTypeWarning = genericTypes.includes(type);
                  const showPassengerWarning = (selectedVehicle.on_board === undefined || selectedVehicle.on_board === null || selectedVehicle.on_board === 'N/A');
                  return (
                    <>
                      {showGenericTypeWarning && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 0, paddingHorizontal: 28, paddingBottom: showPassengerWarning ? 6 : 22, width: '100%', justifyContent: 'center' }}>
                          <MaterialIcons name="info-outline" size={17} color="#aaa" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#aaa', fontSize: 13, flex: 1, lineHeight: 18 }}>
                            The TPBI API returned 0 as the vehicle ID for this vehicle. We cannot get more vehicle data but it's probably an old vehicle with a broken transponder.
                          </Text>
                        </View>
                      )}
                      {showPassengerWarning && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: showGenericTypeWarning ? 0 : 10, paddingHorizontal: 28, paddingBottom: 22, width: '100%', justifyContent: 'center' }}>
                          <MaterialIcons name="info-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#aaa', fontSize: 13, flex: 1, lineHeight: 18 }}>
                            This vehicle is not equipped with a passenger counting system or the system is broken.
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}