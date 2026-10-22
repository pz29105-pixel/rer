import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';
import {
  DEFAULT_SETTINGS,
  type Device,
  type DeviceType,
  type Placement,
  type Project,
  type Settings,
} from '../types';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

async function userId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  fail(error);
  if (!data.user) throw new Error('Nicht angemeldet.');
  return data.user.id;
}

/** Verkleinert das Bild und lädt es hoch. Gibt den Speicherpfad zurück. */
export async function uploadImage(
  bucket: 'photos' | 'devices',
  localUri: string,
  maxWidth: number,
  png = false,
): Promise<{ path: string; aspect: number }> {
  const img = await manipulateAsync(localUri, [{ resize: { width: maxWidth } }], {
    compress: 0.8,
    format: png ? SaveFormat.PNG : SaveFormat.JPEG,
  });
  const buf = await (await fetch(img.uri)).arrayBuffer();
  const path = `${await userId()}/${uid()}.${png ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buf, { contentType: png ? 'image/png' : 'image/jpeg' });
  fail(error);
  return { path, aspect: img.height / img.width };
}

export async function signedUrl(bucket: 'photos' | 'devices', path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  fail(error);
  return data.signedUrl;
}

export async function removeFile(bucket: 'photos' | 'devices', path: string | null) {
  if (path) await supabase.storage.from(bucket).remove([path]);
}

/* ---------- Einstellungen ---------- */

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('data').maybeSingle();
  fail(error);
  return { ...DEFAULT_SETTINGS, ...(data?.data ?? {}) };
}

export async function saveSettings(s: Settings) {
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: await userId(), data: s, updated_at: new Date().toISOString() });
  fail(error);
}

/* ---------- Geräte ---------- */

type DeviceRow = {
  id: string; name: string; type: DeviceType; image_path: string;
  aspect: number; install_hours: number; material_price: number;
};

const toDevice = (r: DeviceRow): Device => ({
  id: r.id,
  name: r.name,
  type: r.type,
  imagePath: r.image_path,
  aspect: Number(r.aspect),
  installHours: Number(r.install_hours),
  materialPrice: Number(r.material_price),
});

export async function listDevices(): Promise<Device[]> {
  const { data, error } = await supabase.from('devices').select('*').order('name');
  fail(error);
  return (data as DeviceRow[]).map(toDevice);
}

export async function createDevice(d: Omit<Device, 'id'>): Promise<void> {
  const { error } = await supabase.from('devices').insert({
    name: d.name, type: d.type, image_path: d.imagePath, aspect: d.aspect,
    install_hours: d.installHours, material_price: d.materialPrice,
  });
  fail(error);
}

export async function updateDevice(
  id: string,
  d: Pick<Device, 'name' | 'type' | 'installHours' | 'materialPrice'>,
): Promise<void> {
  const { error } = await supabase.from('devices').update({
    name: d.name, type: d.type, install_hours: d.installHours, material_price: d.materialPrice,
  }).eq('id', id);
  fail(error);
}

export async function deleteDevice(d: Device): Promise<void> {
  const { error } = await supabase.from('devices').delete().eq('id', d.id);
  fail(error);
  await removeFile('devices', d.imagePath);
}

/* ---------- Projekte ---------- */

type ProjectRow = {
  id: string; customer_name: string; address: string; notes: string;
  photo_path: string | null; placements: Placement[]; team_size: number;
  start_date: string | null; created_at: string;
};

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  customerName: r.customer_name,
  address: r.address,
  notes: r.notes,
  photoPath: r.photo_path,
  placements: r.placements ?? [],
  teamSize: r.team_size,
  startDate: r.start_date,
  createdAt: r.created_at,
});

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects').select('*').order('created_at', { ascending: false });
  fail(error);
  return (data as ProjectRow[]).map(toProject);
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  fail(error);
  return toProject(data as ProjectRow);
}

export async function createProject(p: Pick<Project, 'customerName' | 'address' | 'notes'>): Promise<string> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ customer_name: p.customerName, address: p.address, notes: p.notes })
    .select('id').single();
  fail(error);
  return (data as { id: string }).id;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.customerName !== undefined) row.customer_name = patch.customerName;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.photoPath !== undefined) row.photo_path = patch.photoPath;
  if (patch.placements !== undefined) row.placements = patch.placements;
  if (patch.teamSize !== undefined) row.team_size = patch.teamSize;
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  const { error } = await supabase.from('projects').update(row).eq('id', id);
  fail(error);
}

export async function deleteProject(p: Project): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', p.id);
  fail(error);
  await removeFile('photos', p.photoPath);
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  fail(error);
  await supabase.auth.signOut();
}
