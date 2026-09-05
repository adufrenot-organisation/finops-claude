# FinOps V66 — migration cumulative depuis V60

Cette version corrige le mode de livraison : le code applicatif était cumulatif,
mais les migrations Grist ne l'étaient pas.

Tu peux désormais passer directement de **V60 à V66**.

Le script `migrate_cumulative_v66.py` est idempotent : il vérifie ce qui existe
avant toute création et couvre notamment :

- `FinOps_Configuration`
- `CHAT_REFRESH_SECONDS`
- menu `appsettings`
- colonnes chat de compatibilité
- `Pre_Simulation_Equipes`
- `Pre_Simulation_Ressources.Equipe`
- `Pre_Simulation_Droits`
- `Pre_Simulations.Responsable_User`
- `Pre_Simulations.Responsable_Email`
- `Pre_Simulations.Acces_Lecture_Emails`
- `Pre_Simulations.Acces_Modification_Emails`

Il tente aussi de convertir l'ancien champ texte `Responsable` lorsqu'il contient
exactement l'email d'un utilisateur actif.

## Ordre d'installation
1. Sauvegarder le document Grist.
2. Exécuter `migrate_cumulative_v66.py`.
3. Déployer `app.js` et `index.html`.
4. Se connecter en Owner.
5. ACL / Sécurité > exporter une sauvegarde.
6. Appliquer / réconcilier FinOps.
7. Vérifier les responsables des anciennes pré-simulations.
