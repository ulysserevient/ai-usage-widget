# Journal des Interventions

## [2026-11-23] Ajout du fournisseur `agy` (Antigravity CLI) en backend
- **Action** : Ajout de l'adaptateur `backend/adapters/agy.js`, du pilote PTY `backend/agyPty.js`, du parseur `parseAgyUsage` dans `backend/parser.js`, enregistrement dans `backend/detector.js`, `backend/executor.js`, `backend/model.js`, `backend/providerState.js`, `backend/cliFailure.js`, et ajout des tests unitaires.
- **Statut** : Implémenté et validé via `npm test`.

## [2026-11-23] Initialisation du fork et mise en place de la gouvernance
- **Action** : Rapatriement de la branche `origin/master` depuis `https://github.com/ulysserevient/ai-usage-widget` (v0.1.22), ajout des fichiers de gouvernance manquants (`RULES.md`, `CONTEXT.md`, `INFRASTRUCTURE.md`, `JOURNAL.md`, `.env.example`), mise à jour de `.gitignore` (`.env`, `secrets.yaml`) et validation des tests unitaires (`npm test`, 41/41 passés).
- **Statut** : Opérationnel et prêt pour le développement.
