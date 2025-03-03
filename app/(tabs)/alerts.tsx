import axios from "axios";
import { useEffect, useState } from "react";
import {  View, Text, ScrollView, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

export default function AlertsScreen() {
const [alerts, setAlerts] = useState<any>(null)
const { width } = useWindowDimensions();

useEffect(() => {
    const getAlerts = async () => {
        try {
        const response = await axios.get(process.env.EXPO_PUBLIC_ALERTS_API_URL || '', {
            headers: {
                "x-api-key": process.env.EXPO_PUBLIC_API_KEY
            }
        });
        setAlerts(response.data)
    } catch (err) {
        console.log('Error fetching ' + err)
    }
    }
    getAlerts();
    const interval = setInterval(() => getAlerts(), 300000)
        return () => {
          clearInterval(interval);
        }
}, [])
if (!alerts) {
    return (
        <View style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
         <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>Loading...</Text>
        </View>
    )
  }

if(alerts != null) return (
<View style={{paddingVertical: 70, backgroundColor: '#121212'}}>
<ScrollView 
  contentContainerStyle={{
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#121212',
    gap: 20,
  }}
  showsVerticalScrollIndicator={false} 
>
  {(alerts.notifications).map((alert: any) => (
    <View 
      key={alert.id} 
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
        {alert.title}
      </Text>

      {alert.lines?.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {alert.lines.map((line: any) => (
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
            source={{ html: alert.message ?? "" }} 
            baseStyle={{ color: 'white', fontSize: 16, lineHeight: 22 }}
          />
        </View>

      <Text style={{ color: 'gray', marginTop: 16, fontSize: 14 }}>
        {new Date(alert.created_at).toLocaleString(undefined, { 
          year: "numeric", 
          month: "long", 
          day: "numeric",
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  ))}
</ScrollView>
</View>
);

}