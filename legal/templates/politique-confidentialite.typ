#set page(
  paper: "a4",
  margin: (inside: 3.5cm, outside: 2cm, top: 3cm, bottom: 2.5cm),
  header: context [
    #if counter(page).get().first() > 4 [
      #align(right)[#text(8pt, fill: luma(120))[Politique de Confidentialité — Instance Mosaic]]
    ]
  ],
  footer: context [
    #if counter(page).get().first() > 4 [
      #align(center)[#text(9pt, fill: luma(100))[Page #counter(page).display()]]
    ]
  ]
)

#set text(
  font: "Liberation Sans",
  size: 11pt,
  lang: "fr",
  spacing: 120%
)

#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1.")

#let article-num = counter("article-num")

#let art(label) = context {
  let el = query(label).first()
  let n = article-num.at(el.location()).first()
  [Article #link(label)[#n]]
}

// Macro visuelle pour identifier les champs à compléter par l'admin
#let fillin(txt) = highlight(fill: rgb("#fbdadb"))[*[#txt]*]

// ==========================================
// 1. PREMIÈRE DE COUVERTURE
// ==========================================
#align(center)[
  #v(4cm)
  #text(36pt, weight: "bold", fill: rgb("#1d3557"))[MOSAIC]
  #v(1cm)
  #text(18pt, weight: "medium", fill: rgb("#457b9d"))[Politique de Confidentialité et de Protection des Données]
  #v(1cm)
  #text(13pt, style: "italic")[Modèle d'instance autonome et décentralisée]
  #v(2cm)
  #line(length: 50%, stroke: 2pt + rgb("#e63946"))
  #v(2cm)
  #text(14pt, style: "italic")[Outils numériques libres, éthiques et inclusifs \ pour la pluralité et la multiplicité]
]

#pagebreak()

#align(center + horizon)[
  #text(10pt, fill: luma(180), style: "italic")[Page laissée intentionnellement vide pour la reliure.]
]
#pagebreak()

#align(center)[
  #v(2cm)
  #text(24pt, weight: "bold", fill: rgb("#1d3557"))[POLITIQUE DE CONFIDENTIALITÉ]
  #v(0.5cm)
  #text(14pt, style: "italic")[Instance : #fillin("Nom de l'instance / URL")]
  #v(2cm)
  #line(length: 30%, stroke: 1pt + luma(150))
]

#v(2cm)
*Fiche d'identification de l'instance :*
- *Nom de l'instance :* #fillin("Ex: Mosaic Hub, Sanctuary Server...")
- *URL d'accès :* #fillin("https://mosaic.example.org")
- *Responsable de l'hébergement / Admin :* #fillin("Nom, pseudonyme ou entité gestionnaire")
- *Contact référent / DPO :* #fillin("contact-donnees@example.org")
- *Localisation de l'infrastructure principale :* #fillin("Hébergeur, Ville, Pays (ex: Hetzner, Allemagne)")
- *Hébergement des fichiers (Assets/Médias) :* #fillin("Hébergeur, Ville, Pays (Si différent, ex: Scaleway, France)")

#v(1cm)
*Version du document :* #fillin("1.0") \
*Date d'entrée en vigueur :* #fillin("JJ/MM/AAAA") \

#pagebreak()

#v(1cm)
#text(16pt, weight: "bold", fill: rgb("#1d3557"))[Préambule]
#v(0.5cm)

L'application *Mosaic* est un écosystème logiciel libre et décentralisé conçu pour offrir aux personnes concernées par la pluralité et la multiplicité des outils fiables, transparents et respectueux de leur intimité psychologique et de leur organisation collective.

La présente instance fonctionne de manière décentralisée et autonome. Son exploitant affirme son attachement indéfectible aux valeurs fondatrices portées par l'*Association Mosaic*. En opérant cette instance, l'administrateur souscrit expressément aux principes statutaires d'éthique, de non-commercialisation, de gratuité d'accès, d'absence de traque publicitaire et de protection renforcée des données personnelles sensibles.

Ce document expose en toute clarté aux utilisatrices et utilisateurs de l'instance la nature des données traitées, les mesures de sécurité mises en œuvre, ainsi que les modalités d'exercice de leurs droits fondamentaux sur leurs informations.

