#set page(
  paper: "a4",
  margin: (inside: 3.5cm, outside: 2cm, top: 3cm, bottom: 2.5cm),
  header: context [
    #if counter(page).get().first() > 2 [
      #align(right)[#text(8pt, fill: luma(120))[Mentions Légales — Instance Mosaic]]
    ]
  ],
  footer: context [
    #if counter(page).get().first() > 2 [
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
#set heading(numbering: "1.")

#let fillin(txt) = highlight(fill: rgb("#fbdadb"))[*[#txt]*]

#align(center)[
  #v(4cm)
  #text(36pt, weight: "bold", fill: rgb("#1d3557"))[MOSAIC]
  #v(1cm)
  #text(18pt, weight: "medium", fill: rgb("#457b9d"))[Mentions Légales]
  #v(1cm)
  #text(13pt, style: "italic")[Instance : #fillin("Nom de l'instance / URL")]
  #v(2cm)
  #line(length: 50%, stroke: 2pt + rgb("#e63946"))
  #v(2cm)
  #text(12pt, style: "italic")[Document édité en conformité avec l'article 6-III \ de la Loi n°2004-575 du 21 juin 2004 (LCEN)]
]

#pagebreak()

= Éditeur de l'Instance

La présente instance de l'application *Mosaic*, accessible à l'adresse URL *#fillin("https://mosaic.example.org")*, est éditée à titre non professionnel.

Conformément à l'article 6-III, 2° de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'éditeur de ce service, agissant en tant que personne physique à titre non professionnel, a choisi de préserver son anonymat.

Ses éléments d'identification personnelle (nom, prénom, adresse) ont été préalablement et légalement communiqués à l'hébergeur désigné à l'Article 2 des présentes mentions légales. L'hébergeur est tenu au secret professionnel mais a l'obligation légale de fournir ces éléments aux autorités judiciaires en cas de réquisition.

*Nom d'usage ou Pseudonyme de l'éditeur :* #fillin("Ex: Le collectif de Sanctuary, L'équipe d'administration...") \
*Contact de l'administration :* #fillin("contact-admin@example.org")

= Hébergement

L'infrastructure technique de l'instance est confiée à des prestataires professionnels qui en assurent le stockage physique et la connectivité.

*Hébergement principal (Application et base de données) :*
- *Raison sociale de l'hébergeur :* #fillin("Nom de l'entreprise, ex: Hetzner Online GmbH")
- *Adresse postale :* #fillin("Adresse complète du siège, ex: Industriestr. 25, 91710 Gunzenhausen, Allemagne")
- *Numéro de téléphone :* #fillin("Numéro de contact de l'hébergeur, ex: +49 9831 505-0")

*Hébergement secondaire (Fichiers médias et Object Storage) :*
- *Raison sociale de l'hébergeur :* #fillin("Nom de l'entreprise, ex: Scaleway SAS")
- *Adresse postale :* #fillin("Adresse complète, ex: 8 rue de la Ville l'Evêque, 75008 Paris, France")
- *Numéro de téléphone :* #fillin("Numéro de contact, ex: +33 (0)1 84 13 00 00")
*(Note à l'administrateur : Supprimer ce paragraphe si vous n'utilisez qu'un seul hébergeur)*

= Propriété Intellectuelle et Licence du Logiciel

L'application *Mosaic* est développée par l'Association Mosaic et ses contributeurs. Son code source est mis à disposition sous la licence *PolyForm Noncommercial License 1.0.0*.

Cette licence autorise expressément l'utilisation, la modification et la distribution du logiciel à des fins strictement personnelles, de recherche, associatives ou d'intérêt public, en interdisant formellement toute exploitation commerciale. Les termes complets de la licence sont consultables à l'adresse suivante : #link("https://polyformproject.org/licenses/noncommercial/1.0.0").

Conformément aux exigences de la licence, la mention de droits d'auteur suivante s'applique au logiciel :

> *Required Notice: Copyright Ourmosaic (#link("https://github.com/ourmosaic"))*

Le code du logiciel, ses logos et ses marques déposées demeurent la propriété de leurs auteurs respectifs.

Toutefois, *les contenus générés, publiés et stockés par les utilisatrices et utilisateurs* (textes, avatars, fiches, journaux intimes) sur cette instance demeurent leur propriété intellectuelle exclusive et relèvent de leur stricte sphère privée. L'éditeur de l'instance ne revendique aucun droit sur les informations relatives au fonctionnement des systèmes pluraux hébergés.

= Signalement de contenus illicites

Conformément à la législation en vigueur, tout utilisateur ou tiers peut signaler à l'hébergeur ou à l'éditeur la présence d'un contenu qu'il juge illicite (apologie de crimes, incitation à la haine, pédopornographie, etc.).

Ces signalements doivent être adressés en priorité à l'adresse suivante : \
*#fillin("adresse-signalement@example.org")*

Il est rappelé que le fait de présenter à un hébergeur ou à un éditeur un contenu comme étant illicite dans le seul but d'en obtenir le retrait, alors que l'on sait cette information inexacte, est puni par la loi.