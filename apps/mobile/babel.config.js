// `jsxImportSource: nativewind` fait passer chaque élément par le compilateur de
// NativeWind : c'est ce qui donne `className` aux composants React Native.
//
// Le greffon Worklets doit rester **le dernier** de la liste : il réécrit les
// fonctions marquées pour le second moteur JavaScript de Reanimated, et doit
// donc voir le code une fois toutes les autres transformations appliquées.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
  };
};
