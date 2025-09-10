# CSV Import Power-Up for Trello | trello-csv-import
CSV Import Power-Up pour Trello : Ce Power-Up permet d'importer facilement des tâches depuis un fichier CSV directement dans vos listes Trello. Il offre une interface intuitive en plusieurs étapes avec prévisualisation des données et suivi en "temps réel" de l'import.

## 🚀 Fonctionnalités

- **Import CSV en masse** : Créez plusieurs cartes Trello en une seule opération
- **Interface intuitive** : Assistant en 5 étapes pour guider l'utilisateur
- **Prévisualisation** : Vérifiez vos données avant l'import
- **Suivi en temps réel** : Barre de progression et statut détaillé
- **Gestion d'erreurs** : Rapport complet des succès et échecs
- **Format flexible** : Support des descriptions multi-colonnes
- **Authentification sécurisée** : Utilisation de l'API officielle Trello

## 📋 Format CSV attendu

Le fichier CSV doit respecter ce format :
- **Première colonne** : Nom de la carte (obligatoire)
- **Colonnes suivantes** : Description de la carte (optionnel, concaténées avec des retours à la ligne)
- **En-tête** : Option pour ignorer la première ligne

### Exemple de fichier CSV

```csv
Nom de la tâche,Description,Priorité,Assigné à
Créer la maquette,Maquette de la page d'accueil,Haute,Designer
Développer l'API,Endpoints REST pour l'authentification,Moyenne,Développeur
Tests unitaires,Couverture de code 90%,Basse,QA
```

### Activation dans un tableau

1. **Ouvrez un tableau Trello**
2. **Menu > Power-Ups**
3. **Recherchez "CSV Import"** ou allez dans "Custom"
4. **Activez le Power-Up**

## 📖 Mode d'emploi

### Utilisation du Power-Up

1. **Accès** : Cliquez sur le menu d'une liste (⋯) → "📄 Importer CSV"

2. **Étape 1 - Authentification** :
   - Cliquez sur "Obtenir un token API" pour ouvrir la page d'autorisation Trello
   - Autorisez l'accès et copiez le token généré
   - Collez le token dans le champ et cliquez sur "Valider"

3. **Étape 2 - Fichier CSV** :
   - Sélectionnez votre fichier CSV
   - Cochez "Ignorer la première ligne" si votre fichier a des en-têtes
   - Cliquez sur "Suivant"

4. **Étape 3 - Prévisualisation** :
   - Vérifiez que les données sont correctement interprétées
   - Nombre de cartes à créer affiché
   - Cliquez sur "Importer"

5. **Étape 4 - Import** :
   - Suivez la progression en temps réel
   - Les cartes sont créées une par une

6. **Étape 5 - Résultats** :
   - Résumé des succès et erreurs
   - Détails des problèmes rencontrés (le cas échéant)

## ⚙️ Configuration technique

### Structure des fichiers

```
trello-csv-import/
├── index.html          # Point d'entrée du Power-Up
├── client.js           # Logique d'initialisation Trello
├── popup.html          # Interface d'import CSV
├── popup.js            # Logique de traitement et import
├── styles.css          # Styles CSS modernes
├── manifest.json       # Configuration du Power-Up
└── README.md          # Documentation
```

### Clé API

La clé API utilisée dans le code est publique mais ne peut être utilisée pour le développement si vous souhaitez améliorer ce projet. Pour des tests ou un usage en production, considérez créer votre propre application Trello.

### Sécurité

- Le token API est stocké temporairement dans la session de la popup
- Aucune donnée n'est stockée côté serveur
- Communication directe avec l'API Trello via HTTPS
- Validation des données CSV côté client

## 🐛 Dépannage

### Erreurs courantes

**"Token API invalide"** :
- Vérifiez que le token contient exactement 64 caractères
- Assurez-vous d'avoir autorisé les permissions read/write
- Régénérez un nouveau token si nécessaire

**"Impossible de créer la carte"** :
- Vérifiez que vous avez les droits d'écriture sur le tableau
- La liste cible existe et n'est pas archivée
- Le nom de la carte n'est pas vide

**"Fichier CSV non reconnu"** :
- Vérifiez l'extension .csv
- Encodage UTF-8 recommandé
- Séparez les colonnes par des virgules

### Limitations

- Maximum de cartes par import
- Délai de 200ms entre chaque création de carte
- Taille de fichier CSV limitée par le navigateur

## 📝 License

Ce projet est sous licence MIT. Vous êtes libre de l'utiliser, le modifier et le redistribuer.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📞 Support

Pour toute question ou problème :
- Contact via GitHub