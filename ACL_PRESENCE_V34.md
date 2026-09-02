# Présence FinOps V34

La table `Presence_Utilisateurs` sert de registre de présence applicatif.

Chaque instance ouverte du widget écrit un heartbeat toutes les 20 secondes :
- identifiant de session ;
- utilisateur ;
- rôle ;
- page FinOps courante ;
- périmètre ;
- timestamp.

Une session est considérée en ligne pendant 75 secondes après son dernier heartbeat.

ACL :
- tout utilisateur actif de `Droits_Utilisateurs` peut lire la présence ;
- un utilisateur standard ne peut créer/modifier/supprimer que ses propres lignes de présence (`rec.Email == user.Email`) ;
- Owner Grist conserve le contrôle complet.

Après création de la table, lancer la réconciliation dans `ACL / Sécurité`.
