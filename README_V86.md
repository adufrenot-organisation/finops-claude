# V86 — Correction PRESIM_DRAFT

Correction du crash JavaScript :

`PRESIM_DRAFT is not defined`

La refonte ROI avait supprimé accidentellement les déclarations d'état local de l'écran Pré-simulation.

La V86 restaure explicitement :
- `PRESIM_SELECTED_ID`
- `PRESIM_DRAFT`
- `PRESIM_DRAFT_RESOURCES`
- `PRESIM_REMOVED_RESOURCE_IDS`
- `PRESIM_DRAFT_TEAMS`
- `PRESIM_REMOVED_TEAM_IDS`
- `PRESIM_DRAFT_RIGHTS`
- `PRESIM_REMOVED_RIGHT_IDS`

La remise à zéro de l'état Pré-simulation est également centralisée via `resetPreSimDraftStateV62()` lors de l'ouverture ou de la création d'une fiche, pour éviter de conserver des brouillons/droits d'une fiche précédente.

Aucune migration Grist supplémentaire n'est nécessaire pour cette correction.
