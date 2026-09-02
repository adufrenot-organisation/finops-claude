# V25 — recalcul immédiat après enregistrement

Correction du rafraîchissement des calculs après écriture.

- Les modifications ROI racine + tranches TJM sont envoyées dans une seule transaction Grist.
- Après `applyUserActions`, le widget attend brièvement la propagation des formules/références.
- Les tables sont relues, `CURRENT` est recalculé, puis tous les écrans sont rerendus.
- Le Dashboard, ROI, Simulation et Comparaison récupèrent donc les nouvelles valeurs sans actualisation manuelle du navigateur.
- Les libellés persistés sont réappliqués après ce rerendu.

Aucune migration de table supplémentaire n'est nécessaire par rapport à V24.
