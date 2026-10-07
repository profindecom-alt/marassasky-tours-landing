# Landing page Google Ads : Marassa Sky Tours

Landing page statique en français, calquée sur la structure de la page d'accueil de
[marassasky-tours.ma](https://marassasky-tours.ma/), optimisée pour les campagnes Google Ads.

## Contenu

```
index.html              La page complète
assets/css/style.css    Styles (palette et typographie du site officiel)
assets/js/main.js       Formulaire, contrôle téléphone/e-mail, UTM/GCLID, suivi
assets/img/             16 images reprises du site officiel
serve.js                Serveur local de prévisualisation
```

Aucune dépendance, aucun build. Poids total ≈ **1 Mo** (dont 912 Ko d'images).
Seule ressource externe : la police Exo 2 via Google Fonts.

## Prévisualiser en local

```bash
node serve.js      # http://localhost:8080
```

> Ouvrir `index.html` directement en `file://` fonctionne pour l'aperçu visuel,
> mais **l'envoi du formulaire échouera** (origine `null` refusée par le navigateur).
> Utilisez toujours `node serve.js` pour tester le formulaire.

## Mise en ligne

Copiez le dossier tel quel sur n'importe quel hébergement statique :
Hostinger, Netlify, Vercel, Cloudflare Pages, ou un sous-dossier de votre serveur.

> ⚠️ **À chaque modification de `style.css` ou de `main.js`, incrémentez le jeton
> `?v=` des deux balises en tête d'`index.html`** (et de `merci.html` pour le CSS).
> Sans lui, un visiteur déjà venu reçoit le nouveau HTML avec l'ancien CSS et
> l'ancien JS gardés en cache : le formulaire s'affiche alors à moitié mis à jour,
> par exemple avec une liste d'indicatifs réduite au seul Maroc.

**Recommandation :** un sous-domaine dédié, `https://form.marassasky-tours.ma`,
afin de garder les statistiques de campagne séparées du site principal.
C'est le domaine déclaré dans le conteneur Google Tag Manager `GTM-MDLM8PX6`.

### Protection du référencement du site principal

La page reprend une partie des textes de marassasky-tours.ma. Sans précaution,
les deux se concurrenceraient dans les résultats de recherche. Quatre garde-fous
sont en place :

| Où | Quoi |
|---|---|
| `index.html` | `<meta name="robots" content="noindex, follow">` + `googlebot` |
| `merci.html` | `<meta name="robots" content="noindex, nofollow">` |
| `robots.txt` | Crawl **autorisé** (indispensable pour que le noindex soit lu) |
| `.htaccess` / `_headers` | En-tête `X-Robots-Tag: noindex`, images comprises |

**Ne jamais ajouter `Disallow: /` dans `robots.txt`.** Un robot bloqué au crawl
ne lit pas la balise noindex : l'URL peut alors apparaître quand même dans les
résultats, et les annonces Google Ads risquent d'être refusées faute de pouvoir
explorer la page de destination.

**Ne pas remettre de `rel="canonical"` vers le site principal.** Associé à un
noindex, ce couple envoie deux ordres contradictoires et Google peut reporter le
noindex sur l'URL canonique, donc désindexer marassasky-tours.ma.

Le webhook n8n accepte déjà **toutes les origines** (CORS vérifié) : la page fonctionnera
depuis n'importe quel domaine, sans configuration supplémentaire.

## Formulaire → n8n

Le formulaire envoie une requête `POST` en JSON vers :

```
https://n8n.srv1019025.hstgr.cloud/webhook/9ee70198-c719-4860-a10f-fdc7dc7e587e
```

### Charge utile reçue par n8n

```json
{
  "service": "Transferts Aéroports & Gares",
  "personnes": "4 à 7 personnes",
  "bagages": "1 à 3 valises",
  "vehicule": "Van",
  "trajet": "Aéroport Mohammed V vers Rabat centre, aller-retour",
  "nom": "Karim Alaoui",
  "telephone": "+212612345678",
  "telephone_pays": "MA",
  "telephone_saisi": "612345678",
  "email": "karim@exemple.com",

  "gclid": "Cj0KCQ...",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "transfert-aeroport-maroc",
  "utm_term": "transfert aeroport casablanca",
  "utm_content": "annonce-a",

  "lead_id": "6f0a2f3c-6b1a-4f0e-9c1b-2b7d6e4a1f55",
  "lead_status": "complet",
  "source": "landing-google-ads",
  "page_url": "https://lp.marassasky-tours.ma/?gclid=...",
  "page_title": "Transport Touristique au Maroc | ...",
  "referrer": "https://www.google.com/",
  "langue": "fr",
  "user_agent": "Mozilla/5.0 ...",
  "submitted_at": "2026-09-10T15:58:20.123Z"
}
```

Les champs `gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid` et les `utm_*` ne sont présents
que si l'internaute est arrivé avec ces paramètres dans l'URL. Ils sont mémorisés en
`sessionStorage`, donc conservés même si le visiteur navigue dans la page avant d'envoyer.

**Le `gclid` est indispensable** si vous souhaitez remonter les conversions hors ligne
(client réellement transporté) vers Google Ads plus tard.

### Réponse attendue

Le workflow n8n doit répondre avec un statut **2xx**. En cas d'échec réseau ou de délai
dépassé (12 s), la page **retente automatiquement une fois**. Si la seconde tentative
échoue aussi, un message invite à réessayer ou à appeler, et **le formulaire n'est pas
vidé** : le visiteur peut renvoyer sans tout ressaisir. Une réponse 4xx n'est pas retentée.

### Formulaire en 2 étapes

Le formulaire tient en deux étapes (**Contact → Demande**) avec une barre de progression.
Service, nombre de personnes, bagages et véhicule sont des listes déroulantes natives :
la saisie reste courte et le rendu est identique sur tous les navigateurs.

| Étape | Champs |
|-------|--------|
| 1 · Contact | Nom\*, e-mail\*, indicatif + téléphone / WhatsApp\* |
| 2 · Demande | Service\*, personnes\*, bagages, véhicule, trajet\* |

Les trois champs de l'étape 1 sont obligatoires : un lead sans e-mail ne laisse
qu'un seul moyen de rappel, et un numéro mal saisi n'en laisse aucun.

- Les coordonnées sont demandées **en premier**, pour qu'un abandon en cours de route
  laisse quand même un contact exploitable (voir la capture partielle ci-dessous).
- La validation est faite étape par étape, avec surlignage des champs manquants.
- Les valeurs de l'étape 1 restent dans le `FormData` : la charge utile envoyée à n8n
  est identique quelle que soit l'étape où les champs ont été saisis.
- Le formulaire **nécessite JavaScript** : l'envoi passe par `fetch` vers n8n et l'étape 2
  porte l'attribut `hidden` dans le HTML, pour éviter qu'elle clignote au chargement
  avant l'initialisation.

### Contrôle du téléphone et de l'e-mail

Un lead injoignable est un clic payé pour rien : les deux champs qui servent à
rappeler sont donc vérifiés sérieusement avant de laisser passer à l'étape 2.

**Le téléphone est international.** Les demandes viennent du Maroc, mais aussi de
France, d'Espagne, de Belgique et de Suisse. Or « 06 12 34 56 78 » est un numéro
valide au Maroc **comme** en France : rien dans la saisie ne permet de trancher.
Le visiteur choisit donc son indicatif dans une liste (**82 pays**, les onze plus
fréquents en tête), et le numéro est contrôlé selon les règles de ce pays.

Ce que le contrôle refuse :

| Saisie | Verdict |
|--------|---------|
| `06 12 34` (indicatif Maroc) | Trop court : 9 chiffres attendus, 4 saisis |
| `01 23 45 67 89` (indicatif Maroc) | Aucun numéro marocain ne commence par 01 |
| `06 66 66 66 66` | Chiffre répété, numéro de démonstration |
| `01 23 45 67 89` (indicatif France) | Suite de chiffres tapée au clavier |
| `123 555 0123` (indicatif USA) | Indicatif régional invalide en Amérique du Nord |
| `+676 123` | Hors liste : contrôle E.164, 8 à 15 chiffres |

Ce que le contrôle accepte et corrige tout seul :

- `00212…` et `+212…` aussi bien que `0612345678` ;
- les espaces, points, tirets et parenthèses ;
- les chiffres arabes et persans (`٠٦١٢…`), pour les claviers arabophones ;
- le **0 interurbain**, retiré là où il ne se compose pas depuis l'étranger, mais
  conservé en Italie et en Espagne où il fait partie du numéro ;
- un **indicatif collé dans le champ** : saisir `+33 6 12 34 56 78` alors que la
  liste est restée sur le Maroc bascule la liste sur la France toute seule.

Une fois le numéro reconnu, il s'affiche sous le champ (« Numéro enregistré :
+33 6 12 34 56 78 ») et part à n8n au format **E.164** (`+33612345678`),
directement utilisable pour appeler, ouvrir un WhatsApp ou dédoublonner. Trois
champs accompagnent l'envoi : `telephone` (E.164), `telephone_pays` (code ISO du
pays retenu) et `telephone_saisi` (la frappe d'origine, en cas de doute).

**Ajouter un pays** : une ligne dans `PHONE_COUNTRIES` (`assets/js/main.js`),
au format `[ISO, indicatif, nom, longueur min, longueur max, 0 à retirer,
motif ou null, exemple]`. L'exemple sert de texte d'aide dans le champ. Un pays
absent de la liste reste joignable : le visiteur tape son numéro avec `+`, et
seule la règle E.164 générique s'applique.

**L'e-mail est obligatoire** et doit être syntaxiquement valide (domaine complet,
extension d'au moins deux lettres). En cas de faute de frappe sur un domaine
courant, une suggestion cliquable s'affiche sans bloquer : `karim@gmial.com` →
« Vouliez-vous dire karim@gmail.com ? ». La liste des fautes couvertes est dans
`EMAIL_TYPOS`, à compléter librement.

### Capture partielle : deux envois pour un même lead

Au clic sur « Continuer » à l'étape 1, les coordonnées validées partent **immédiatement**
au webhook. Le visiteur qui abandonne à l'étape suivante reste donc joignable.

| Moment                              | `lead_status` | Contenu envoyé                       |
|-------------------------------------|---------------|--------------------------------------|
| « Continuer » à l'étape 1           | `partiel`     | Nom, téléphone, e-mail + attribution |
| Envoi final du formulaire           | `complet`     | Tous les champs + attribution        |

Les deux requêtes portent le **même `lead_id`**.

> ⚠️ **À configurer dans n8n** : le workflow doit rapprocher les deux envois sur `lead_id`
> et mettre à jour la fiche existante. Sans cela, chaque demande terminée créera **deux
> entrées**. Solution la plus simple : ne notifier l'équipe que sur
> `lead_status = "complet"`, et ranger les `partiel` dans une liste de relance.

Détails d'implémentation :

- L'envoi partiel est **silencieux** : aucune erreur n'est affichée et le passage à
  l'étape 2 n'est jamais bloqué, même si le webhook est injoignable.
- Il utilise `keepalive`, donc la requête aboutit même si l'onglet est fermé dans la foulée.
- Un retour à l'étape 1 ne renvoie un lead partiel **que si les coordonnées ont changé**.
- Le honeypot est vérifié avant l'envoi partiel comme avant l'envoi final.

### Anti-spam

Un champ caché `website` (honeypot) est présent. S'il est rempli, l'envoi est bloqué
côté navigateur. Vous pouvez ajouter un second filtre dans n8n si nécessaire.

## Suivi des conversions Google Ads

1. Dans `index.html`, dé-commentez le bloc `gtag` en haut de page et remplacez
   `AW-XXXXXXXXX` par votre identifiant Google Ads.
2. Dans `assets/js/main.js`, renseignez `CONFIG.adsConversionLabel` avec votre étiquette
   de conversion, au format `'AW-XXXXXXXXX/AbCdEfGhIjKlMnOp'`.

### Événements envoyés automatiquement

| Événement       | Déclenchement                                |
|-----------------|----------------------------------------------|
| `form_step`     | Passage à l'étape suivante du formulaire     |
| `lead_partial`  | Coordonnées transmises à l'étape 1           |
| `generate_lead` | Formulaire envoyé avec succès                |
| `conversion`    | Idem, si `adsConversionLabel` est renseigné  |
| `call_click`    | Clic sur un numéro de téléphone              |
| `cta_click`     | Clic sur un bouton « Devis »                 |
| `lead_error`    | Échec d'envoi du formulaire                  |
| `lead_partial_error` | Échec de l'envoi partiel                |

Chaque événement porte un attribut `element` identifiant l'emplacement exact du clic
(`cta_header`, `cta_hero`, `cta_mobilebar`, `cta_service_transferts`…), ce qui
permet de savoir quelle section convertit le mieux.

Tous les événements sont aussi poussés dans `window.dataLayer`, donc exploitables
directement depuis Google Tag Manager si vous préférez passer par GTM.

## Structure de la page

| Section       | Contenu |
|---------------|---------|
| En-tête       | Logo, ancres, bouton « Devis gratuit » |
| Hero          | H1, accroche, note 5/5 + **formulaire de devis visible sans défilement** |
| Confiance     | 24h/24 · Chauffeurs agréés · Tarifs transparents · Autorisation TT/34824/2023 *(masqué sur mobile, en attente de refonte)* |
| Services      | Les 6 services du site officiel |
| Comment ça marche | 3 étapes : décrivez → recevez le devis → voyagez |
| Flotte        | Voiture de luxe, Van, Minibus, Autocar (avec capacité) |
| À propos      | Arguments, compteurs animés, citation du fondateur |
| Avis          | Les 4 témoignages Google du site |
| Destinations  | Villes et aéroports desservis |
| FAQ           | 6 questions (prix, retard de vol, mise à disposition, paiement, capacité, zone) |
| Bouton final  | Un seul bouton centré « Demander un devis gratuit » |
| Pied de page  | Bandeau compact : logo, copyright, politique de confidentialité |
| Mobile        | Barre fixe en bas : un seul bouton « Demander un devis gratuit » |

## Écarts assumés par rapport à la page d'accueil

Ces choix servent le taux de conversion et le Quality Score :

- **Pas de menu de navigation vers d'autres pages.** Les liens du menu sont des ancres
  internes. Une landing page Ads ne doit pas offrir de porte de sortie.
- **Section blog remplacée par une FAQ.** Le blog envoyait le visiteur hors de la page ;
  la FAQ traite les objections (prix, retard de vol, paiement) au moment de décider.
- **Section « Destinations » ajoutée** pour renforcer la pertinence des mots-clés
  géographiques (« transfert aéroport Marrakech », « navette Casablanca »…).
- **Aucun bouton WhatsApp.** Le formulaire est le seul chemin de conversion, afin que
  chaque lead arrive dans n8n avec son `gclid` et ses `utm_*`. Un contact WhatsApp
  échappe au suivi : Google Ads ne peut pas l'attribuer à un mot-clé.
- **`noindex, follow`** dans les métadonnées : évite que cette page entre en concurrence
  avec le site officiel dans les résultats de recherche naturels.
- **Statistiques chiffrées** (10 ans, 98 %, 30 chauffeurs) : la page d'accueil affiche
  « + 0 » à cause d'un compteur Elementor mal configuré. **À corriger avec vos vrais
  chiffres** dans `index.html` (attributs `data-to`).

## À personnaliser avant diffusion

- [ ] Vérifier les chiffres des compteurs (`data-to` dans la section « À propos »)
- [ ] Renseigner les vraies URL Facebook / LinkedIn / Instagram dans le pied de page
- [ ] Vérifier le lien vers la politique de confidentialité (obligatoire pour Google Ads)
- [ ] Ajouter l'identifiant Google Ads et l'étiquette de conversion
- [ ] Tester un envoi réel du formulaire et vérifier la réception dans n8n
