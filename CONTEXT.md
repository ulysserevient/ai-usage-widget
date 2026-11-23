# Contexte & Objectifs du Projet

## 1. Objectif Global
**AI Usage Widget** (`v0.1.22`, fork de `odrasile/ai-usage-widget`) est une application desktop multiplateforme (macOS, Windows, Ubuntu Desktop) de type widget flottant, sans bordure et toujours au premier plan (`always-on-top`). Elle affiche en quasi temps réel les quotas restants des outils CLI de codage IA installés localement, sans appeler d'API externes ni collecter d'identifiants.

## 2. Composants Principaux
- **Frontend (`src/`, `index.html`, `vite.config.ts`)** : Interface TypeScript + Vite légère (rendu, planificateur de rafraîchissement, i18n EN/ES, pont IPC Tauri).
- **Shell Desktop (`src-tauri/`)** : Application Tauri v2 en Rust (gestion de la fenêtre flottante/transparente, tray icon, single-instance, lancement du backend Node avec `CREATE_NO_WINDOW` sous Windows).
- **Backend Local (`backend/`)** : Modules Node.js (ESM) pour la détection des CLI (`detector.js`), l'exécution sécurisée par liste blanche (`executor.js`), la gestion PTY via `node-pty` (`codexPty.js`, `claudePty.js`, `geminiPty.js`), les adaptateurs/parseurs (`adapters/`, `parser.js`), la machine à états des fournisseurs (`providerState.js`) et le modèle unifié (`model.js`).
- **Scripts de build & preflight (`scripts/`)** : Préparation des ressources Tauri, rendu d'icônes et vérifications préalables.

## 3. Prérequis & Dépendances
- **OS cibles** : Windows, macOS (12.0+), Ubuntu Desktop (WebKitGTK 4.1).
- **Runtime & Build** : Node.js 20+, Rust & Cargo, Tauri CLI v2.10.1.
- **CLIs surveillés (optionnels selon l'environnement)** : `codex`, `claude`, `gemini` (Cursor n'est pas supporté).
- **Dépendances npm clés** : `@tauri-apps/api`, `@tauri-apps/plugin-opener`, `node-pty`, `typescript`, `vite`.

## 4. Contraintes & Règles Spécifiques
- **Zéro appel réseau pour les quotas** : Interrogation exclusive des CLI locaux via `child_process` ou pseudo-terminal (`node-pty`).
- **Liste blanche stricte de commandes** : `where`/`which`, `codex`, `claude`, `gemini`, avec timeout sur chaque exécution.
- **Tolérance aux pannes** : L'échec d'un fournisseur ne doit jamais bloquer le widget ni masquer les autres fournisseurs.
- **Portabilité** : Aucun module Node dans `src/` ; résolution cross-platform du binaire `node` (`MONITORAI_NODE_BIN`, runtime bundlé, `PATH`, chemins standards).
