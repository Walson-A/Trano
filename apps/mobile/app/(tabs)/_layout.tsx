import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, LayoutGrid, Map, Settings, ShoppingCart, Zap } from 'lucide-react-native';

/**
 * Les mêmes six destinations que le web, dans le même ordre — c'est déjà la
 * barre du bas qu'affiche le site sur téléphone (`Sidebar.tsx`, bloc
 * `md:hidden`). Personne n'a à réapprendre l'app en passant de l'une à l'autre.
 *
 * Une différence assumée : le web masque les Réglages sur le profil « Maison »,
 * celui des écrans partagés. Ici il n'y a pas d'écran partagé — un téléphone
 * appartient à quelqu'un — donc l'onglet reste toujours là.
 */
export default function TabsLayout() {
  const dark = useColorScheme() === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? '#f4f4f5' : '#18181b',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: dark ? '#0a0a0a' : '#f4f4f5',
          borderTopColor: dark ? 'rgba(255,255,255,0.06)' : '#e4e4e7',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Home size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <Map size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="pieces"
        options={{
          title: 'Pièces',
          tabBarIcon: ({ color }) => <LayoutGrid size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <ShoppingCart size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="energie"
        options={{ title: 'Énergie', tabBarIcon: ({ color }) => <Zap size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
