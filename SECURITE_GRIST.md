# Règles d’accès Grist — modèle multi-fournisseurs

La sécurité doit être imposée par les **Access Rules Grist**, pas par le JavaScript.

## Table d’attribut utilisateur

Conserver `Droits_Utilisateurs` et l’attribut utilisateur basé sur :

- propriété : `user.Email`
- table : `Droits_Utilisateurs`
- colonne de correspondance : `Email`
- nom d’attribut : `Droits`

## Owner

Conserver la règle Owner de Grist (`user.Access == OWNER`) avec accès complet.

## Domain user

### Allocations

Lecture / mise à jour :

```python
user.Droits.Actif and rec.Domaine == user.Droits.Domaine
```

Création :

```python
user.Droits.Actif and newRec.Domaine == user.Droits.Domaine
```

Suppression : même logique avec `rec.Domaine`.

### Domaines

Lecture limitée au domaine :

```python
user.Droits.Actif and rec.id == user.Droits.Domaine
```

### Scenarios / Fournisseurs / Offres

Utilisateur de domaine : **lecture seule**.

### Droits_Utilisateurs

Un utilisateur de domaine ne doit voir que sa propre ligne (ou aucune ligne si l’interface est configurée autrement). Owner : accès complet.

## Structure

Ne pas accorder la permission `S` (Structure) aux utilisateurs de domaine.

## Utilisateur absent de Droits_Utilisateurs

Refuser les données métier. Le widget affichera la page « Accès non autorisé » lorsque Grist ne lui expose aucun périmètre autorisé.

## V5 — table Baseline_N_1

Appliquer à `Baseline_N_1` les mêmes restrictions par domaine qu'à `Allocations` :

- Owner : tous droits.
- Utilisateur autorisé : lecture/écriture uniquement lorsque `rec.Domaine == user.Droits.Domaine`.
- Création : uniquement lorsque `newRec.Domaine == user.Droits.Domaine`.
- Utilisateur non autorisé : aucun accès.

`Scenarios.Nb_Jours_Ouvres_Annuels` est un paramètre global : lecture pour les utilisateurs autorisés, modification réservée aux Owners/Admins.
