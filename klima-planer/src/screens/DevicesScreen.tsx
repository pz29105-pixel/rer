import { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, ErrorBox, H1, Loading, Muted } from '../components/ui';
import { listDevices } from '../lib/repo';
import { useAsync, useSignedUrl } from '../lib/hooks';
import { formatEuro, formatHours } from '../logic/planning';
import { colors, fonts, space } from '../theme';
import { DEVICE_TYPE_LABEL, type Device } from '../types';

function Thumb({ device }: { device: Device }) {
  const url = useSignedUrl('devices', device.imagePath);
  return (
    <View style={s.thumb}>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
    </View>
  );
}

export default function DevicesScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useAsync(listDevices, []);
  useFocusEffect(useCallback(() => { reload(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.xl }}
      data={data ?? []}
      keyExtractor={d => d.id}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <View>
          <H1>Geräte</H1>
          <Muted>Freigestellte Bilder (PNG mit transparentem Hintergrund) ergeben das beste Ergebnis.</Muted>
          <Button title="Gerät hinzufügen" onPress={() => nav.navigate('Gerät', { device: null })} />
          <View style={{ height: space.md }} />
        </View>
      }
      ListEmptyComponent={<Muted>Noch keine Geräte im Katalog.</Muted>}
      renderItem={({ item }) => (
        <Pressable onPress={() => nav.navigate('Gerät', { device: item })}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Thumb device={item} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Muted>{DEVICE_TYPE_LABEL[item.type]}</Muted>
                <Muted>{formatHours(item.installHours)} · Material {formatEuro(item.materialPrice)}</Muted>
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  thumb: { width: 84, height: 60, backgroundColor: colors.bg, borderRadius: 2 },
  name: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.ink },
});
