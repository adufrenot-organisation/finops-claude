# FinOps Claude V99

Cette version harmonise le vocabulaire budgétaire des groupes :

- `Enveloppe_Allouee` reste le nom technique de colonne Grist, mais son libellé fonctionnel devient **Affectation initiale**.
- `Plafond_Groupe_Total` reste le nom technique de colonne Grist, mais son libellé fonctionnel devient **Budget révisé**.
- Les réallocations exceptionnelles transfèrent du **budget révisé** entre groupes, sans modifier l’affectation initiale.
- La vue de pilotage utilise désormais systématiquement : Affectation initiale / Budget révisé / Consommation réelle / Réallocation nette / Atterrissage simulé.

Aucune migration Grist n’est nécessaire depuis la V98 : remplacement de `app.js` uniquement.
