import { Text, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

// Tab bar hidden — navigation happens via home screen hub, not a visible tab bar.
// Tabs are registered here so Expo Router knows they exist.
// Home (index) has no header. All other screens show a Dark Gold header with back button.

const headerDefaults = {
  headerStyle:         { backgroundColor: Colors.background },
  headerTintColor:     Colors.gold,
  headerTitleStyle:    { color: Colors.textPrimary, fontWeight: 'bold' as const },
  headerShadowVisible: false,
  headerBackVisible:   false, // we supply our own back button
};

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ paddingLeft: 16 }}>
      <Text style={{ color: Colors.gold, fontSize: 22 }}>‹</Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarStyle: { display: 'none' }, headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="market"        options={{ ...headerDefaults, headerShown: true, title: 'LIVE MARKET',   headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="post"          options={{ ...headerDefaults, headerShown: true, title: 'POST A JOB',    headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="earnings"      options={{ ...headerDefaults, headerShown: true, title: 'EARNINGS',      headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="profile"       options={{ ...headerDefaults, headerShown: true, title: 'PROFILE',       headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="notifications" options={{ ...headerDefaults, headerShown: true, title: 'NOTIFICATIONS', headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="chat"          options={{ ...headerDefaults, headerShown: true, title: 'CHAT',          headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="belt"          options={{ ...headerDefaults, headerShown: true, title: 'BELT SYSTEM',   headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="match"         options={{ ...headerDefaults, headerShown: true, title: 'WORKER MATCH',  headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="payment"       options={{ ...headerDefaults, headerShown: true, title: 'PAYMENT',       headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="review"        options={{ ...headerDefaults, headerShown: true, title: 'RATE & REVIEW',  headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="direct-hire"   options={{ ...headerDefaults, headerShown: true, title: 'HIRE DIRECTLY',  headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="job-chat"      options={{ ...headerDefaults, headerShown: true, title: 'CHAT',           headerLeft: () => <BackButton /> }} />
    </Tabs>
  );
}
