import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/** Let the user pick a photo. With `keep`, a copy goes in the app's documents so it survives cache clears. */
export async function pickRecipePhoto({ aspect = [4, 5] as [number, number], keep = true } = {}): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos access needed', 'Allow Snapspoon to use your photos in Settings to add a picture.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7 });
  if (res.canceled || !res.assets[0]) return null;
  const uri = res.assets[0].uri;
  if (Platform.OS === 'web' || !keep) return uri;

  const dir = new Directory(Paths.document, 'recipe-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `${Date.now()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Videos up to this size can be posted. */
const MAX_VIDEO_MB = 50;

/** Let the user pick a cooking video and keep a copy in the app's documents. */
export async function pickRecipeVideo(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Videos access needed', 'Allow Snapspoon to use your photos and videos in Settings to add a cooking video.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: true, videoMaxDuration: 180, quality: 0.7 });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  if ((asset.fileSize ?? 0) > MAX_VIDEO_MB * 1024 * 1024) {
    Alert.alert('That video is too big', `Pick one under ${MAX_VIDEO_MB} MB, or trim it to a minute or two.`);
    return null;
  }
  return keepVideo(asset.uri);
}

/** Copies a video (picked or just filmed) into the app's documents so it survives cache clears. */
export async function keepVideo(uri: string) {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'recipe-videos');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.split('?')[0] || 'mp4';
  const dest = new File(dir, `${Date.now()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Remove a photo or video this app saved; ignores anything outside its own folder. */
export function deleteRecipePhoto(uri: string | undefined) {
  if (!uri || Platform.OS === 'web' || !/\/recipe-(photos|videos)\//.test(uri)) return;
  const f = new File(uri);
  if (f.exists) f.delete();
}

/** Removes every photo and video this app saved on the phone. */
export function deleteAllMedia() {
  if (Platform.OS === 'web') return;
  for (const name of ['recipe-photos', 'recipe-videos']) {
    const dir = new Directory(Paths.document, name);
    if (dir.exists) dir.delete();
  }
}
