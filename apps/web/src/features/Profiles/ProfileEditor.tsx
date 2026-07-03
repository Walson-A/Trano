import React, { useState } from 'react';
import type { Profile } from '@trano/shared';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../ui/Modal/Modal';
import { useProfileStore } from '../../core/store/useProfileStore';
import { ROOMS, getRoomsByFloor } from '../../config/rooms';
import { cn } from '../../utils';

const AVATARS = [
  '😀', '😎', '🥰', '🤗', '😜', '🧐', '🥳', '😴',
  '🦁', '🐼', '🦊', '🐸', '🦄', '🐙', '🦖', '🐣',
  '👑', '🚀', '🎮', '🎸', '⚽', '🌸', '🌙', '⭐',
];

const COLORS = [
  '#f59e0b', '#ef4444', '#ec4899', '#a855f7',
  '#6366f1', '#0ea5e9', '#10b981', '#84cc16',
];

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = création d'un nouveau profil */
  profile: Profile | null;
}

export function ProfileEditor({ isOpen, onClose, profile }: ProfileEditorProps) {
  const { createProfile, updateProfile, deleteProfile } = useProfileStore();

  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [color, setColor] = useState(profile?.color ?? COLORS[0]);
  const [roomIds, setRoomIds] = useState<string[]>(profile?.roomIds ?? []);
  const [isKid, setIsKid] = useState(profile?.isKid ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRoom = (roomId: string) => {
    setRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((r) => r !== roomId) : [...prev, roomId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Il faut un prénom !');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (profile) {
        await updateProfile(profile.id, { name, avatar, color, roomIds, isKid });
      } else {
        await createProfile({ name, avatar, color, roomIds, isKid });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await deleteProfile(profile.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={profile ? 'Modifier le profil' : 'Nouveau profil'}>
      <div className="flex flex-col gap-8">
        {/* Aperçu + nom */}
        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shrink-0"
            style={{ backgroundColor: `${color}26`, border: `2px solid ${color}` }}
          >
            {avatar}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom"
            maxLength={20}
            autoFocus
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-lg font-semibold text-white placeholder-zinc-500 outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Avatar */}
        <div>
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Avatar</p>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={cn(
                  'aspect-square rounded-xl flex items-center justify-center text-2xl transition-all',
                  avatar === a
                    ? 'bg-white/15 ring-2 ring-white/60 scale-110'
                    : 'bg-white/5 hover:bg-white/10'
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Couleur */}
        <div>
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Couleur</p>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-10 h-10 rounded-full transition-all',
                  color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'hover:scale-105'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Pièces attitrées */}
        <div>
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1">Pièces attitrées</p>
          <p className="text-xs text-zinc-500 mb-3">
            Souvent la chambre — plusieurs personnes peuvent partager une pièce.
          </p>
          {(['RDC', 'Étage'] as const).map((floor) => (
            <div key={floor} className="mb-3">
              <p className="text-xs text-zinc-500 mb-2">{floor}</p>
              <div className="flex flex-wrap gap-2">
                {getRoomsByFloor(floor).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                      roomIds.includes(room.id)
                        ? 'text-zinc-900'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    )}
                    style={roomIds.includes(room.id) ? { backgroundColor: color } : undefined}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Profil enfant */}
        <button
          onClick={() => setIsKid(!isKid)}
          className="flex items-center justify-between bg-white/5 rounded-2xl px-5 py-4 hover:bg-white/10 transition-colors"
        >
          <div className="text-left">
            <p className="font-semibold text-white">Profil enfant</p>
            <p className="text-xs text-zinc-500">Interface simplifiée, sans gestion des profils</p>
          </div>
          <div
            className={cn(
              'w-12 h-7 rounded-full transition-colors relative shrink-0',
              isKid ? 'bg-emerald-500' : 'bg-zinc-700'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-all',
                isKid ? 'left-6' : 'left-1'
              )}
            />
          </div>
        </button>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          {profile && (
            <button
              onClick={() => (confirmDelete ? handleDelete() : setConfirmDelete(true))}
              disabled={saving}
              className={cn(
                'px-5 py-4 rounded-2xl font-semibold transition-all flex items-center gap-2',
                confirmDelete
                  ? 'bg-red-500 text-white'
                  : 'bg-white/5 text-red-400 hover:bg-red-500/10'
              )}
            >
              <Trash2 className="w-5 h-5" />
              {confirmDelete ? 'Confirmer ?' : ''}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 rounded-2xl bg-white text-zinc-900 font-bold text-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : profile ? 'Enregistrer' : 'Créer le profil'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
