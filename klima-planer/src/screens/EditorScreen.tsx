import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ErrorBox, Loading, Muted, Stepper, showError } from '../components/ui';
import { getProject, listDevices, uid, updateProject } from '../lib/repo';
import { useAsync, useSignedUrl } from '../lib/hooks';
import { colors, fonts, space } from '../theme';
import type { Device, Placement } from '../types';

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

type SpriteProps = {
  placement: Placement;
  device: Device;
  size: { w: number; h: number };
  selected: boolean;
  onSelect: () => void;
  onChange: (p: Placement) => void;
};

/** Ein Gerät im Foto: ein Finger verschiebt, zwei Finger vergrößern und drehen. */
function Sprite({ placement, device, size, selected, onSelect, onChange }: SpriteProps) {
  const url = useSignedUrl('devices', device.imagePath);
  const latest = useRef({ placement, size, onChange, onSelect });
  latest.current = { placement, size, onChange, onSelect };

  const pan = useMemo(() => {
    let start = placement;
    let pinch: { dist: number; angle: number; width: number; rotation: number } | null = null;
    let offset = { dx: 0, dy: 0 };
    const two = (e: GestureResponderEvent) => {
      const t = e.nativeEvent.touches;
      if (t.length < 2) return null;
      const dx = t[1].pageX - t[0].pageX;
      const dy = t[1].pageY - t[0].pageY;
      return { dist: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        latest.current.onSelect();
        start = latest.current.placement;
        pinch = null;
        offset = { dx: 0, dy: 0 };
      },
      onPanResponderMove: (e, g) => {
        const { size: sz, onChange: change } = latest.current;
        const t = two(e);
        if (t) {
          if (!pinch) pinch = { ...t, width: latest.current.placement.width, rotation: latest.current.placement.rotation };
          change({
            ...latest.current.placement,
            width: clamp(pinch.width * (t.dist / Math.max(pinch.dist, 1)), 0.05, 1),
            rotation: Math.round(pinch.rotation + (t.angle - pinch.angle)),
          });
          return;
        }
        if (pinch) {
          // Ein Finger wurde losgelassen: ab hier wieder von der aktuellen Position verschieben.
          pinch = null;
          start = latest.current.placement;
          offset = { dx: g.dx, dy: g.dy };
        }
        change({
          ...latest.current.placement,
          x: clamp(start.x + (g.dx - offset.dx) / sz.w, 0, 1),
          y: clamp(start.y + (g.dy - offset.dy) / sz.h, 0, 1),
        });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const w = placement.width * size.w;
  const h = w * device.aspect;
  return (
    <View
      {...pan.panHandlers}
      style={{
        position: 'absolute',
        left: placement.x * size.w - w / 2,
        top: placement.y * size.h - h / 2,
        width: w,
        height: h,
        transform: [{ rotate: `${placement.rotation}deg` }],
        borderWidth: selected ? 1 : 0,
        borderColor: colors.accent,
        borderStyle: 'dashed',
      }}>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : null}
    </View>
  );
}

export default function EditorScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { data, error, loading, reload } = useAsync(
    async () => ({ project: await getProject(id), devices: await listDevices() }), [id]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [aspect, setAspect] = useState(0.75);
  const [saving, setSaving] = useState(false);
  const photoUrl = useSignedUrl('photos', data?.project.photoPath);

  useEffect(() => { if (data) setPlacements(data.project.placements); }, [data]);
  useEffect(() => {
    if (photoUrl) Image.getSize(photoUrl, (w, h) => setAspect(h / w), () => {});
  }, [photoUrl]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data || (loading && !photoUrl)) return <Loading />;

  const size = { w: screenW, h: screenW * aspect };
  const sel = placements.find(p => p.key === selected) ?? null;
  const patch = (key: string, p: Partial<Placement>) =>
    setPlacements(list => list.map(x => (x.key === key ? { ...x, ...p } : x)));

  function add(d: Device) {
    const p: Placement = {
      key: uid(), deviceId: d.id, x: 0.5, y: 0.4, width: d.type === 'aussen' ? 0.3 : 0.4,
      rotation: 0, lineMeters: 3, coreDrills: 1, floor: 0,
    };
    setPlacements(l => [...l, p]);
    setSelected(p.key);
  }

  async function done() {
    setSaving(true);
    try {
      await updateProject(id, { placements });
      nav.goBack();
    } catch (e) { showError(e); setSaving(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
        <Pressable onPress={() => setSelected(null)} style={{ width: size.w, height: size.h, backgroundColor: colors.line }}>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: size.w, height: size.h }} /> : null}
          {placements.map(p => {
            const d = data.devices.find(x => x.id === p.deviceId);
            return d ? (
              <Sprite key={p.key} placement={p} device={d} size={size}
                selected={p.key === selected}
                onSelect={() => setSelected(p.key)}
                onChange={n => patch(p.key, n)} />
            ) : null;
          })}
        </Pressable>

        <View style={{ padding: space.lg }}>
          {sel ? (
            <View>
              <Text style={s.title}>{data.devices.find(d => d.id === sel.deviceId)?.name}</Text>
              <Muted>Mit einem Finger verschieben, mit zwei Fingern vergrößern und drehen.</Muted>
              <Stepper label="Größe" value={Math.round(sel.width * 100)} min={5} max={100} step={2} unit="%"
                onChange={n => patch(sel.key, { width: n / 100 })} />
              <Stepper label="Drehung" value={sel.rotation} min={-180} max={180} step={5} unit="°"
                onChange={n => patch(sel.key, { rotation: n })} />
              <Button kind="danger" title="Gerät entfernen" onPress={() => {
                setPlacements(l => l.filter(x => x.key !== sel.key));
                setSelected(null);
              }} />
            </View>
          ) : <Muted>Tippe auf ein Gerät im Foto, um es zu bearbeiten.</Muted>}

          <Text style={[s.title, { marginTop: space.lg }]}>Gerät hinzufügen</Text>
          {data.devices.length === 0 ? (
            <Muted>Der Gerätekatalog ist leer. Lege unter „Geräte“ zuerst Bilder an.</Muted>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {data.devices.map(d => (
                <Button key={d.id} kind="ghost" title={`+ ${d.name}`} onPress={() => add(d)} />
              ))}
            </View>
          )}
          <Button title="Fertig" onPress={done} busy={saving} style={{ marginTop: space.lg }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginBottom: 4 },
});
