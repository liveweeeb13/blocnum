

<div align="center">
  <h1>BlocNum</h1>
  <img src="public/blocnum-pixel.svg" alt="Logo BlocNum" width="120" />
  <h3>Gestion de Base de Données & Constructeur d’Interface en Low-Code</h3>
  <p><b>Gérez vos données et créez l'interface visuelle pour interagir avec, sans coder.</b><br/>
  Modélisez votre base de données SQLite, assemblez vos formulaires et tableaux en glisser-déposer, et manipulez vos données en direct.</p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite" alt="Vite 8" />
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express 5" />
    <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003b57?logo=sqlite" alt="SQLite" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js" alt="Node.js" />
  </p>
</div>

---


## C'est quoi BlocNum ?

**BlocNum** est un outil **Low-Code** qui permet de **gérer une base de données à travers une interface visuelle** sur-mesure.

Plutôt que d'écrire des requêtes SQL ou de coder des pages web à la main, BlocNum réunit les deux côtés en un seul endroit :
1. **La Base de données (le fond)** : Vous créez vos tables, définissez vos colonnes et stockez vos données dans une base SQLite locale.
2. **L'Interface UI (la forme)** : Vous construisez les écrans pour vos utilisateurs en glisser-déposer.

L'interface est **directement branchée sur la base** : dès qu'un utilisateur remplit un formulaire sur l'UI, la ligne est insérée dans la base SQLite en temps réel.



---

## Comment ça marche ?

1. **Étape 1 : Créez vos données (Database Studio)**  
   Créez une table (ex: `chantiers`), ajoutez vos colonnes (*Nom*, *Budget*, *Date de début*, *Statut*). 

2. **Étape 2 : Montez l'interface en Low-Code (Page Builder)**  
   Glissez-déposez des blocs sur votre canvas :
   * Un bloc **Tableau** relié à `chantiers` pour lister et chercher dans les données.
   * Un bloc **Formulaire** relié à `chantiers` pour permettre la saisie directe.
   * Un bloc **Compteur** pour afficher le nombre de chantiers en cours.
   * Des **Boutons d'action** avec des règles interactives (*Si le budget > 10 000 €, alerter l'utilisateur*).

3. **Étape 3 : Utilisez ou partagez la page**  
   Basculez sur le mode direct ou donnez l'accès public (`/page`) à vos collaborateurs avec des droits d'accès sécurisés.

---

## Fonctionnalités Principales

### 1. Database Studio : Gérer sa base de données sans SQL
* **Création visuelle de tables** : Création automatique de tables SQL dédiées (`app_<nom>`).
* **Typage riche des colonnes** :
  * `Texte`
  * `Entier` et `Nombre`
  * `Date` 
  * `Booléen`
  * `Liste` (options personnalisées)


### 2. Page Builder : Créer l'interface UI en glisser-déposer
* **Glisser-déposer** 
* **Blocs intégrés** :
  * **En-tête** 
  * **Compteur** 
  * **Tableau interactif** 
  * **Formulaire d'insertion**
  * **Bouton personnalisable** 
  

### 3. Variables & Conditions
Les titres et textes acceptent les balises :
* **Variables utilisateur** : `$[username]`, `$[role]`.
* **Compteurs statistiques dynamiques** : `$[count[nom_table]]` (ex: `$[count[clients]]` affiche le nombre de lignes de la table `clients`, ou `$[count[table]]` pour la table liée au bloc).
* **Conditions inline** :
  ```text
  $[if[$[username] == "admin"]return["Espace Administrateur"]else["Bienvenue $[username]"]]
  $[if[$[count[clients]] == "0"]return["Aucun client enregistré"]else["$[count[clients]] clients en base"]]
  ```

### 4. Sécurité, Comptes & Droits d'Accès
* **Authentification JWT** : Hachage des mots de passe.
* **Rôles distincts** :
  *  **Administrateur (`admin`)** : Accès complet au studio (Database Studio, Page Builder, gestion de tous les comptes et attributions).
  *  **Utilisateur standard (`user`)** : Accès strictement restreint aux pages publiées qui lui ont été attribuées par un administrateur.
* **Permissions granulaires** : Accès restreint des utilisateurs a leurs pages associées

---

##  Démarrage Rapide

### Prérequis
* [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée).
* `npm` (inclus avec Node.js).

### Installation et lancement

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Lancer l'application en mode développement** :
   ```bash
   npm run dev
   ```

3. Ouvrez votre navigateur sur :
   * **Studio / Application :** [http://localhost:3000](http://localhost:3000)
   * **API Backend Express :** [http://localhost:5000](http://localhost:5000)



### Identifiants d'accès par défaut

| Utilisateur | Mot de passe | Rôle |
| :--- | :--- | :--- |
| `admin` | `admin123` | Administrateur |

*(Pensez à modifier ce mot de passe après votre première connexion).*

---

## ⚙️ Configuration

Vous pouvez personnaliser les ports et la clé de signature en créant un fichier `.env` à la racine :

```dotenv
PORT=5000
JWT_SECRET=votre_cle_secrete_jwt_super_robuste
```

* `PORT` : Port d'écoute de l'API Express.
* `JWT_SECRET` : Clé de chiffrement.


---

## 🛠️ Commandes Disponibles

| Commande | Description |
| :--- | :--- |
| `npm run dev` | Démarre simultanément l'API Express (port 5000) et l'interface Vite (port 3000). |
| `npm run client` | Démarre uniquement le serveur de développement Vite frontend. |
| `npm run server` | Démarre uniquement le serveur backend Node/Express. |
| `npm run build` | Compile l'application React avec Vite dans le dossier `dist/`. |
| `npm run preview` | Prévisualise la version de production compilée sur le port `4173`. |
| `npm run prod` | Compile le frontend puis démarre le serveur de production unifié. |
| `npm run lint` | Analyse statique et validation du code avec Oxlint. |

---


<div align="center">
  <sub>Développé avec passion pour simplifier la création d'applications sur-mesure. Licence CC BY-NC 4.0</sub>
</div