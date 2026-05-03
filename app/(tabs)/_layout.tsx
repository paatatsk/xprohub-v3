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

function BackButton({ returnTo = '/(tabs)' }: { returnTo?: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.push(returnTo as any)} style={{ paddingLeft: 16 }}>
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
      <Tabs.Screen name="job-detail"    options={{ ...headerDefaults, headerShown: true, title: 'JOB DETAILS',    headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="apply"         options={{ ...headerDefaults, headerShown: true, title: 'APPLY',          headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="apply-success" options={{ ...headerDefaults, headerShown: true, title: 'SENT' }} />
      <Tabs.Screen name="my-jobs"         options={{ ...headerDefaults, headerShown: true, title: 'MY JOBS',         headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="my-applications" options={{ ...headerDefaults, headerShown: true, title: 'MY APPLICATIONS', headerLeft: () => <BackButton /> }} />
      <Tabs.Screen name="job-bids"        options={{ ...headerDefaults, headerShown: true, title: 'APPLICATIONS',    headerLeft: () => <BackButton /> }} />
      <Tabs.Screen
        name="stripe-connect"
        options={({ route }) => ({
          ...headerDefaults,
          headerShown: true,
          title: 'GET PAID',
          headerLeft: () => (
            <BackButton returnTo={(route.params as any)?.returnTo ?? '/(tabs)'} />
          ),
        })}
      />
    </Tabs>
  );
}
