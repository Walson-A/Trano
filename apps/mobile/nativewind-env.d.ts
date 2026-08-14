/// <reference types="nativewind/types" />

// `expo/types` déclare entre autres `*.css`, sans quoi l'import de `global.css`
// dans `app/_layout.tsx` ne compile pas. Expo écrit la même référence dans un
// `expo-env.d.ts` généré — mais seulement au premier `expo start`, donc absent
// d'un dépôt fraîchement cloné, où `npm run lint` échouerait sans raison
// visible. La référence est dupliquée ici : c'est sans effet de bord, et le
// contrôle de types marche dès le clone.
/// <reference types="expo/types" />
