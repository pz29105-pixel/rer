import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { AuthProvider, useAuth } from './src/lib/auth';
import { isConfigured } from './src/lib/supabase';
import { colors, fonts } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import SetupScreen from './src/screens/SetupScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import EditorScreen from './src/screens/EditorScreen';
import PlanScreen from './src/screens/PlanScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import DeviceEditScreen from './src/screens/DeviceEditScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.accent },
};

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, color: focused ? colors.ink : colors.muted }}>{label.toUpperCase()}</Text>;
}

function Main() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarShowIcon: false } as object}>
      <Tabs.Screen name="Projekte" component={ProjectsScreen}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Projekte" focused={focused} />, tabBarIcon: () => null }} />
      <Tabs.Screen name="Geräte" component={DevicesScreen}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Geräte" focused={focused} />, tabBarIcon: () => null }} />
      <Tabs.Screen name="Einstellungen" component={SettingsScreen}
        options={{ tabBarLabel: ({ focused }) => <TabLabel label="Einstellungen" focused={focused} />, tabBarIcon: () => null }} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { session, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  const header = {
    headerStyle: { backgroundColor: colors.bg },
    headerShadowVisible: false,
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: fonts.serif, fontSize: 20 },
    headerBackButtonDisplayMode: 'minimal' as const,
  };
  return (
    <Stack.Navigator screenOptions={header}>
      {session ? (
        <>
          <Stack.Screen name="Main" component={Main} options={{ headerShown: false }} />
          <Stack.Screen name="Projekt" component={ProjectScreen} />
          <Stack.Screen name="Editor" component={EditorScreen} options={{ title: 'Visualisierung' }} />
          <Stack.Screen name="Plan" component={PlanScreen} options={{ title: 'Planung' }} />
          <Stack.Screen name="Gerät" component={DeviceEditScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [loaded] = useFonts({ CormorantGaramond_500Medium, CormorantGaramond_700Bold, Inter_400Regular, Inter_500Medium });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isConfigured ? (
        <AuthProvider>
          <NavigationContainer theme={theme}><Root /></NavigationContainer>
        </AuthProvider>
      ) : <SetupScreen />}
    </SafeAreaProvider>
  );
}
