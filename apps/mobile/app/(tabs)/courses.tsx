import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  Apple,
  Check,
  Gamepad2,
  Home as HomeIcon,
  Package,
  Plus,
  Repeat,
  Shirt,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import {
  SHOPPING_CATEGORIES,
  SHOPPING_CATEGORY_LABELS,
  type ShoppingCategory,
} from '@trano/shared';
import { Screen } from '@/components/Screen';
import { useShopping } from '@/features/shopping/store';
import { useProfiles } from '@/features/profiles/store';

/**
 * La liste de courses.
 *
 * L'écran est volontairement plus court que celui du web : dans une allée de
 * supermarché, on fait deux gestes — **ajouter** et **cocher**. Les filtres par
 * catégorie du web n'ont pas été repris ; sur un pouce, faire défiler est plus
 * rapide que choisir un filtre.
 *
 * Ce qui est gardé et qui compte : la catégorie (elle range la liste dans
 * l'ordre du magasin), la récurrence, et **qui a ajouté quoi** — c'est ce qui
 * fait qu'on ne rachète pas ce que quelqu'un vient de prendre.
 */

const CATEGORY_ICONS: Record<
  ShoppingCategory,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  alimentaire: Apple,
  maison: HomeIcon,
  hygiene: Sparkles,
  vetements: Shirt,
  loisirs: Gamepad2,
  autre: Package,
};

const RECURRENCES = [
  { label: 'Une fois', days: null },
  { label: 'Chaque semaine', days: 7 },
  { label: 'Chaque mois', days: 30 },
] as const;

export default function Courses() {
  const { items, loaded, error, refresh, add, toggle, remove } = useShopping();
  const profiles = useProfiles((s) => s.profiles);
  const fetchProfiles = useProfiles((s) => s.fetch);
  const ownerId = useProfiles((s) => s.ownerId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('alimentaire');
  const [recurrenceDays, setRecurrenceDays] = useState<number | null>(null);
  const [showBought, setShowBought] = useState(false);

  useEffect(() => {
    void refresh();
    if (profiles.length === 0) void fetchProfiles();
  }, [refresh, fetchProfiles, profiles.length]);

  const profileById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const todo = items.filter((i) => i.status === 'todo');
  const bought = items.filter((i) => i.status === 'bought');

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setTitle('');
    await add({ title: t, category, authorId: ownerId, recurrenceDays });
    setRecurrenceDays(null);
  };

  return (
    <Screen
      title="Courses"
      subtitle={todo.length > 0 ? `${todo.length} à prendre` : 'Rien à prendre'}
    >
      {/* Ajout en tête : c'est le geste le plus fréquent, il ne doit jamais
          demander de faire défiler. */}
      <View className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/5 dark:bg-zinc-900/60">
        <View className="flex-row items-center gap-2">
          <TextInput
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="Ajouter un article…"
            placeholderTextColor="#71717a"
            className="flex-1 text-zinc-900 dark:text-zinc-100"
          />
          <Pressable
            onPress={submit}
            className="h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100"
          >
            <Plus size={18} color="#71717a" />
          </Pressable>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {SHOPPING_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const on = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={
                  on
                    ? 'flex-row items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 dark:bg-zinc-100'
                    : 'flex-row items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-white/5'
                }
              >
                <Icon size={13} color={on ? undefined : '#71717a'} />
                <Text
                  className={
                    on ? 'text-xs text-zinc-100 dark:text-zinc-900' : 'text-xs text-zinc-500'
                  }
                >
                  {SHOPPING_CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {RECURRENCES.map((r) => {
            const on = recurrenceDays === r.days;
            return (
              <Pressable
                key={r.label}
                onPress={() => setRecurrenceDays(r.days)}
                className={
                  on
                    ? 'flex-row items-center gap-1.5 rounded-lg border border-sky-500 px-2.5 py-1.5'
                    : 'rounded-lg border border-zinc-200 px-2.5 py-1.5 dark:border-white/10'
                }
              >
                {r.days ? <Repeat size={12} color="#71717a" /> : null}
                <Text className={on ? 'text-xs text-sky-500' : 'text-xs text-zinc-500'}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <Text className="mt-4 text-sm text-amber-500">{error}</Text> : null}

      {!loaded ? (
        <Text className="mt-6 text-sm text-zinc-500">Chargement…</Text>
      ) : todo.length === 0 ? (
        <View className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-5 py-8 dark:border-zinc-800">
          <Text className="text-center text-sm text-zinc-500">
            La liste est vide. Tout est à la maison.
          </Text>
        </View>
      ) : (
        <View className="mt-6 gap-2">
          {todo.map((item) => {
            const Icon = CATEGORY_ICONS[item.category] ?? Package;
            const author = item.authorId ? profileById[item.authorId] : null;
            return (
              <View
                key={item.id}
                className="flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-zinc-900/60"
              >
                {/* La case est la plus grande cible de la ligne : c'est le
                    geste qu'on fait d'une main, l'autre poussant le caddie. */}
                <Pressable
                  onPress={() => void toggle(item, ownerId)}
                  hitSlop={10}
                  className="h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-300 dark:border-zinc-600"
                />
                <Icon size={16} color="#71717a" />
                <View className="flex-1">
                  <Text className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.title}
                    {item.quantity ? (
                      <Text className="text-zinc-500"> · {item.quantity}</Text>
                    ) : null}
                  </Text>
                  <Text className="text-[11px] text-zinc-500">
                    {[
                      SHOPPING_CATEGORY_LABELS[item.category],
                      author ? `${author.avatar} ${author.name}` : null,
                      item.recurrenceDays ? `tous les ${item.recurrenceDays} j` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Pressable onPress={() => void remove(item.id)} hitSlop={8}>
                  <Trash2 size={16} color="#71717a" />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {bought.length > 0 ? (
        <View className="mt-8">
          <Pressable onPress={() => setShowBought(!showBought)}>
            <Text className="text-sm text-zinc-500">
              {showBought ? '▾' : '▸'} Déjà pris ({bought.length})
            </Text>
          </Pressable>
          {showBought ? (
            <View className="mt-3 gap-2">
              {bought.map((item) => {
                const by = item.boughtBy ? profileById[item.boughtBy] : null;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => void toggle(item, ownerId)}
                    className="flex-row items-center gap-3 rounded-2xl border border-dashed border-zinc-200 px-4 py-3 dark:border-zinc-800"
                  >
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500">
                      <Check size={14} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-zinc-500 line-through">{item.title}</Text>
                      {by ? (
                        <Text className="text-[11px] text-zinc-500">
                          pris par {by.avatar} {by.name}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
