import axios from "axios";
import { useEffect, useState, useRef, useCallback } from "react";
import { View, StyleSheet, TextInput, Platform, ActivityIndicator, Text, ScrollView, Pressable, Keyboard, TouchableWithoutFeedback } from "react-native";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from "expo-router";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

type RouteType = {
  id: string | number;
  color: string;
  type: string;
};

type RoutesMap = Record<string, RouteType>;

function LineItem({ route, data, onPress }: { route: string; data: RouteType; onPress: () => void; }) {
  return (
    <Pressable
      key={route}
      onPress={onPress}
      android_ripple={{ color: '#222', borderless: false }}
      style={({ pressed }) => [
        styles.lineItem,
        pressed && styles.pressedLine,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View details for line ${route}`}
    >
      <View style={[styles.lineColor, { backgroundColor: `#${data.color}` }]}> 
        <Text style={styles.lineNumber}>{route}</Text>
      </View>
      <View style={styles.lineInfo}>
        <Text style={styles.lineType}>This is a {data.type} line.</Text>
        <Text style={styles.lineHint}>Click to view route details</Text>
      </View>
      <MaterialIcons name={Number.isNaN(parseInt(route)) || parseInt(route) > 99 ? "directions-bus" : "tram"} size={28} color={`#${data.color}`} />
    </Pressable>
  );
}

export default function linesSelect() {
  const [searchInput, setSearchInput] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState<RoutesMap>({});
  const [routes, setRoutes] = useState<RoutesMap | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const getRoutes = async () => {
      try {
        const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}api/routes` || '', {
          headers: {
            "x-api-key": process.env.EXPO_PUBLIC_API_KEY
          }
        });
        setRoutes(response.data);
        setFilteredRoutes(response.data);
      } catch (err) {
        console.log('Error fetching ' + err);
      }
    };
    getRoutes();
  }, []);

  const debouncedSearch = useDebounce(searchInput, 250);

  useEffect(() => {
    if (!debouncedSearch.trim() || !routes) {
      const filtered = Object.fromEntries(
        Object.entries(routes || {}).filter(([key]) => !['m1', 'm2', 'm3', 'm4', 'm5'].includes(key.toLowerCase()))
      );
      setFilteredRoutes(filtered);
      return;
    }
    const filtered = Object.fromEntries(
      Object.entries(routes).filter(([key]) =>
        key.toLowerCase().includes(debouncedSearch.trim().toLowerCase()) &&
        !['m1', 'm2', 'm3', 'm4', 'm5'].includes(key.toLowerCase())
      )
    );
    setFilteredRoutes(filtered);
  }, [debouncedSearch, routes]);

  const handleSearch = (text: string) => {
    setSearchInput(text);
  };

  const handleLinePress = useCallback((route: string, data: RouteType) => {
    router.push(`/routeMap?routeId=${data.id}&routeName=${route}&type=${data.type}`);
  }, []);

  const handleScroll = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.background}>
        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="Search a line number"
            keyboardType="numeric"
            placeholderTextColor='white'
            value={searchInput}
            onChangeText={handleSearch}
            returnKeyType="done"
            accessibilityLabel="Search for a line number"
          />
          {routes === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="rgb(255, 255, 255)" />
              <Text style={styles.loadingText}>Loading lines...</Text>
            </View>
          ) : Object.keys(filteredRoutes).length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={40} color="gray" />
              <Text style={styles.emptyText}>No lines found.</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={handleScroll}
              showsVerticalScrollIndicator={false}
            >
              {Object.entries(filteredRoutes).map(([route, data]) => (
                <LineItem
                  key={route}
                  route={route}
                  data={data}
                  onPress={() => handleLinePress(route, data)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#121212",
    width: "100%",
    height: "100%",
    flex: 1,
  },
  container: {
    marginTop: 80,
    paddingHorizontal: 20,
    flex: 1,
    paddingBottom: 20,
  },
  input: {
    height: 50,
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
    color: '#ffffff',
    backgroundColor: 'black',
    fontSize: 18,
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
  scrollContent: {
    flexDirection: 'column',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 100,
  },
  lineItem: {
    width: "100%",
    minHeight: 70,
    borderRadius: 10,
    backgroundColor: 'black',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "space-between",
    alignItems: 'center',
    marginBottom: 2,
  },
  pressedLine: {
    opacity: 0.7,
  },
  lineColor: {
    height: 46,
    width: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lineNumber: {
    fontWeight: "700",
    color: 'white',
    fontSize: 20,
  },
  lineInfo: {
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
    flex: 1,
  },
  lineType: {
    fontWeight: '700',
    fontSize: 15,
    color: 'white',
  },
  lineHint: {
    fontWeight: '500',
    fontSize: 10,
    color: 'gray',
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  loadingText: {
    color: 'gray',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    color: 'gray',
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
  },
});