#v(1cm)
#text(16pt, weight: "bold")[Sommaire]
#v(0.5cm)
#outline(indent: 1.5em, depth: 2, title: none)

#pagebreak()

= Titre I : Cadre Général et Conformité Statutaire

#article-num.step() <responsable>
== Article 1 : Responsabilité de l'Exploitation
La présente instance de l'application Mosaic est administrée et opérée par *#fillin("Nom / Pseudo de l'administrateur ou organisation")* (ci-après désigné le « Responsable de l'Instance »).

Il est rappelé que l'Association Mosaic, éditrice du logiciel libre, n'est pas l'hébergeur de cette instance spécifique et ne dispose d'aucun accès technique aux bases de données ou aux contenus hébergés sur ce serveur.

#article-num.step() <conformite_statuts>
== Article 2 : Conformité aux Statuts et Principes Éthiques de Mosaic
Le Responsable de l'Instance s'engage formellement à aligner la gestion technique, morale et juridique de cette instance sur les principes directeurs et les clauses d'intangibilité des statuts de l'*Association Mosaic* (notamment ses Articles 22 et 24), à savoir :
- *L'interdiction absolue de commercialisation :* Aucune donnée personnelle, journal d'activité ou information de pluralité ne peut être vendue, louée, échangée ou exploitée à des fins lucratives ou publicitaires ;
- *L'absence de traqueurs commerciaux :* L'instance s'interdit d'intégrer toute régie publicitaire, pixel espion ou traceur comportemental tiers ;
- *L'esprit du Logiciel Libre :* L'instance s'engage à faire tourner une version intègre du code source de Mosaic, préservant la liberté des usagers et les protocoles de chiffrement recommandés.

#article-num.step() <base_legale>
== Article 3 : Base Légale et Consentement Explicite
Le traitement des données sur cette instance repose exclusivement sur :
- *L'exécution du service :* La fourniture des outils de synchronisation, d'organisation et de communication demandés par l'utilisateur ;
- *Le consentement explicite et renforcé (Art. 9 du RGPD) :* Les données gérées touchant potentiellement à la santé mentale et à la pluralité, l'utilisateur consent expressément à leur stockage technique au moment de la création de son compte.

= Titre II : Données Collectées et Nature Sensible

#article-num.step() <donnees_compte>
== Article 4 : Données de Compte et Techniques
Pour assurer l'accès au service et la sécurité de l'infrastructure, l'instance collecte :
- *Données de compte :* Adresse e-mail, identifiant/pseudo, mot de passe haché de manière sécurisée (Argon2) ;

#article-num.step() <donnees_pluralite>
== Article 5 : Données de Pluralité (Données Sensibles)
L'application Mosaic permet d'enregistrer et de synchroniser des données intimes relatives au fonctionnement du système plural, comprenant notamment :
- Fiches de membres/alters (noms, pronoms, rôles, descriptions, avatars, préférences) ;
- Historiques et journaux de front (horodatages des changements de contrôle du corps) ;
- Notes personnelles, journaux intimes, alertes, règles internes au système et statuts ;
- Liens de partage ou d'amis établis avec d'autres systèmes de l'instance ou du réseau.

Ces données sont considérées comme *strictement confidentielles* et relèvent de la sphère privée la plus intime des usagers.

= Titre III : Sécurité, Hébergement et Confidentialité

#article-num.step() <hebergement>
== Article 6 : Hébergement et Souveraineté des Données
L'infrastructure technique de l'instance peut être répartie afin d'optimiser le stockage et la sécurité. Les données sont hébergées de la manière suivante :
- *Données textuelles et bases de données :* Elles sont hébergées sur des serveurs fournis par *#fillin("Nom du fournisseur principal, ex: OVHcloud, Hetzner")*, situés physiquement en *#fillin("Pays / Région, ex: France, Union Européenne")*.
- *Fichiers médias et ressources (avatars, images, etc.) :* Afin de garantir les performances du service, ces fichiers peuvent être stockés sur une infrastructure distincte dédiée (Object Storage), fournie par *#fillin("Nom du fournisseur de stockage, ex: Scaleway, AWS, MinIO")*, située en *#fillin("Pays / Région")*.

