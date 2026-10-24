import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { farben } from './theme'
import AngebotScreen from './screens/AngebotScreen'
import EinstellungenScreen from './screens/EinstellungenScreen'
import { FirmaScreen, PreiseScreen, TexteScreen } from './screens/EinstellungenDetail'
import FotoEditorScreen from './screens/FotoEditorScreen'
import FotoScreen from './screens/FotoScreen'
import GeraeteScreen from './screens/GeraeteScreen'
import KatalogScreen, { GeraetFormScreen } from './screens/KatalogScreen'
import KostenScreen from './screens/KostenScreen'
import KundeFormScreen from './screens/KundeFormScreen'
import KundenScreen from './screens/KundenScreen'
import LeistungScreen from './screens/LeistungScreen'
import LeitungScreen from './screens/LeitungScreen'
import ProjektScreen from './screens/ProjektScreen'
import RaeumeScreen from './screens/RaeumeScreen'
import RaumFormScreen from './screens/RaumFormScreen'

export type RootParams = {
  Kunden: undefined
  KundeForm: { kundeId?: string }
  Projekt: { projektId: string }
  Raeume: { projektId: string }
  RaumForm: { projektId: string; raumId?: string }
  Leistung: { projektId: string }
  Geraete: { projektId: string }
  Foto: { projektId: string }
  FotoEditor: { projektId: string; ziel: string; modus: 'geraet' | 'leitung' } // ziel = Raum-ID oder "aussen"
  Leitung: { projektId: string }
  Kosten: { projektId: string }
  Angebot: { projektId: string }
  Einstellungen: undefined
  Firma: undefined
  Katalog: undefined
  GeraetForm: { geraetId?: string }
  Preise: undefined
  Texte: undefined
}

const Stack = createNativeStackNavigator<RootParams>()

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: farben.haupt },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'Zurück',
          contentStyle: { backgroundColor: farben.hintergrund },
        }}
      >
        <Stack.Screen name="Kunden" component={KundenScreen} options={{ title: 'Kunden und Projekte' }} />
        <Stack.Screen name="KundeForm" component={KundeFormScreen} options={{ title: 'Kunde' }} />
        <Stack.Screen name="Projekt" component={ProjektScreen} options={{ title: 'Projekt' }} />
        <Stack.Screen name="Raeume" component={RaeumeScreen} options={{ title: 'Räume' }} />
        <Stack.Screen name="RaumForm" component={RaumFormScreen} options={{ title: 'Raum erfassen' }} />
        <Stack.Screen name="Leistung" component={LeistungScreen} options={{ title: 'Kühlleistung' }} />
        <Stack.Screen name="Geraete" component={GeraeteScreen} options={{ title: 'Gerät auswählen' }} />
        <Stack.Screen name="Foto" component={FotoScreen} options={{ title: 'Visualisierung' }} />
        <Stack.Screen name="FotoEditor" component={FotoEditorScreen} options={{ title: 'Foto bearbeiten' }} />
        <Stack.Screen name="Leitung" component={LeitungScreen} options={{ title: 'Leitungsweg' }} />
        <Stack.Screen name="Kosten" component={KostenScreen} options={{ title: 'Kostenschätzung' }} />
        <Stack.Screen name="Angebot" component={AngebotScreen} options={{ title: 'Angebot' }} />
        <Stack.Screen name="Einstellungen" component={EinstellungenScreen} options={{ title: 'Einstellungen' }} />
        <Stack.Screen name="Firma" component={FirmaScreen} options={{ title: 'Firmendaten' }} />
        <Stack.Screen name="Katalog" component={KatalogScreen} options={{ title: 'Gerätekatalog' }} />
        <Stack.Screen name="GeraetForm" component={GeraetFormScreen} options={{ title: 'Gerät' }} />
        <Stack.Screen name="Preise" component={PreiseScreen} options={{ title: 'Preise' }} />
        <Stack.Screen name="Texte" component={TexteScreen} options={{ title: 'Angebotstexte' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
