# FinOps V12 — ACL utilisateurs multi-domaines

`Droits_Utilisateurs.Domaines_Autorises` est une colonne `RefList:Domaines`.

Un utilisateur peut avoir plusieurs domaines dans une seule ligne de droits.

Pour les tables contenant une référence simple `Domaine` (`Allocations`,
`Baseline_N_1`, tables historiques Claude, etc.), la règle de lecture devient :

```python
user.Droits.Actif and rec.Domaine in user.Droits.Domaines_Autorises
```

Pour `Domaines` :

```python
user.Droits.Actif and rec.id in user.Droits.Domaines_Autorises
```

Permissions recommandées :
- Owner : droits complets.
- Utilisateur autorisé sur `Scenarios` : `RU`.
- Utilisateur autorisé sur les tables métier par domaine : `R` seulement, avec la condition ci-dessus.
- `Fournisseurs`, `Offres`, `Configuration_Menu` : `R` pour utilisateur autorisé.
- `Droits_Utilisateurs` : Owner complet ; éventuellement lecture de sa propre ligne pour l'utilisateur.

Les scénarios sont globaux : ils ne sont pas filtrés par domaine.

Ne donne pas `S` (Structure) aux non-Owners.
