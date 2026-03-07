# NutriApp 🥗

NutriApp est une application web de recommandation nutritionnelle intelligente. Elle connecte les consommateurs cherchant des conseils personnalisés avec des nutritionnistes professionnels qui valident ces recommandations.

## 🌟 Fonctionnalités

Le système propose deux expériences distinctes basées sur le rôle de l'utilisateur :

**👤 Flux Consommateur :**
- Inscription et gestion de profil de santé extrêmement détaillé (reprend les champs d'un formulaire clinique complet).
- Calcul de l'IMC (Indice de Masse Corporelle) en temps réel.
- **Moteur de recommandation intelligent** qui génère des suggestions de plats personnalisées.
- Filtrage strict des allergènes (plus de 70 allergies prises en compte, ex: gluten, lait, arachides).
- Scoring des plats selon les objectifs (perte de poids, prise de masse, etc.), le niveau d'activité physique et les préférences culinaires.
- Suivi du statut des recommandations (En attente ⏳, Validé ✅, Rejeté ❌) avec les commentaires du nutritionniste.

**👨‍⚕️ Flux Nutritionniste :**
- Tableau de bord professionnel avec statistiques globales (nombre de patients, recommandations en attente).
- Vue détaillée du profil de santé complet de chaque consommateur associé à une recommandation.
- Système de validation ou de rejet des plats proposés par l'algorithme.
- Possibilité d'ajouter des commentaires personnalisés pour guider le consommateur.

**🔄 Synchronisation Temps Réel (Cross-Tab) :**
- Utilisation novatrice de l'API Web Storage (`storage` events) combinée avec `sessionStorage` pour permettre l'ouverture et l'utilisation fluide des deux interfaces (Consommateur et Nutritionniste) **en parallèle sur la même machine**. Les actions du nutritionniste s'affichent instantanément en temps réel sur l'écran du consommateur sans rechargement.

## 🛠️ Stack Technique

- **Frontend** : HTML5, Vanilla JavaScript (ES6 Modules)
- **Styling** : CSS3 pur (Custom Properties, Flexbox, Grid)
- **Design** : Interface "Dark Premium" moderne avec effets de Glassmorphism (verre dépoli).
- **Stockage** : 
  - `localStorage` pour persister la base de données (utilisateurs, profils, recommandations).
  - `sessionStorage` pour isoler l'état de la session utilisateur par onglet, permettant le multi-compte simultané.
- Aucune dépendance externe requise (pas de React/Vue, pas de bundler complexe, pas de base de données externe).

## 🚀 Comment exécuter le projet localement

1. Clonez ce dépôt.
2. Ouvrez un terminal dans le dossier du projet.
3. Servez les fichiers statiques à l'aide d'un serveur local. La méthode la plus simple est d'utiliser `npx` :

```bash
npx serve . -l 3456
```

4. Ouvrez votre navigateur à l'adresse indiquée (par exemple, `http://localhost:3456`).

### 🧪 Comment tester la synchronisation en temps réel

Pour voir le système fonctionner pleinement, voici le scénario de test idéal :

1. Ouvrez **deux onglets ou fenêtres** de votre navigateur côte à côte.
2. **Dans l'onglet 1 :** Inscrivez-vous en tant que **Consommateur** (ex: `testuser` / `test123`), remplissez le profil (ajoutez des allergies comme *gluten* ou *lait* pour voir le filtrage à l'œuvre) et accédez à votre tableau de bord.
3. **Dans l'onglet 2 :** Inscrivez-vous en tant que **Nutritionniste** (ex: `doc` / `doc123`).
4. Toujours dans l'onglet 2, cliquez sur une recommandation en attente générée pour le consommateur, ajoutez un commentaire et cliquez sur **Valider**.
5. Regardez immédiatement **l'onglet 1** : la carte de la recommandation s'est automatiquement mise à jour avec le statut ✅ et votre commentaire !

## 📁 Structure du projet

```text
/
├── index.html                  # Point d'entrée de l'application
├── style.css                   # Design system et thèmes (Glassmorphism)
├── app.js                      # Routeur principal, gestion d'état et écouteurs d'événements multi-onglets
├── /components                 # Composants d'interface (Génèrent le HTML)
│   ├── auth.js                 # Composant de connexion/inscription multi-rôle
│   ├── profile-form.js         # Formulaire clinique ultra-détaillé
│   ├── consumer-dashboard.js   # Vue Consommateur + Moteur de recommandation
│   └── nutritionist-dashboard.js # Vue Pro + Flux d'approbation
├── /data                       # Bases de données simulées
│   ├── allergies.js            # +70 types d'allergies
│   ├── diseases.js             # Maladies, objectifs, styles de vie
│   └── dishes.js               # Catalogue de plats scorables et filtrables
└── /utils                      # Outils utilitaires
    └── storage.js              # Abstraction de la base de données via localStorage/sessionStorage
```
