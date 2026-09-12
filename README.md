# Landing page Google Ads : Marassa Sky Tours

Landing page statique en français, calquée sur la structure de la page d'accueil de
[marassasky-tours.ma](https://marassasky-tours.ma/), optimisée pour les campagnes Google Ads.

## Contenu

```
index.html              La page complète
assets/css/style.css    Styles (palette et typographie du site officiel)
assets/js/main.js       Formulaire, attribution UTM/GCLID, compteurs, suivi
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
  "telephone": "+212 6 12 34 56 78",
  "email": "karim@exemple.com",

  "gclid": "Cj0KCQ...",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "transfert-aeroport-maroc",
  "utm_term": "transfert aeroport casablanca",
  "utm_content": "annonce-a",

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

### Formulaire en 3 étapes

Le formulaire est découpé en trois étapes (**Trajet → Passagers → Contact**) avec une barre
de progression. Les choix se font par tuiles et puces cliquables plutôt que par listes
déroulantes, ce qui réduit nettement l'abandon sur mobile.

- Les coordonnées ne sont demandées qu'à la **dernière** étape, une fois le visiteur engagé.
- L'étape 3 affiche un récapitulatif du trajet choisi avant validation.
- La validation est faite étape par étape, avec surlignage des champs manquants.
- Les valeurs des étapes précédentes restent dans le `FormData` : la charge utile envoyée
  à n8n est identique quelle que soit l'étape où elles ont été saisies.
- Le formulaire **nécessite JavaScript** : l'envoi passe par `fetch` vers n8n et les étapes
  2 et 3 portent l'attribut `hidden` dans le HTML, pour éviter qu'elles clignotent au
  chargement avant l'initialisation.

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
| `generate_lead` | Formulaire envoyé avec succès                |
| `conversion`    | Idem, si `adsConversionLabel` est renseigné  |
| `call_click`    | Clic sur un numéro de téléphone              |
| `cta_click`     | Clic sur un bouton « Devis »                 |
| `lead_error`    | Échec d'envoi du formulaire                  |

Chaque événement porte un attribut `element` identifiant l'emplacement exact du clic
(`cta_header`, `cta_hero`, `cta_mobilebar`, `cta_service_transferts`…), ce qui
permet de savoir quelle section convertit le mieux.

Tous les événements sont aussi poussés dans `window.dataLayer`, donc exploitables
directement depuis Google Tag Manager si vous préférez passer par GTM.

## Structure de la page

| Section       | Contenu |
|---------------|---------|
| En-tête       | Logo, ancres, téléphone cliquable, bouton « Devis gratuit » |
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