Le Responsable de l'Instance veille à ce que l'ensemble des prestataires d'hébergement sélectionnés garantissent des standards rigoureux de sécurité physique et réseau conformes aux exigences du RGPD.

#article-num.step() <securite_technique>
== Article 7 : Mesures de Sécurité et Chiffrement
Afin de préserver la confidentialité des données, le Responsable de l'Instance met en œuvre :
- Le chiffrement systématique de toutes les communications en transit via le protocole TLS/HTTPS ;
- Le stockage sécurisé des identifiants avec des algorithmes de hachage robustes ;
- #fillin("Le chiffrement des sauvegardes au repos (Backups chiffrées)") ;
- Un accès restreint aux serveurs, à l'espace de stockage des fichiers et aux bases de données, limité aux strictes nécessités d'administration technique et protégé par authentification forte.

#article-num.step() <confidentialite_admin>
== Article 8 : Devoir de Réserve de l'Administration
Le Responsable de l'Instance et ses éventuels co-administrateurs techniques s'astreignent à un strict devoir de réserve. Ils s'interdisent formellement d'accéder, de lire, d'extraire ou de divulguer le contenu des journaux, des fiches de membres ou des messages des utilisateurs, sauf demande explicite d'assistance technique formulée par le titulaire du compte ou obligation légale impérative.

= Titre IV : Droits des Utilisatrices et Utilisateurs

#article-num.step() <droits_rgpd>
== Article 9 : Droits d'Accès, de Rectification et de Portabilité
Conformément à la réglementation applicable (RGPD), chaque utilisateur dispose des droits suivants :
- *Droit d'accès et d'exportation :* Vous pouvez à tout moment exporter l'ensemble de vos données sous un format ouvert et structuré (#fillin("JSON / CSV")) directement depuis les paramètres de votre application ;
- *Droit de rectification :* Toutes les données de pluralité et de compte (ainsi que les médias qui y sont attachés) sont modifiables en temps réel depuis l'interface ;
- *Droit à la portabilité :* Vous pouvez importer votre archive de données vers une autre instance Mosaic compatible ou vers tout outil alternatif respectant les mêmes standards d'interopérabilité.

#article-num.step() <effacement>
== Article 10 : Droit à l'Effacement et Rétention
Chaque utilisateur peut demander la suppression complète et irréversible de son compte à tout moment depuis l'application ou en contactant le support :
- La suppression entraîne l'effacement immédiat des données de la base active et de tous les fichiers médias liés hébergés sur nos serveurs de stockage ;
- Dans les sauvegardes de sécurité (backups), les données résiduelles chiffrées sont définitivement écrasées selon un cycle de rétention de *#fillin("ex: 14 à 30 jours")*.

#article-num.step() <cookies>
== Article 11 : Traceurs et Stockage Local
L'instance Mosaic n'utilise aucun cookie tiers ni aucun traceur publicitaire ou statistique externe.
Seuls sont utilisés des témoins de session ou des mécanismes de stockage local (Local Storage / Session Storage) *strictement nécessaires* au maintien de la connexion utilisateur et à la persistance de l'affichage (thèmes, préférences d'accessibilité).

= Titre V : Contact et Mises à Jour

#article-num.step() <contact>
== Article 12 : Contact et Réclamations
Pour toute question relative à l'application de la présente politique ou pour exercer vos droits, vous pouvez contacter l'administration de l'instance à : \
#align(center)[*#fillin("Adresse e-mail de contact dédiée ou formulaire de support")*]

Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous avez la faculté d'adresser une réclamation auprès de l'autorité compétente en matière de protection des données (la CNIL en France).

#article-num.step() <modifications>
== Article 13 : Révision de la Politique
Le Responsable de l'Instance se réserve le droit d'adapter la présente politique pour refléter les évolutions techniques ou légales. Les utilisateurs seront informés de toute modification substantielle par une notification intégrée à l'application ou par courriel au moins *#fillin("15 jours")* avant son entrée en vigueur.