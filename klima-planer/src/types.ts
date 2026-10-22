export type DeviceType = 'innen_wand' | 'innen_kassette' | 'innen_truhe' | 'aussen';

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  innen_wand: 'Innengerät Wand',
  innen_kassette: 'Innengerät Kassette',
  innen_truhe: 'Innengerät Truhe',
  aussen: 'Außengerät',
};

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  imagePath: string;
  /** Verhältnis Höhe / Breite des Bildes, damit es nicht verzerrt wird */
  aspect: number;
  installHours: number;
  materialPrice: number;
};

export type Settings = {
  company: string;
  hourlyRate: number;
  /** Zusatzstunden je Meter Leitung */
  hoursPerMeter: number;
  /** Zusatzstunden je Kernbohrung */
  hoursPerCoreDrill: number;
  /** Zusatzstunden je Etage über dem Erdgeschoss */
  hoursPerFloor: number;
  /** Aufschlag auf Materialpreise in Prozent */
  materialMarkupPercent: number;
  /** Leitungsmaterial je Meter */
  linePricePerMeter: number;
  vatPercent: number;
  workdayHours: number;
};

export const DEFAULT_SETTINGS: Settings = {
  company: '',
  hourlyRate: 65,
  hoursPerMeter: 0.25,
  hoursPerCoreDrill: 0.75,
  hoursPerFloor: 0.5,
  materialMarkupPercent: 15,
  linePricePerMeter: 18,
  vatPercent: 19,
  workdayHours: 8,
};

/** Ein im Foto platziertes Gerät. x/y sind der Mittelpunkt (0..1) relativ zum Foto. */
export type Placement = {
  key: string;
  deviceId: string;
  x: number;
  y: number;
  /** Breite des Geräts als Anteil der Fotobreite */
  width: number;
  /** Drehung in Grad */
  rotation: number;
  /** Arbeitsangaben zu diesem Gerät */
  lineMeters: number;
  coreDrills: number;
  floor: number;
};

export type Project = {
  id: string;
  customerName: string;
  address: string;
  notes: string;
  photoPath: string | null;
  placements: Placement[];
  teamSize: number;
  startDate: string | null;
  createdAt: string;
};
