import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Profile } from '@trano/shared';
import { AVATARS, COLORS, useProfiles } from './store';

/**
 * Créer quelqu'un, depuis le téléphone.
 *
 * Volontairement plus court que l'éditeur du web : pas de pièces attitrées, pas
 * de suppression. On est sur le premier écran de l'app, quelqu'un qui n'a pas
 * encore de profil veut juste exister en trois gestes — le reste se règle
 * ensuite, sur un vrai écran.
 */
export function ProfileCreator({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (profile: Profile) => void;
}) {
  const insets = useSafeAreaInsets();
  const createProfile = useProfiles((s) => s.createProfile);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [color, setColor] = useState(COLORS[0]!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setError('Il faut un prénom !');
    setSaving(true);
    setError(null);
    try {
      onCreated(await createProfile({ name: name.trim(), avatar, color }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible');
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-zinc-50 dark:bg-[#0a0a0a]" style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Nouveau profil
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text className="text-sm text-zinc-500">Annuler</Text>
            </Pressable>
          </View>

          <View className="mt-8 flex-row items-center gap-5">
            <View
              className="h-20 w-20 items-center justify-center rounded-3xl"
              style={{ backgroundColor: `${color}26`, borderColor: color, borderWidth: 2 }}
            >
              <Text className="text-4xl">{avatar}</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Prénom"
              placeholderTextColor="#71717a"
              maxLength={20}
              autoFocus
              className="flex-1 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-lg font-semibold text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </View>

          <Text className="mt-8 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Avatar
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAvatar(a)}
                className={
                  avatar === a
                    ? 'h-11 w-11 items-center justify-center rounded-xl bg-zinc-200 dark:bg-white/15'
                    : 'h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/5'
                }
              >
                <Text className="text-2xl">{a}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-8 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Couleur
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                className="h-10 w-10 rounded-full"
                style={{
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: '#ffffff',
                }}
              />
            ))}
          </View>

          {error ? <Text className="mt-6 text-center text-sm text-red-500">{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={saving}
            className="mt-8 flex-row items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-4 dark:bg-zinc-100"
            style={saving ? { opacity: 0.5 } : undefined}
          >
            {saving ? <ActivityIndicator size="small" /> : null}
            <Text className="font-semibold text-zinc-100 dark:text-zinc-900">Créer le profil</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
