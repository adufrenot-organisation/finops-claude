# FinOps V58

Deux corrections visibles :

1. **Admin > Paramètres application** devient un véritable item du menu Admin.
   Il permet de régler le rafraîchissement du chat entre 3 et 60 secondes.

2. Les messages disposent maintenant d'un bouton **Effacer**.
   Un utilisateur peut effacer ses propres messages ; l'Owner peut effacer tous les messages.
   V58 utilise une suppression réelle (`RemoveRecord`).

## Installation
1. Backup Grist.
2. Exécuter `migrate_chat_v58.py`.
3. Déployer `app.js` + `index.html`.
4. Owner > ACL / Sécurité > sauvegarde ACL.
5. **Appliquer / réconcilier FinOps**.

L'étape 5 est obligatoire : elle ajoute le droit `+D` sur les propres messages.
