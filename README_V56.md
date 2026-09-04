# FinOps V56 — Messagerie intégrée responsive

## Fonctionnalités
- Discussion générale FinOps.
- Messages directs depuis la liste des utilisateurs en ligne.
- Historique persistant dans Grist.
- Badge de messages non lus.
- Rafraîchissement quasi temps réel toutes les 7 secondes.
- Messages immuables côté utilisateurs (création + lecture uniquement).
- Panneau latéral sur desktop, plein écran sous 900 px pour préserver le responsive V55.

## Tables ajoutées
- `FinOps_Messages`
- `FinOps_Chat_Lectures`

## ACL
Les messages directs ne sont lisibles que par l'expéditeur, le destinataire et l'Owner. Le canal `GENERAL` est lisible par tous les utilisateurs FinOps actifs. Chaque utilisateur ne peut gérer que ses propres marqueurs de lecture.

## Installation
1. Sauvegarder le document Grist.
2. Exécuter `migrate_chat_v56.py`.
3. Déployer `app.js` et `index.html`.
4. En Owner : `ACL / Sécurité` → exporter une sauvegarde → `Appliquer / réconcilier FinOps`.
5. Tester avec deux comptes : général, message direct, badge non lu, puis viewport mobile/tablette.

Aucun `styles.css` n'est livré : les styles spécifiques du chat sont injectés par `app.js`, afin que ce patch ne contienne que les fichiers réellement modifiés/nouveaux.
