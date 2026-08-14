import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Le cadre commun à tous les écrans : fond, marges, encoche.
 *
 * `useSafeAreaInsets` plutôt que `SafeAreaView` : seul le haut doit être écarté
 * ici — le bas est déjà occupé par la barre d'onglets, qui gère sa propre marge.
 */
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-[#0a0a0a]" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </Text>
        {subtitle ? <Text className="mt-1 text-sm text-zinc-500">{subtitle}</Text> : null}
        <View className="mt-6">{children}</View>
      </ScrollView>
    </View>
  );
}

/** Onglet dont l'écran n'est pas encore repris du web. */
export function ToCome({ what }: { what: string }) {
  return (
    <View className="rounded-2xl border border-dashed border-zinc-300 px-5 py-8 dark:border-zinc-800">
      <Text className="text-center text-sm text-zinc-500">{what}</Text>
    </View>
  );
}
