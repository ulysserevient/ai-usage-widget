# Cartographie Infrastructure & Réseau

## 1. Machines & Nœuds
| Rôle | OS / Host | IP / Subnet | Accès / Port |
| :--- | :--- | :--- | :--- |
| Poste de développement local | Linux (Workspace local) | localhost | Vite dev server `http://127.0.0.1:1420` |
| Runners CI/Release GitHub | `windows-latest`, `ubuntu-latest`, `macos-latest` | GitHub Actions | Workflows `.github/workflows/ci.yml` & `release.yml` |

## 2. Services & Conteneurs
| Service | Image / Stack | Ports exposés | Volumes persistants |
| :--- | :--- | :--- | :--- |
| Frontend Dev (Vite) | Node.js 20+ / Vite 5.4 | `127.0.0.1:1420` | N/A |
| Desktop App (Tauri v2) | Rust + WebView (WebKitGTK / WebView2 / WKWebView) | Aucun port réseau | Configuration locale optionnelle `config.json` |
| Backend CLI Runner | Node.js ESM + `node-pty` | IPC interne Tauri | Aucun |

## 3. Flux & Réseau (VLAN / Proxy)
- **Aucun flux réseau sortant pour les données d'usage** : le backend communique uniquement en local avec les binaires `codex`, `claude` et `gemini` via PTY / sous-processus.
- **Dépôt Git distant** : `origin` → `https://github.com/ulysserevient/ai-usage-widget` (branche principale `master`).
