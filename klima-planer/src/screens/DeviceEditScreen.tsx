import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, confirm, Field, H1, Muted, Screen, num, showError } from '../components/ui';
import { createDevice, deleteDevice, updateDevice, uploadImage } from '../lib/repo';
import { useSignedUrl } from '../lib/hooks';
import { colors, fonts } from '../theme';
import { DEVICE_TYPE_LABEL, type Device, type DeviceType } from '../types';

const TYPES = Object.keys(DEVICE_TYPE_LABEL) as DeviceType[];
const txt = (n: number) => String(n).replace('.', ',');

export default function DeviceEditScreen() {
  const nav = useNavigation<any>();
  const { device } = useRoute<any>().params as { device: Device | null };
  const [name, setName] = useState(device?.name ?? '');
  const [type, setType] = useState<DeviceType>(device?.type ?? 'innen_wand');
  const [hours, setHours] = useState(txt(device?.installHours ?? 4));
  const [price, setPrice] = useState(txt(device?.materialPrice ?? 0));
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useSignedUrl('devices', device?.imagePath);

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Zugriff fehlt', 'Bitte erlaube der App den Zugriff auf Fotos in den Einstellungen.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]) setPicked(res.assets[0].uri);
  }

  async function save() {
    if (!name.trim()) { Alert.alert('Bitte prüfen', 'Bitte einen Namen eintragen.'); return; }
    if (!device && !picked) { Alert.alert('Bitte prüfen', 'Bitte ein Bild auswählen.'); return; }
    setBusy(true);
    try {
      const fields = { name: name.trim(), type, installHours: num(hours), materialPrice: num(price) };
      if (device) {
        await updateDevice(device.id, fields);
      } else {
        const up = await uploadImage('devices', picked!, 800, true);
        await createDevice({ ...fields, imagePath: up.path, aspect: up.aspect });
      }
      nav.goBack();
    } catch (e) { showError(e); setBusy(false); }
  }

  const shown = picked ?? current;
  return (
    <Screen>
      <H1>{device ? 'Gerät bearbeiten' : 'Neues Gerät'}</H1>
      <Pressable onPress={device ? undefined : pick} style={s.preview}>
        {shown ? <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          : <Text style={s.hint}>Bild auswählen</Text>}
      </Pressable>
      {!device ? <Button kind="ghost" title={picked ? 'Anderes Bild wählen' : 'Bild auswählen'} onPress={pick} /> : (
        <Muted>Das Bild lässt sich nachträglich nicht ändern. Lege dafür ein neues Gerät an.</Muted>
      )}
      <View style={{ height: 16 }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="z. B. Split-Gerät 3,5 kW" />
      <Text style={s.label}>Typ</Text>
      <View style={s.types}>
        {TYPES.map(t => (
          <Pressable key={t} onPress={() => setType(t)} style={[s.chip, type === t && s.chipOn]}>
            <Text style={[s.chipTxt, type === t && { color: colors.accentInk }]}>{DEVICE_TYPE_LABEL[t]}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Montagezeit" value={hours} onChangeText={setHours} keyboardType="decimal-pad" suffix="Std." />
      <Field label="Materialpreis" value={price} onChangeText={setPrice} keyboardType="decimal-pad" suffix="€" />
      <Button title="Speichern" onPress={save} busy={busy} />
      {device ? (
        <Button kind="danger" title="Gerät löschen" style={{ marginTop: 24 }} onPress={() =>
          confirm('Gerät löschen?', 'Das Gerät verschwindet auch aus Projekten, in denen es platziert wurde.', 'Löschen',
            async () => { try { await deleteDevice(device); nav.goBack(); } catch (e) { showError(e); } })} />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: { height: 180, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  hint: { fontFamily: fonts.sans, color: colors.muted },
  label: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipTxt: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
});
