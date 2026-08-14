import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { House, Loader2, Smartphone, Tablet, Monitor, Tv } from 'lucide-react';
import type { UserDeviceType } from '@trano/shared';
import { api } from '../../lib/api';
import { createDeviceId, detectDevice, type DetectedDevice } from '../../lib/deviceInfo';
import { useProfileStore } from '../../core/store/useProfileStore';
import { useRoomsStore } from '../../core/store/useRoomsStore';
import { cn } from '../../utils';

/**
 * Première connexion d'un appareil inconnu.
 *
 * C'est le seul moment où quelqu'un acceptera de répondre à deux questions sur
 * son téléphone — après, plus jamais. On y demande donc l'essentiel, et rien
 * d'autre : **comment s'appelle cet appareil**, et **à qui il est**.
 *
 * Tout ce que la plateforme sait dire est prérempli ; l'utilisateur corrige.
 * Sur Android et PC la récolte est abondante, sur iPhone elle est presque
 * vide — d'où un écran qui fait valider plutôt que deviner en silence.
 *
 * Répondre « c'est le téléphone d'Argan » sélectionne Argan : on ne repose pas
 * la question juste après dans le sélecteur de profils.
 */

const TYPES: Array<{ id: UserDeviceType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'phone', label: 'Téléphone', icon: Smartphone },
  { id: 'tablet', label: 'Tablette', icon: Tablet },
  { id: 'pc', label: 'Ordinateur', icon: Monitor },
  { id: 'tv', label: 'Télé', icon: Tv },
  { id: 'kiosk', label: 'Écran mural', icon: House },
];

export function DeviceSetup({ onDone }: { onDone: () => void }) {
  const { profiles, loaded, fetchProfiles, setActiveProfile } = useProfileStore();
  const [detected, setDetected] = useState<DetectedDevice | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<UserDeviceType>('phone');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void fetchProfiles();
  }, [loaded, fetchProfiles]);

  useEffect(() => {
    void detectDevice().then((d) => {
      setDetected(d);
      setName(d.suggestedName);
      setType(d.type);
    });
  }, []);

  const rooms = useRoomsStore((r) => r.rooms);
  const fetchRooms = useRoomsStore((r) => r.fetchRooms);
  useEffect(() => { void fetchRooms(); }, [fetchRooms]);

  // La pièce n'est demandée qu'aux écrans qui ne bougent pas. Un téléphone
  // change de pièce dix fois par jour : lui poser la question serait au mieux
  // inutile, au pire une donnée fausse affichée ailleurs.
  const isFixed = type === 'tv' || type === 'kiosk';

  const people = profiles.filter((p) => p.kind !== 'house');
  const house = profiles.find((p) => p.kind === 'house');

  const save = async () => {
    if (!name.trim()) return setError("Donnez un nom à cet appareil");
    if (!ownerId) return setError('Dites à qui il appartient');
    setSaving(true);
    setError(null);
    try {
      await api.userDevices.register({
        id: createDeviceId(),
        name: name.trim(),
        profileId: ownerId,
        type,
        roomId: isFixed ? roomId : null,
        platform: detected?.platform ?? null,
        model: detected?.model ?? null,
        osVersion: detected?.osVersion ?? null,
      });
      // L'appareil connaît son propriétaire : inutile de redemander « qui
      // est-ce ? » à l'écran suivant.
      setActiveProfile(ownerId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'enregistrement a échoué");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bienvenue
        </h1>
        <p className="mt-2 text-zinc-500">
          Deux questions, une seule fois, pour que la maison sache reconnaître cet appareil.
        </p>

        <label className="block mt-8">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Comment s'appelle cet appareil ?
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="iPhone de la cuisine…"
            className="mt-2 w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
          />
          {detected?.model && (
            <span className="mt-1 block text-xs text-zinc-500">Détecté : {detected.model}</span>
          )}
        </label>

        <div className="mt-6">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Qu'est-ce que c'est ?
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setType(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors',
                  type === id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-transparent'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {isFixed && (
          <div className="mt-6">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Dans quelle pièce est-il ?
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Facultatif — un écran qui sait où il est peut ouvrir sur ce qui l'entoure.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRoomId(roomId === r.id ? null : r.id)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl border text-sm transition-colors',
                    roomId === r.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-transparent'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400',
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">À qui est-il ?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setOwnerId(p.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors',
                  ownerId === p.id ? 'border-transparent text-zinc-900 dark:text-zinc-100' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400',
                )}
                style={ownerId === p.id ? { backgroundColor: `${p.color}2e`, borderColor: p.color } : undefined}
              >
                <span className="text-lg">{p.avatar}</span>
                {p.name}
              </button>
            ))}
          </div>
          {house && (
            <button
              onClick={() => setOwnerId(house.id)}
              className={cn(
                'mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed text-left transition-colors',
                ownerId === house.id
                  ? 'border-zinc-500 text-zinc-900 dark:text-zinc-100'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-zinc-500',
              )}
            >
              <House className="w-5 h-5 shrink-0" />
              <span className="text-sm">
                <span className="font-semibold block">À personne, c'est un écran partagé</span>
                <span className="text-xs">Tablette murale, télé — il ne dira jamais qui est là</span>
              </span>
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 disabled:opacity-50 transition-opacity"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          C'est parti
        </button>
      </motion.div>
    </div>
  );
}
