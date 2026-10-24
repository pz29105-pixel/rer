import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Navigation from './src/navigation'
import { StoreProvider, useStore } from './src/store/AppStore'
import { farben } from './src/theme'

// Wartet, bis die lokal gespeicherten Daten geladen sind.
function Inhalt() {
  const { geladen } = useStore()
  if (!geladen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={farben.haupt} />
      </View>
    )
  }
  return <Navigation />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Inhalt />
      </StoreProvider>
    </SafeAreaProvider>
  )
}
