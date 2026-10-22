import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Button, confirm, ErrorBox, Field, H1, H2, Loading, Muted, Screen, showError,
} from '../components/ui';
import {
  createProject, deleteProject, getProject, removeFile, updateProject, uploadImage,
} from '../lib/repo';
import { useAsync, useSignedUrl } from '../lib/hooks';
import { colors } from '../theme';
import type { Project } from '../types';

export default function ProjectScreen() {
  const nav = useNavigation<any>();
  const { id: routeId } = useRoute<any>().params as { id: string | null };
  const [id, setId] = useState<string | null>(routeId);
  const { data, error, loading, reload } = useAsync(
    async () => (id ? await getProject(id) : null), [id]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const photoUrl = useSignedUrl('photos', data?.photoPath);

  useEffect(() => {
    if (data) { setName(data.customerName); setAddress(data.address); setNotes(data.notes); }
  }, [data]);
  useEffect(() => { nav.setOptions({ title: id ? 'Projekt' : 'Neues Projekt' }); }, [id, nav]);

  async function save(): Promise<string | null> {
    if (!name.trim()) { Alert.alert('Bitte prüfen', 'Bitte einen Kundennamen eintragen.'); return null; }
    setBusy(true);
    try {
      if (id) {
        await updateProject(id, { customerName: name.trim(), address, notes });
        return id;
      }
      const newId = await createProject({ customerName: name.trim(), address, notes });
      setId(newId);
      return newId;
    } catch (e) { showError(e); return null; } finally { setBusy(false); }
  }

  async function pickPhoto(camera: boolean) {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Zugriff fehlt', camera ? 'Bitte erlaube der App den Kamerazugriff in den Einstellungen.' : 'Bitte erlaube der App den Zugriff auf Fotos in den Einstellungen.');
      return;
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    const pid = await save();
    if (!pid) return;
    setBusy(true);
    try {
      const up = await uploadImage('photos', res.assets[0].uri, 1600);
      const old = data?.photoPath ?? null;
      await updateProject(pid, { photoPath: up.path });
      await removeFile('photos', old);
      reload();
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  function remove(p: Project) {
    confirm('Projekt löschen?', 'Das Projekt samt Foto wird endgültig gelöscht.', 'Löschen', async () => {
      try { await deleteProject(p); nav.goBack(); } catch (e) { showError(e); }
    });
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (id && !data && loading) return <Loading />;

  return (
    <Screen>
      <H1>{id ? name || 'Projekt' : 'Neues Projekt'}</H1>
      <Field label="Kunde" value={name} onChangeText={setName} placeholder="Name" />
      <Field label="Adresse" value={address} onChangeText={setAddress} multiline placeholder="Straße, Ort" />
      <Field label="Hinweise für den Kunden" value={notes} onChangeText={setNotes} multiline />
      <Button title="Speichern" kind="ghost" onPress={() => { void save(); }} busy={busy} />

      <H2>Foto</H2>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={s.photo} resizeMode="cover" /> : (
        <Muted>Noch kein Foto. Fotografiere die Wand, an der die Anlage montiert werden soll.</Muted>
      )}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <Button style={{ flex: 1 }} kind="ghost" title="Aufnehmen" onPress={() => pickPhoto(true)} disabled={busy} />
        <Button style={{ flex: 1 }} kind="ghost" title="Auswählen" onPress={() => pickPhoto(false)} disabled={busy} />
      </View>

      {id && data ? (
        <>
          <H2>Planung</H2>
          <Button title="Geräte im Foto platzieren" disabled={!data.photoPath}
            onPress={() => nav.navigate('Editor', { id })} />
          {!data.photoPath ? <Muted>Zuerst ein Foto hinzufügen.</Muted> : null}
          <Button title="Zeit, Kosten und PDF" disabled={data.placements.length === 0}
            onPress={() => nav.navigate('Plan', { id })} />
          {data.placements.length === 0 ? <Muted>Zuerst mindestens ein Gerät platzieren.</Muted> : null}
          <Button kind="danger" title="Projekt löschen" onPress={() => remove(data)} style={{ marginTop: 32 }} />
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.line, borderRadius: 4 },
});
