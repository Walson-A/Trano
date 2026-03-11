# Trano - Home Assistant Dashboard 🏡⚡

Trano est un tableau de bord domotique moderne, pensé spécifiquement pour une utilisation sur tablette. Il se connecte en temps réel à une instance Home Assistant locale.

## 🎯 Aperçu
- **Design "Tesla-like"** : Premium, minimaliste, centré sur le Glassmorphism et pensé pour le tactile.
- **Dark / Light Mode** : Réactif et contrasté pour un confort visuel optimal de jour comme de nuit.
- **Performances** : Application React (Single Page Application) ultra-rapide connectée directement en WebSocket au serveur HA.

---

## 📚 Documentation pour les Développeurs

Si vous êtes un développeur (ou une IA) contribuant à ce projet, **merci de lire les documents présents dans le dossier `docs/` avant d'ajouter ou de modifier du code.**

*   [Documentation d'Architecture (Feature-Sliced Design)](docs/architecture.md) : Comment les fichiers et dossiers doivent être structurés.
*   [Guidelines de Design](docs/design_concept.md) : Couleurs racines, typographie et ressentis UI/UX attendus pour l'application.

---

## 🚀 Lancer le projet localement

1. Cloner ou télécharger le dépôt.
2. Créer un fichier `.env.local` à la racine basé sur les clés suivantes :
```env
VITE_HA_URL=ws://[IP_HOME_ASSISTANT]:8123/api/websocket
VITE_HA_TOKEN=eyJhbGciOiJIUzI1NiI... (Générez un jeton de longue durée depuis HA)
```
3. Installer les dépendances :
```bash
npm install
```
4. Démarrer le serveur de développement :
```bash
npm run dev
```
