import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, ErrorBox, H1, Loading, Muted } from '../components/ui';
import { listProjects } from '../lib/repo';
import { useAsync } from '../lib/hooks';
import { colors, space } from '../theme';
import { formatDate } from '../logic/planning';

export default function ProjectsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useAsync(listProjects, []);
  useFocusEffect(useCallback(() => { reload(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data && loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.xl }}
      data={data ?? []}
      keyExtractor={p => p.id}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <View>
          <H1>Projekte</H1>
          <Button title="Neues Projekt" onPress={() => nav.navigate('Projekt', { id: null })} />
          <View style={{ height: space.md }} />
        </View>
      }
      ListEmptyComponent={<Muted>Noch keine Projekte. Lege dein erstes Projekt an.</Muted>}
      renderItem={({ item }) => (
        <Pressable onPress={() => nav.navigate('Projekt', { id: item.id })}>
          <Card>
            <Text style={s.name}>{item.customerName}</Text>
            <Body>{item.address || 'Keine Adresse'}</Body>
            <Muted>
              {item.placements.length} {item.placements.length === 1 ? 'Gerät' : 'Geräte'}
              {item.startDate ? ` · Start ${formatDate(item.startDate)}` : ''}
            </Muted>
          </Card>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({ name: { fontFamily: 'CormorantGaramond_700Bold', fontSize: 22, color: colors.ink } });
