import { View, Text, ActivityIndicator, TouchableWithoutFeedback, useWindowDimensions, Platform } from 'react-native';
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


export default function MapScreen() {
  const { routeId, routeName } = useLocalSearchParams();
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [coordinates, setCoordinates] = useState([]);
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
    let startValue = selected;
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
    translateX.value = withTiming(selected === "Tour" ? 150 : 0, { duration: 200 });
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
  
  return (
    <View style={{ flex: 1 }}>
      <View style={{width: '100%', height: "10%", backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center'}}>
        <TouchableWithoutFeedback onPress={toggleSwitch}>
      <View
        style={{
          width: 300,
          height: 40,
          backgroundColor: "#222",
          borderRadius: 25,
          flexDirection: "row",
          alignItems: "center",
          padding: 5,
          justifyContent: "space-between",
        }}
      >
        <Animated.View
          style={[
            {
              width: 150,
              height: 40,
              borderRadius: 20,
              position: "absolute",
              backgroundColor: selected === "Tour" ? "white" : "red",
            },
            animatedStyle,
          ]}
        />

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: selected === "Tour" ? "#222" : "white",
            fontWeight: "bold",
            zIndex: 1,
          }}
        >
          Tour
        </Text>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: "white",
            fontWeight: "bold",
            zIndex: 1,
          }}
        >
          Retour
        </Text>
      </View>
    </TouchableWithoutFeedback>
      </View>
      {Platform.OS === "ios" ? (
          <MapView
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
            <ActivityIndicator
              size="large"
              color="red"
              style={{ position: "absolute", alignSelf: "center", top: "50%" }}
            />
          )}

          {coordinates.length > 0 && (routeData as any)[selected.toLowerCase()].vehicles.length > 0 && (routeData as any)[selected.toLowerCase()].vehicles.map((veh: any) => (
            <Marker
          key={veh.vehicle.id}
          coordinate={{
          longitude: veh.vehicle.position.longitude,
          latitude: veh.vehicle.position.latitude,
          }}
          tracksViewChanges={false} 
          >
          <View
          style={{
          width: 80,  
          height: 30, 
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
          borderRadius: 10,
          padding: 5,
          }}
          >
          <Image
          source={{ uri: veh.img }}
          style={{ width: 70, height: 30, resizeMode: "contain" }}
          />
          </View>
          </Marker>
          ))}
          </MapView>
      ) : (
        <View style={{ flex: 1 }}>
        <Mapbox.MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera 
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
  
              {(routeData as any)[selected.toLowerCase()]?.vehicles?.map((veh: any) => {
                const { vehicle } = veh;
                if (!vehicle?.position) return null;
                return (
                  <Mapbox.MarkerView
                    key={`veh-${vehicle.vehicle.licensePlate || vehicle.vehicle.id}`}
                    id={`vehicle-${vehicle.vehicle.licensePlate || vehicle.vehicle.id}`}
                    coordinate={[vehicle.position.longitude, vehicle.position.latitude]}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 30,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "black",
                        borderRadius: 10,
                        padding: 5,
                      }}
                    >
                        <Image
                          style={{ width: 70, height: 30}}
                          source={{ uri: veh.img }}
                          contentFit="contain"
                          />
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
            index={0}
            snapPoints={(alertData as any).length >= 1 ? ["15%", "60%"] : ["15%"]}
            enableDynamicSizing={false}
            backgroundStyle={{ backgroundColor: "#121212" }}
            handleIndicatorStyle={{ backgroundColor: "white" }}
          >
            {(alertData as any).length == 0 ? (
              <BottomSheetView>
               <View style={{ paddingHorizontal: 30, marginTop: 10 }}>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                        No events on route {routeName}
                      </Text>
                      <Text style={{ color: "#DEDEDE", fontWeight: "400" }}>
                        There aren't any events on this route
                      </Text>
                    </View>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <FontAwesome6 name="circle-check" size={27} color="white" />
                    </View>
                  </View>
                  <View
                    style={{
                      height: 1,
                      width: "100%",
                      backgroundColor: "white",
                      marginTop: 10,
                    }}
                  ></View>
                </View>
              </BottomSheetView>
            ) : (

            <BottomSheetScrollView
              style={{ backgroundColor: "#121212", marginBottom: 30 }}
              contentContainerStyle={{ backgroundColor: "#121212" }}
            >
              <View>
                <View style={{ paddingHorizontal: 30, marginTop: 10 }}>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                      {`${(alertData as any).length} event${(alertData as any).length > 1 ? 's' : ''} on route ${routeName}`}
                      </Text>
                      <Text style={{ color: "#DEDEDE", fontWeight: "400" }}>
                        { `There are ${(alertData as any).length <= 2 ? `minor disruptions` : (alertData as any).length <= 5 ? 'some disruptions' : `serious disruptions`} on this route.`}
                     
                      </Text>
                    </View>
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      }}
                    >
                      <MaterialIcons name="warning-amber" size={27} color="white" />
                    </View>
                  </View>
                  <View
                    style={{
                      height: 1,
                      width: "100%",
                      backgroundColor: "white",
                      marginTop: 10,
                    }}
                  ></View>
                </View>
                <View
                  style={{
                    paddingHorizontal: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 20,
                    marginTop: 20,
                  }}
                >
                  {memoizedAlertContent}
                </View>
              </View>
            </BottomSheetScrollView>
            )}
          </BottomSheet>
        )}
    </View>
  );
}