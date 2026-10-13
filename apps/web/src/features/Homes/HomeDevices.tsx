import { useEffect, useState } from 'react';
import { Heart, Lightbulb, Power, RefreshCw, ArrowUpRight, Speaker, Blinds, Fan } from 'lucide-react';
import { useHomeStore } from '../../core/store/useHomeStore';
import { useActiveProfile, useProfileStore } from '../../core/store/useProfileStore';
import { homeRequest } from '../../lib/api';

interface Device {
  entity_id: string; nom: string; etat: string; piece: string | null;
  lumiere?: { reglable: boolean; luminosite_pct: number | null; couleur: boolean; hs: [number, number] | null; blanc_reglable?: boolean; kelvin?: number | null; kelvin_min?: number; kelvin_max?: number } | null;
}
interface House { appareils: Device[]; favorite_ids: string[]; refresh_seconds: number }

export function HomeDevices() {
  const { homeId, homes } = useHomeStore();
  const home = homes.find(home => home.id === homeId);
  const profile = useActiveProfile();
  const [house, setHouse] = useState<House | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [candidates, setCandidates] = useState<Device[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const chooseDevices = async () => {
    setAssigning(true); setCandidates(null);
    setSelectedIds(home?.entityIds ?? []);
    try { setCandidates(await homeRequest<Device[]>(`/api/homes/${homeId}/candidates`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Connexion indisponible.'); }
  };
  const saveDevices = async () => {
    setPending(true);
    try {
      await homeRequest(`/api/homes/${homeId}/devices`, { method: 'PUT', body: JSON.stringify({ entityIds: selectedIds }) });
      await useHomeStore.getState().fetchHomes();
      setAssigning(false); setError(null); setRevision(r => r + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Affectation impossible.'); }
    finally { setPending(false); }
  };
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const next = await homeRequest<House>(`/api/house?profile=${encodeURIComponent(profile?.id ?? '')}`);
        if (live) { setHouse(next); setError(null); }
      } catch (e) { if (live) { setHouse(null); setError(e instanceof Error ? e.message : 'Trano injoignable.'); } }
    };
    void load();
    const timer = setInterval(load, home?.provider === 'tuya' ? 120_000 : 10_000);
    return () => { live = false; clearInterval(timer); };
  }, [homeId, profile?.id, revision, home?.provider]);
  const command = async (path: string, data: unknown, method = 'POST') => {
    setPending(true);
    try { await homeRequest(path, { method, body: JSON.stringify(data) }); setError(null); setRevision(r => r + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Commande refusée.'); }
    finally { setPending(false); }
  };
  return <div className="max-w-5xl mx-auto pb-20">
    <header className="flex items-start justify-between gap-4 mb-10">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Votre logement</p>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{home?.name ?? 'Logement inconnu'}</h1>
        <p className="mt-3 text-zinc-500 max-w-lg">Les appareils et les courses de ce logement, réunis avec votre famille.</p>
      </div>
      <button onClick={() => setRevision(r => r + 1)} aria-label="Actualiser les appareils" className="p-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-amber-500"><RefreshCw size={18} /></button>
    </header>
    {home?.provider === 'ha' && homeId !== 'main' && <div className="mb-6">
      <button onClick={chooseDevices} className="text-sm text-zinc-600 dark:text-zinc-300 underline underline-offset-4">Choisir les appareils de ce logement</button>
      {assigning && <section className="mt-4 max-w-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-medium dark:text-zinc-100">Quels appareils sont ici ?</h2>
        <p className="text-sm text-zinc-500 mt-2">Choisissez uniquement ceux de {home.name}. Ils seront retirés de la maison familiale dans Trano.</p>
        {!candidates && <p className="text-sm text-zinc-500 mt-4">{error ?? 'Recherche dans Home Assistant…'}</p>}
        {candidates?.map(device => <label key={device.entity_id} className="flex gap-3 items-center py-3 border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"><input type="checkbox" checked={selectedIds.includes(device.entity_id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, device.entity_id] : ids.filter(id => id !== device.entity_id))} className="accent-amber-500" /><span className="min-w-0 break-words">{device.nom}</span></label>)}
        <div className="flex gap-3 mt-5"><button disabled={pending || !candidates} onClick={saveDevices} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-40">Enregistrer</button><button onClick={() => setAssigning(false)} className="px-4 py-2 text-zinc-500">Annuler</button></div>
      </section>}
    </div>}
    {!home?.configured && home?.provider === 'ha' ? <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8 max-w-2xl">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Retrouver les appareils de l’appartement</h2>
      <p className="text-zinc-600 dark:text-zinc-400 mt-4 leading-relaxed">Le Home Assistant familial peut piloter les appareils Tuya à distance. Sélectionnez ci-dessus les appareils déjà reliés, même s’ils sont maintenant sur le Wi-Fi de l’appartement.</p>
      <p className="text-sm text-zinc-500 mt-3">Si un appareil manque, ajoutez son compte Tuya Smart dans l’intégration Tuya du Home Assistant familial. Les courses restent accessibles pendant la connexion.</p>
    </section> : !home?.configured ? <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8 max-w-2xl">
      <div className="flex items-center gap-3 text-amber-500"><Lightbulb size={24} /><h2 className="text-xl font-semibold">{home?.provider === 'tuya' ? 'Connecter Tuya Smart' : 'Connecter ce logement'}</h2></div>
      <p className="text-zinc-600 dark:text-zinc-400 mt-4 leading-relaxed">Vos courses sont déjà disponibles. Pour retrouver les appareils de l’appartement, autorisez votre compte Tuya Smart et choisissez les appareils qui appartiennent à ce logement.</p>
      <p className="text-zinc-500 mt-3 text-sm">La connexion passe par le cloud Tuya : aucun Home Assistant à installer ici. L’activation se termine avec l’administrateur de Trano.</p>
      <a href="https://platform.tuya.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium">Ouvrir Tuya <ArrowUpRight size={16} /></a>
    </section> : <>
      {error && <p role="alert" className="mb-6 text-amber-600 dark:text-amber-300">{error}</p>}
      {!house && !error && <p className="text-zinc-500">Chargement des appareils…</p>}
      {house && <>
        <div className="flex justify-between gap-3 items-baseline mb-4"><h2 className="text-lg font-medium dark:text-zinc-100">Appareils · {house.appareils.length}</h2><span className="text-xs text-zinc-500">{home.provider === 'tuya' ? 'Actualisation toutes les 2 min' : 'État du logement'}</span></div>
        {!house.appareils.length && <p className="text-zinc-500 py-8 border-t border-zinc-200 dark:border-zinc-800">Aucun appareil compatible affecté à ce logement.</p>}
        <div className="grid items-start sm:grid-cols-2 xl:grid-cols-3 gap-4">{house.appareils.map(device => {
          const domain = device.entity_id.split('.')[0];
          const on = ['on', 'open', 'playing'].includes(device.etat), offline = ['unavailable', 'unknown'].includes(device.etat);
          const readonly = domain === 'media_player';
          const Icon = domain === 'light' ? Lightbulb : domain === 'cover' ? Blinds : domain === 'fan' ? Fan : readonly ? Speaker : Power;
          const favorite = house.favorite_ids.includes(device.entity_id);
          const favorites = favorite ? house.favorite_ids.filter(id => id !== device.entity_id) : [...house.favorite_ids, device.entity_id];
          const toggleFavorite = () => {
            if (homeId !== 'main') return command(`/api/homes/${homeId}/favorites`, { profileId: profile?.id, favorites }, 'PUT');
            if (!profile) return;
            setPending(true);
            void useProfileStore.getState().updateProfile(profile.id, { favorites })
              .then(() => setRevision(r => r + 1)).catch(e => setError(e instanceof Error ? e.message : 'Favori non enregistré.'))
              .finally(() => setPending(false));
          };
          return <section key={device.entity_id} className="min-w-0 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5">
            <div className="flex gap-3 items-center"><Icon size={22} className={on ? 'text-amber-500' : 'text-zinc-500'} /><div className="flex-1 min-w-0"><h3 className="font-medium text-zinc-900 dark:text-zinc-100 break-words">{device.nom}</h3><p className="text-sm text-zinc-500 mt-1">{offline ? 'Hors ligne' : domain === 'cover' ? on ? 'Ouvert' : 'Fermé' : readonly ? on ? 'En lecture' : 'En veille' : on ? 'Allumé' : 'Éteint'}</p></div>
              <button aria-label={favorite ? `Retirer ${device.nom} des favoris` : `Ajouter ${device.nom} aux favoris`} disabled={pending || !profile} onClick={toggleFavorite} className="p-2 text-zinc-500 disabled:opacity-40"><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button></div>
            {!readonly && <button disabled={pending || offline} onClick={() => command('/api/house/device', { entity_id: device.entity_id, action: on ? 'turn_off' : 'turn_on' })} className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"><Power size={16} />{domain === 'cover' ? on ? 'Fermer' : 'Ouvrir' : on ? 'Éteindre' : 'Allumer'}</button>}
            {on && device.lumiere?.reglable && <label className="block text-sm text-zinc-500 mt-5">Intensité<input aria-label={`Intensité de ${device.nom}`} type="range" min="1" max="100" defaultValue={device.lumiere.luminosite_pct ?? 100} key={`${revision}:${device.lumiere.luminosite_pct}`} disabled={pending} onPointerUp={e => command('/api/house/light', { entity_id: device.entity_id, brightness_pct: Number(e.currentTarget.value) })} onKeyUp={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) void command('/api/house/light', { entity_id: device.entity_id, brightness_pct: Number(e.currentTarget.value) }); }} className="block w-full mt-3 accent-amber-500" /></label>}
            {on && device.lumiere?.blanc_reglable && <label className="block text-sm text-zinc-500 mt-5">Blanc chaud · blanc froid<input aria-label={`Température du blanc de ${device.nom}`} type="range" min={device.lumiere.kelvin_min ?? 2200} max={device.lumiere.kelvin_max ?? 6500} defaultValue={device.lumiere.kelvin ?? device.lumiere.kelvin_min ?? 2200} key={`${revision}:${device.lumiere.kelvin}`} disabled={pending} onPointerUp={e => command('/api/house/light', { entity_id: device.entity_id, kelvin: Number(e.currentTarget.value) })} onKeyUp={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) void command('/api/house/light', { entity_id: device.entity_id, kelvin: Number(e.currentTarget.value) }); }} className="block w-full mt-3 accent-amber-500" /></label>}
            {on && device.lumiere?.couleur && <div className="flex flex-wrap gap-2 mt-5">{[0, 35, 140, 210, 280, 330].map(h => <button key={h} aria-label={`Teinte ${h}° pour ${device.nom}`} disabled={pending} onClick={() => command('/api/house/light', { entity_id: device.entity_id, hs_color: [h, 100] })} className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: `hsl(${h},80%,55%)` }} />)}</div>}
          </section>;
        })}</div>
      </>}
    </>}
  </div>;
}
