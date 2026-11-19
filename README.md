# Menu des thés 🍵

Une petite app pour lister les thés disponibles à la maison. Elle s'installe sur Android et iPhone comme une application web (PWA).

- Ajouter, modifier et supprimer des thés : nom, type, origine/marque, température, temps d'infusion, notes
- Marquer un thé comme favori ★ ou épuisé
- Rechercher un thé et filtrer par type
- **Données enregistrées uniquement sur le téléphone** (`localStorage`), sans compte ni synchronisation
- Fonctionne hors connexion après la première ouverture
- Export / import de la liste en `.json` (dans Réglages) pour faire une sauvegarde ou copier la liste vers un autre téléphone

Aucune dépendance et pas d'étape de build : ce sont uniquement des fichiers statiques (`index.html`, `style.css`, `app.js`, `sw.js`).

## Mise en ligne (une seule fois)

L'installation sur téléphone exige que l'app soit servie en **HTTPS**. GitHub Pages fait ça gratuitement :

1. Pousser le dépôt sur GitHub : `git push origin main`
2. Sur GitHub : **Settings → Pages → Build and deployment**
   - Source : *Deploy from a branch*
   - Branch : `main`, dossier `/ (root)` → **Save**
3. Au bout d'une minute environ, l'app est disponible à l'adresse `https://<utilisateur>.github.io/tea-menu/`

> Un dépôt public est la solution la plus simple (Pages sur un dépôt privé demande un compte payant). Le code est public, mais **pas ta liste de thés** : elle reste stockée sur chaque téléphone.

## Installation sur le téléphone

**iPhone (Safari obligatoire)**
1. Ouvrir l'adresse dans **Safari**
2. Bouton **Partager** → **Sur l'écran d'accueil** → Ajouter

**Android (Chrome)**
1. Ouvrir l'adresse dans Chrome
2. Menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »)

Il faut ensuite toujours ouvrir l'app **depuis son icône**. Sur iPhone, la version installée et Safari ont chacune leur propre stockage.

## Sauvegarde

Chaque téléphone a sa propre liste. Si l'app est désinstallée ou si les données du navigateur sont effacées, la liste est perdue. Pense à faire **Réglages → Exporter la liste** de temps en temps. Le fichier peut être enregistré dans Fichiers, Drive, ou envoyé par mail, puis réimporté avec **Importer une liste…**

## Développement

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765. Après un changement, un `git push` suffit : les téléphones reçoivent la nouvelle version à la prochaine ouverture avec du réseau.
