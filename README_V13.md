# FinOps multi-fournisseurs — V13

Évolution de l'écran Owner **Configuration du menu** :

- l'Owner peut désormais modifier, pour chaque onglet, le niveau d'accès :
  - **Utilisateurs autorisés**
  - **Owner uniquement**
- cette valeur est stockée dans `Configuration_Menu.Owner_Seulement` ;
- le widget applique immédiatement cette configuration au menu ;
- l'ordre, le libellé et l'activation restent également configurables ;
- un seul bouton **Enregistrer les modifications** sauvegarde toute la configuration.

Le bouton **Ordre et noms par défaut** restaure également les niveaux d'accès par défaut :
- Dashboard, Simulation, Comparaison, ROI, Scénarios : utilisateurs autorisés ;
- Fournisseurs & offres, Domaines, Droits utilisateurs, Configuration du menu : Owner uniquement.

Aucune migration Grist supplémentaire n'est nécessaire si V10+ a déjà été appliquée.
