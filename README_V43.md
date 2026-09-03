# FinOps V43

Correctif de l’écran **Scénarios**.

- **Enregistrer les modifications** n’envoie désormais à Grist que les scénarios réellement modifiés, au lieu de réécrire toutes les lignes affichées.
- Les nouveaux scénarios restent enregistrés normalement.
- Les erreurs Grist sont maintenant affichées explicitement dans le message utilisateur et journalisées dans la console avec les scénarios concernés.
- Les saisies sont conservées si Grist refuse l’enregistrement, afin de pouvoir corriger sans retaper le nom.
- Aucun changement de schéma Grist et aucune migration nécessaire.

Cache-busting : `app.js?v=43` et `styles.css?v=43`.
