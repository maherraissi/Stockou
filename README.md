<div align="center">

# 🟠 STOCKOU

### Application de gestion de stock & caisse — Mobile & Desktop

[![Version](https://img.shields.io/badge/version-0.0.2-orange?style=for-the-badge)](https://github.com/maherraissi/Stockou)
[![Angular](https://img.shields.io/badge/Angular-v17-red?style=for-the-badge&logo=angular)](https://angular.io/)
[![Ionic](https://img.shields.io/badge/Ionic-v7-blue?style=for-the-badge&logo=ionic)](https://ionicframework.com/)
[![Electron](https://img.shields.io/badge/Electron-v41-47848F?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-v6-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)

</div>

---

## 📖 Présentation

**Stockou** est une application de gestion de stock et de point de vente (POS) 100% hors ligne, conçue pour les petits commerces et boutiques. Elle fonctionne sur **Android** et **Windows** sans nécessiter de connexion internet ni de serveur distant.

Toutes les données sont stockées localement sur l'appareil grâce à **SQLite**.

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🏠 **Accueil** | Dashboard avec horloge temps réel et accès rapide |
| 📦 **Produits** | Gestion du catalogue (ajout, modification, suppression) |
| 🛒 **Nouvelle Vente** | Création de ventes avec scan de code-barres |
| 📋 **Historique** | Consultation de toutes les ventes passées |
| 🔴 **Rupture de Stock** | Filtre instantané des produits en stock critique |
| 🧾 **Factures PDF** | Génération et partage natif de factures en PDF |
| 💰 **Clôture Caisse** | Bilan journalier des ventes |
| 📊 **Statistiques** | Graphiques de performance (CA, profits, top produits) |
| ⚙️ **Paramètres** | Personnalisation (nom du magasin, devise, TVA) |

---

## 📱 Téléchargement

| Plateforme | Lien |
|---|---|
| 🤖 Android (.apk) | [Télécharger APK](https://gofile.io/d/sqty1P) |
| 🖥️ Windows (.exe) | [Télécharger Setup](https://gofile.io/d/bQXUYN) |

> ⚠️ **Android** : Activez "Sources inconnues" dans vos paramètres de sécurité avant l'installation.

---

## 🛠️ Stack Technique

```
Frontend   → Angular 17 + Ionic 7
Desktop    → Electron 41 (Windows Installer via electron-builder)
Mobile     → Capacitor 6 (Android APK)
Base de données → SQLite (via @capacitor-community/sqlite)
PDF        → jsPDF
Graphiques → Chart.js
```

---

## 🚀 Installation & Développement

### Prérequis
- Node.js >= 18
- Angular CLI
- Android Studio (pour le build Android)

### Installation
```bash
git clone https://github.com/maherraissi/Stockou.git
cd Stockou
npm install
```

### Lancer en mode développement (Web)
```bash
npm run start
```

### Build Desktop (Windows .exe)
```bash
npm run build
npx cap sync
npm run electron:build
```
> Le fichier installeur sera dans `dist-electron/`

### Build Mobile (Android .apk)
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
> Le fichier APK sera dans `android/app/build/outputs/apk/debug/`

---

## 📁 Structure du Projet

```
Stockou/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── home/           → Page d'accueil
│   │   │   ├── products/       → Gestion des produits
│   │   │   ├── create-sale/    → Nouvelle vente
│   │   │   ├── sales/          → Historique des ventes
│   │   │   ├── dashboard/      → Statistiques
│   │   │   ├── cloture-caisse/ → Clôture de caisse
│   │   │   └── settings/       → Paramètres
│   │   └── services/
│   │       ├── database.service.ts  → Gestion SQLite
│   │       ├── product.service.ts   → CRUD Produits
│   │       ├── sale.service.ts      → CRUD Ventes
│   │       └── invoice.service.ts   → Génération PDF
├── android/                    → Projet Android (Capacitor)
├── electron/                   → Config Electron (Desktop)
├── build/                      → Assets de build (icône...)
└── backend/                    → API NestJS (optionnel)
```

---

## 👤 Auteur

**Maher Raissi**

[![GitHub](https://img.shields.io/badge/GitHub-maherraissi-181717?style=flat&logo=github)](https://github.com/maherraissi)

---

<div align="center">
  Fait avec ❤️ en Tunisie 🇹🇳
</div>
