import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Monitor, Plus, Smartphone, Tablet, Tv } from 'lucide-react-native';
import type { Room, UserDeviceType } from '@trano/shared';
import { getApi } from '@/lib/server';
import { createDeviceId } from '@/lib/deviceId';
import { detectDevice, type DetectedDevice } from '@/lib/deviceInfo';
import { useProfiles } from '@/features/profiles/store';
import { ProfileCreator } from '@/features/profiles/ProfileCreator';

/**
 * Première connexion d'un appareil inconnu — le portage de
 * `apps/web/src/features/Devices/DeviceSetup.tsx`.
 *
 * C'est le seul moment où quelqu'un acceptera de répondre à des questions sur
 * son téléphone : après, plus jamais. On demande donc l'essentiel et rien
 * d'autre — **comment s'appelle cet appareil**, et **à qui il est**.
 *
 * Sans cet écran, rien ne marche : « qui est là » n'a aucune source, et
 * l'interphone ne peut désigner personne.
 */

const TYPES: Array<{
  id: UserDeviceType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { id: 'phone', label: 'Téléphone', icon: Smartphone },
  { id: 'tablet', label: 'Tablette', icon: Tablet },
  { id: 'pc', label: 'Ordinateur', icon: Monitor },
  { id: 'tv', label: 'Télé', icon: Tv },
  { id: 'kiosk', label: 'Écran mural', icon: House },
];

export function DeviceSetup({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetch);
  const setOwner = useProfiles((s) => s.setOwner);

  const [detected, setDetected] = useState<DetectedDevice | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<UserDeviceType>('phone');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = detectDevice();
    setDetected(d);
    setName(d.suggestedName);
    setType(d.type);
    void fetchProfiles();
    // Les pièces ne servent qu'aux appareils fixes ; on les charge quand même
    // tout de suite, la liste est minuscule et l'écran ne doit pas hoqueter.
    getApi()
      .rooms.list()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [fetchProfiles]);

  // La pièce est demandée à tout sauf aux téléphones. Un PC de bureau, une
  // télé, une tablette murale sont quelque part et y restent ; le téléphone
  // change de pièce dix fois par jour — lui poser la question donnerait au
  // mieux rien, au pire une donnée fausse affichée ailleurs.
  const isFixed = type !== 'phone';
  const people = profiles.filter((p) => p.kind !== 'house');
  const house = profiles.find((p) => p.kind === 'house');

  const save = async () => {
    if (!name.trim()) return setError("Donnez un nom à cet appareil");
    if (!ownerId) return setError('Dites à qui il appartient');
    setSaving(true);
    setError(null);
    try {
      const id = await createDeviceId();
      await getApi().userDevices.register({
        id,
        name: name.trim(),
        profileId: ownerId,
        type,
        roomId: isFixed ? roomId : null,
        platform: detected?.platform ?? null,
        model: detected?.model ?? null,
        osVersion: detected?.osVersion ?? null,
      });
      await setOwner(ownerId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'enregistrement a échoué");
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-zinc-50 dark:bg-[#0a0a0a]"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Un nouvel appareil détecté
        </Text>
        <Text className="mt-2 text-zinc-500">
          Dites-nous ce que c'est et à qui il est — une seule fois.
        </Text>

        <Text className="mt-8 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Comment s'appelle cet appareil ?
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="iPhone de la cuisine…"
          placeholderTextColor="#71717a"
          className="mt-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {detected?.model ? (
          <Text className="mt-1 text-xs text-zinc-500">Détecté : {detected.model}</Text>
        ) : null}

        <Text className="mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Qu'est-ce que c'est ?
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {TYPES.map(({ id, label, icon: Icon }) => {
            const on = type === id;
            return (
              <Pressable
                key={id}
                onPress={() => setType(id)}
                className={
                  on
                    ? 'flex-row items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 dark:bg-zinc-100'
                    : 'flex-row items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-zinc-900'
                }
              >
                <Icon size={16} color={on ? undefined : '#71717a'} />
                <Text
                  className={
                    on
                      ? 'text-sm text-zinc-100 dark:text-zinc-900'
                      : 'text-sm text-zinc-600 dark:text-zinc-400'
                  }
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isFixed ? (
          <View className="mt-6">
            <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Dans quelle pièce est-il ?
            </Text>
            <Text className="mt-0.5 text-xs text-zinc-500">
              Facultatif — un appareil qui sait où il est peut ouvrir sur ce qui l'entoure.
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {rooms.map((r) => {
                const on = roomId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setRoomId(on ? null : r.id)}
                    className={
                      on
                        ? 'rounded-xl bg-zinc-900 px-3.5 py-2 dark:bg-zinc-100'
                        : 'rounded-xl border border-zinc-200 bg-white px-3.5 py-2 dark:border-white/10 dark:bg-zinc-900'
                    }
                  >
                    <Text
                      className={
                        on
                          ? 'text-sm text-zinc-100 dark:text-zinc-900'
                          : 'text-sm text-zinc-600 dark:text-zinc-400'
                      }
                    >
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text className="mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          À qui est-il ?
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {people.map((p) => {
            const on = ownerId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setOwnerId(p.id)}
                className="flex-row items-center gap-2 rounded-xl border px-4 py-2.5"
                style={
                  on
                    ? { backgroundColor: `${p.color}2e`, borderColor: p.color }
                    : { borderColor: 'rgba(113,113,122,0.3)' }
                }
              >
                <Text className="text-lg">{p.avatar}</Text>
                <Text
                  className={
                    on
                      ? 'text-sm text-zinc-900 dark:text-zinc-100'
                      : 'text-sm text-zinc-600 dark:text-zinc-400'
                  }
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
          {/* C'est le tout premier écran de l'app : quelqu'un dont le profil
              n'existe pas encore serait obligé de prendre celui d'un autre. */}
          <Pressable
            onPress={() => setCreating(true)}
            className="flex-row items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 dark:border-zinc-700"
          >
            <Plus size={16} color="#71717a" />
            <Text className="text-sm text-zinc-500">Nouveau</Text>
          </Pressable>
        </View>

        {house ? (
          <Pressable
            onPress={() => setOwnerId(house.id)}
            className={
              ownerId === house.id
                ? 'mt-3 flex-row items-center gap-3 rounded-xl border border-dashed border-zinc-500 px-4 py-3'
                : 'mt-3 flex-row items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700'
            }
          >
            <House size={20} color="#71717a" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                À personne, c'est un écran partagé
              </Text>
              <Text className="text-xs text-zinc-500">
                Tablette murale, télé — tout le monde s'en sert
              </Text>
            </View>
          </Pressable>
        ) : null}

        {error ? <Text className="mt-4 text-sm text-red-500">{error}</Text> : null}

        <Pressable
          onPress={save}
          disabled={saving}
          className="mt-8 flex-row items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-4 dark:bg-zinc-100"
          style={saving ? { opacity: 0.5 } : undefined}
        >
          {saving ? <ActivityIndicator size="small" /> : null}
          <Text className="font-semibold text-zinc-100 dark:text-zinc-900">C'est parti</Text>
        </Pressable>
      </ScrollView>

      {creating ? (
        <ProfileCreator
          onClose={() => setCreating(false)}
          // Personne ne crée un profil pour choisir quelqu'un d'autre juste
          // après : le nouveau venu est sélectionné d'office.
          onCreated={(p) => {
            setOwnerId(p.id);
            setCreating(false);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
