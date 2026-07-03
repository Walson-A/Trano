import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Profile } from '@trano/shared';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { useProfileStore } from '../../core/store/useProfileStore';
import { ProfileEditor } from './ProfileEditor';
import { cn } from '../../utils';

/**
 * Écran de sélection de profil façon Netflix, affiché au lancement
 * tant qu'aucun profil n'est actif sur cet appareil.
 */
export function ProfileGate() {
  const { profiles, loaded, error, setActiveProfile, fetchProfiles } = useProfileStore();
  const [manageMode, setManageMode] = useState(false);
  const [editorState, setEditorState] = useState<{ open: boolean; profile: Profile | null }>({
    open: false,
    profile: null,
  });

  const openEditor = (profile: Profile | null) =>
    setEditorState({ open: true, profile });

  const handleTileClick = (profile: Profile) => {
    if (manageMode) {
      openEditor(profile);
    } else {
      setActiveProfile(profile.id);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-zinc-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center w-full max-w-3xl"
      >
        <h1 className="text-3xl sm:text-5xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mb-3">
          Qui est-ce ?
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-10 sm:mb-14">
          {manageMode ? 'Touchez un profil pour le modifier' : 'Choisissez votre profil'}
        </p>

        {!loaded && (
          <p className="text-zinc-500 animate-pulse">Chargement des profils…</p>
        )}

        {loaded && error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              Impossible de joindre le serveur Trano.
            </p>
            <p className="text-sm text-zinc-600">{error}</p>
            <button
              onClick={fetchProfiles}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-semibold hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        )}

        {loaded && !error && (
          <>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
              {profiles.map((profile, index) => (
                <motion.button
                  key={profile.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.06 }}
                  onClick={() => handleTileClick(profile)}
                  className="group flex flex-col items-center gap-3 w-28 sm:w-36"
                >
                  <div className="relative">
                    <div
                      className={cn(
                        'w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl transition-all duration-200',
                        'group-hover:scale-105 group-active:scale-95',
                        manageMode && 'opacity-60'
                      )}
                      style={{
                        backgroundColor: `${profile.color}1f`,
                        border: `2px solid ${profile.color}`,
                      }}
                    >
                      {profile.avatar}
                    </div>
                    {manageMode && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900/80 dark:bg-zinc-100/90 flex items-center justify-center">
                          <Pencil className="w-5 h-5 text-zinc-100 dark:text-zinc-900" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors truncate max-w-full">
                    {profile.name}
                  </span>
                </motion.button>
              ))}

              {/* Ajouter un profil */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: profiles.length * 0.06 }}
                onClick={() => openEditor(null)}
                className="group flex flex-col items-center gap-3 w-28 sm:w-36"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center transition-all duration-200 group-hover:border-zinc-500 group-hover:scale-105 group-active:scale-95">
                  <Plus className="w-10 h-10 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors" />
                </div>
                <span className="font-semibold text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                  Ajouter
                </span>
              </motion.button>
            </div>

            {profiles.length > 0 && (
              <button
                onClick={() => setManageMode(!manageMode)}
                className={cn(
                  'mt-12 sm:mt-16 px-8 py-3 rounded-2xl font-medium transition-all',
                  manageMode
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                    : 'border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-500'
                )}
              >
                {manageMode ? 'Terminé' : 'Gérer les profils'}
              </button>
            )}
          </>
        )}
      </motion.div>

      {editorState.open && (
        <ProfileEditor
          isOpen={editorState.open}
          profile={editorState.profile}
          onClose={() => setEditorState({ open: false, profile: null })}
        />
      )}
    </div>
  );
}
