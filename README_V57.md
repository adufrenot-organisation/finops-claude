# FinOps V57 — messagerie : brouillons, fréquence et suppression

Cette version est cumulative et repart de V56.

## Brouillon préservé

Le rafraîchissement automatique ne reconstruit plus tout le panneau de chat.
Seule la liste des messages est actualisée. Le texte en cours de saisie, le focus,
le canal et le destinataire restent donc inchangés.

Un brouillon est également conservé par conversation lorsque l'utilisateur passe
du canal Général à un message direct puis revient.

## Fréquence paramétrable

Dans **Admin > Configuration du menu > Paramètres de l'application** :
- `Rafraîchissement messagerie (secondes)`
- minimum : 3 s
- maximum : 60 s
- valeur initiale : 7 s

Le réglage est stocké dans la nouvelle table générale `FinOps_Configuration`.

## Suppression des messages

- un utilisateur peut supprimer ses propres messages ;
- l'Owner peut supprimer n'importe quel message ;
- la suppression est logique : le texte est vidé et remplacé visuellement par
  `Message supprimé` afin de conserver la chronologie de la conversation.

Colonnes ajoutées à `FinOps_Messages` :
- `Supprime`
- `Supprime_Par`
- `Supprime_MS`

## Installation

1. Sauvegarder le document Grist.
2. Exécuter `migrate_chat_v57.py`.
3. Déployer `app.js` et `index.html`.
4. En Owner : **ACL / Sécurité > exporter une sauvegarde > réconcilier FinOps**.
5. Tester la saisie pendant plusieurs cycles de rafraîchissement.
6. Tester la suppression avec un utilisateur standard puis avec l'Owner.

Le responsive V55/V56 est conservé : panneau latéral sur desktop, plein écran
sous 900 px.
