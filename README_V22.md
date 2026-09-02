# FinOps multi-fournisseurs — V22

Les écrans **Offre de service** et **Paramétrage offre de service** utilisent désormais exactement la même table `Offres` et le même dictionnaire de 27 colonnes. Seul le rendu diffère : lecture ou édition.

Chaque écran possède un bouton **Colonnes** pour masquer/afficher les colonnes. L’Owner peut enregistrer séparément la configuration de la vue lecture (`Visible_Lecture`) et de la vue admin (`Visible_Admin`) dans `Configuration_Colonnes_Offres`.

Exécuter une fois `migrate_offer_columns_v22.py` pour créer et initialiser cette table de configuration. Aucune donnée de `Offres` n’est supprimée.
