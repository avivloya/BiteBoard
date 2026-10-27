import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/** Let the user pick a recipe photo and keep a copy in the app's documents, so it survives cache clears. */
export async function pickRecipePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos access needed', 'Allow Biteboard to use your photos in Settings to add a picture.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.7 });
  if (res.canceled || !res.assets[0]) return null;
  const uri = res.assets[0].uri;
  if (Platform.OS === 'web') return uri;

  const dir = new Directory(Paths.document, 'recipe-photos');
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const dest = new File(dir, `${Date.now()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Remove a photo this app saved; ignores anything outside its own folder. */
export function deleteRecipePhoto(uri: string | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.includes('/recipe-photos/')) return;
  const f = new File(uri);
  if (f.exists) f.delete();
}
