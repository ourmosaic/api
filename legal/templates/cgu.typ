#set page(
  paper: "a4",
  margin: (inside: 3.5cm, outside: 2cm, top: 3cm, bottom: 2.5cm),
  header: context [
    #if counter(page).get().first() > 2 [
      #align(right)[#text(8pt, fill: luma(120))[Conditions Générales d'Utilisation — Instance Mosaic]]
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
  #text(18pt, weight: "medium", fill: rgb("#457b9d"))[Conditions Générales d'Utilisation (CGU)]
  #v(1cm)
  #text(13pt, style: "italic")[Instance : #fillin("Nom de l'instance / URL")]
  #v(2cm)
  #line(length: 50%, stroke: 2pt + rgb("#e63946"))
  #v(2cm)
  #text(12pt, style: "italic")[Règles d'utilisation du service et limitations de responsabilité]
]

#pagebreak()

= Objet et Acceptation

Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles l'administration de l'instance *#fillin("Nom de l'instance")* (ci-après « l'Instance ») met à disposition de ses utilisatrices et utilisateurs l'application *Mosaic*.

La création d'un compte sur l'Instance et l'utilisation des services de Mosaic impliquent l'acceptation pleine, entière et sans réserve des présentes CGU. Si vous n'acceptez pas ces conditions, vous êtes invité·e à ne pas utiliser cette Instance.

= Accès au Service et Disponibilité (Best Effort)

L'Instance est fournie et maintenue à titre bénévole et non professionnel. Le Responsable de l'Instance s'efforce de maintenir un accès continu et sécurisé au service (« Best Effort »).

Toutefois, l'accès à l'application peut être temporairement suspendu pour des raisons de maintenance technique, de mise à jour, ou en raison de pannes matérielles ou réseaux indépendantes de la volonté de l'administration.

= Règles de Bonne Conduite

En utilisant l'Instance, l'utilisateur s'engage à :
- Ne pas utiliser le service à des fins illégales, malveillantes ou discriminatoires ;
- Ne pas tenter de contourner les mesures de sécurité, de saturer l'infrastructure (attaques DDoS, envois massifs de requêtes abusives) ou d'accéder aux données d'autres systèmes sans autorisation ;
- Ne pas héberger ou diffuser via les fonctionnalités de médias (avatars, images) de contenus pénalement répréhensibles (incitation à la haine, contenus pédopornographiques, apologie de crimes, etc.).

= Modération et Suspension de Compte

L'administration de l'Instance se réserve le droit formel, sans préavis ni indemnité, de suspendre, limiter ou supprimer définitivement l'accès au compte de tout utilisateur ou système dont le comportement violerait les présentes CGU, compromettrait la sécurité du serveur, ou porterait atteinte à la communauté.

= Limitation de Responsabilité et Sauvegarde des Données

L'Instance fournit un outil numérique destiné à faciliter l'organisation des systèmes pluraux. *En aucun cas l'Instance, son administration ou l'Association Mosaic ne fournissent de services de santé, de diagnostic médical ou de thérapie psychiatrique.*

*Avertissement sur la perte de données :* Le service est fourni « en l'état » et « selon les disponibilités ». L'administration décline toute responsabilité en cas de perte de données, de corruption de base de données, de piratage ou de défaillance matérielle.

*Il est de la responsabilité exclusive de chaque utilisateur de procéder régulièrement à des sauvegardes et exportations de ses propres données* (via les outils d'exportation intégrés à l'application). Le Responsable de l'Instance ne pourra être tenu pour responsable d'aucun dommage direct ou indirect lié à la perte de journaux de front, de notes intimes ou de fiches de membres.

= Évolution des CGU

Les présentes CGU peuvent être modifiées ou adaptées à tout moment, notamment pour prendre en compte des évolutions techniques ou légales. Les utilisateurs seront informés de toute mise à jour significative par le biais de l'application ou par courriel. L'utilisation continue de l'Instance après modification vaut acceptation des nouvelles CGU.