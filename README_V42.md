# FinOps V42

Cette version harmonise l’export HTML de la Synthèse.

- Sur l’écran **Synthèse / Comparaison**, le bouton direct « Imprimer la synthèse » est remplacé par **🌐 Ouvrir en HTML**.
- La page HTML autonome contient la synthèse des scénarios sélectionnés puis leur détail complet.
- Cette page propose **Imprimer / PDF** et **Enregistrer le fichier HTML**.
- Dans la fiche de détail d’un scénario, le bouton redondant **Imprimer le détail** est supprimé : l’impression/PDF passe désormais par **Ouvrir en HTML**.
- Le mécanisme historique `printSynthesisV36()` est conservé dans le code pour compatibilité, mais n’est plus exposé par l’interface.
- Aucun changement de schéma Grist et aucune migration nécessaire.

Cache-busting : `app.js?v=42` et `styles.css?v=42`.
