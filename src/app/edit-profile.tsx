import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Avatar, refreshSocial } from '@/components/social';
import { Button, Field, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { pickRecipePhoto } from '@/lib/photos';
import { saveProfile, setProfilePhoto } from '@/lib/social';
import { useSocial } from '@/lib/social-store';
import { useStore } from '@/lib/store';

/** Change your picture, name, handle and bio. */
export default function EditProfile() {
  const { userId, me } = useSocial();
  const profile = useStore((s) => s.profile);
  const setAbout = useStore((s) => s.setAbout);
  const [name, setName] = useState(me?.name ?? profile?.name ?? '');
  const [handle, setHandle] = useState(me?.handle ?? '');
  const [bio, setBio] = useState(me?.bio ?? profile?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changePhoto = async () => {
    if (!userId || !me) return Alert.alert('Make your recipe page first', 'Pick a handle on the Account tab, then you can add a picture.');
    const uri = await pickRecipePhoto({ aspect: [1, 1], keep: false });
    if (!uri) return;
    try {
      await setProfilePhoto(userId, uri);
      await refreshSocial(userId);
    } catch (e) {
      Alert.alert('Could not update your picture', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const save = async () => {
    setAbout({ name: name.trim() || profile?.name || '', bio: bio.trim() });
    if (!userId || !me) return router.back();
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(handle)) return setError('Handles are 3 to 20 letters, numbers, dots or underscores.');
    setBusy(true); setError('');
    try {
      await saveProfile(userId, { handle, name: name.trim() || handle, bio: bio.trim(), streak: me.streak, photo: me.photo });
      await refreshSocial(userId);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again.');
    }
    setBusy(false);
  };

  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Edit profile</T>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Change profile picture"><Avatar p={me ?? { name }} size={96} /></Pressable>
        <Pressable onPress={changePhoto} hitSlop={8}><T style={{ fontWeight: '700' }}>Change picture</T></Pressable>
      </View>
      <Field label="Name" value={name} onChangeText={setName} />
      {me && <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" autoCorrect={false} />}
      <Field label="Bio" value={bio} onChangeText={setBio} maxLength={120} multiline placeholder="Cooking my way to my goal weight" />
      <T variant="muted" style={{ fontSize: 12, textAlign: 'right' }}>{bio.length}/120</T>
      {!!error && <T style={{ color: Colors.warn }}>{error}</T>}
      <Button title={busy ? 'Saving…' : 'Save'} kind="primary" disabled={busy} onPress={save} />
    </Screen>
  );
}
