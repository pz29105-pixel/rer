import type { ImageSourcePropType } from 'react-native'
import type { Geraet, GeraeteTyp } from '../types'

// Neutrale Platzhalter (transparente PNGs), bis eigene Produktbilder hochgeladen sind.
const PLATZHALTER: Record<GeraeteTyp, ImageSourcePropType> = {
  wand: require('../../assets/geraete/wand.png'),
  kassette: require('../../assets/geraete/kassette.png'),
  truhe: require('../../assets/geraete/truhe.png'),
  kanal: require('../../assets/geraete/kanal.png'),
  aussen: require('../../assets/geraete/aussen.png'),
  multisplit: require('../../assets/geraete/multisplit.png'),
}

export const bildFuer = (g?: Pick<Geraet, 'bildUri' | 'typ'>): ImageSourcePropType | undefined =>
  g ? (g.bildUri ? { uri: g.bildUri } : PLATZHALTER[g.typ]) : undefined

export const TYP_NAMEN: Record<GeraeteTyp, string> = {
  wand: 'Wandgerät', kassette: 'Deckenkassette', truhe: 'Truhengerät', kanal: 'Kanalgerät', aussen: 'Außengerät', multisplit: 'Multisplit',
}
