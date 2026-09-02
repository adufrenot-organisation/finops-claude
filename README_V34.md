# FinOps V34 — présence des utilisateurs

Le bandeau supérieur affiche maintenant un compteur `N en ligne`.

Un clic ouvre la liste des sessions FinOps actives avec :
- utilisateur ;
- rôle ;
- page actuellement ouverte ;
- périmètre ;
- dernière activité.

La page est mise à jour immédiatement lors d'un changement de menu.
Un heartbeat est envoyé toutes les 20 secondes ; une session disparaît de la liste
après environ 75 secondes sans heartbeat.

## Limite importante

Il s'agit de la présence **dans le widget FinOps**, et non de toutes les personnes
ayant simplement le document Grist ouvert. Le Custom Widget API ne fournit pas
au widget le flux de présence natif affiché par Grist dans sa barre d'outils.

Pour les utilisateurs standards, l'identité provient de `Droits_Utilisateurs`.
Pour l'Owner, Grist n'expose pas de façon documentée son email au Custom Widget ;
la session apparaît donc comme `Owner Grist`.

## Installation

1. Sauvegarder le document.
2. Exécuter `migrate_presence_v34.py`.
3. Déployer V34.
4. En Owner, aller dans `ACL / Sécurité`.
5. Exporter une sauvegarde ACL.
6. Lancer la réconciliation V34.
7. Tester avec deux comptes ouverts simultanément sur deux pages différentes.
