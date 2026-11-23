# RÈGLES SYSTÉMATIQUES OBLIGATOIRES DU PROJET

1. Sauvegarde continue de l'avancement :
   - Tout changement d'infrastructure, nouvel accès, entité, automatisation ou conteneur modifié DOIT être consigné immédiatement dans `JOURNAL.md` (et dans `INFRASTRUCTURE.md` si l'architecture réseau ou système évolue).
2. Validation YAML & Intégrité avant tout redémarrage :
   - Ne jamais modifier aveuglément les fichiers YAML (`configuration.yaml`, `docker-compose.yml`, etc.). Toujours vérifier la syntaxe, l'indentation et les types de données conformes aux spécifications.
3. Protection des secrets & Données sensibles :
   - Ne JAMAIS inscrire de mots de passe, tokens d'accès, clés API privées en dur dans les fichiers suivis sur Git.
   - Utiliser `secrets.yaml` ou le fichier d'environnement local `.env` (via `.env.example`).
   - Maintenir les clés SSH et certificats sécurisés.
4. Portabilité & Chemins relatifs :
   - Interdiction d'utiliser des chemins absolus spécifiques à un OS ou un hôte.
   - Tous les scripts Python/Bash doivent déduire la racine du projet de manière relative.
5. Convention de commits :
   - Format Conventional Commits strict pour chaque commit Git (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).
