import errorCodes from './errorCodes';

export default {
  'fr-FR': {
    [errorCodes.INVALID_EMAIL]: 'Adresse email invalide',
    [errorCodes.INVALID_PASSWORD_REQUIREMENTS]:
      'Les exigences de mot de passe ne sont pas respectées',
    [errorCodes.USERNAME_TOO_SHORT]: "Le nom d'utilisateur est trop court",
    [errorCodes.USER_ALREADY_EXISTS]: "L'utilisateur existe déjà",
    [errorCodes.USER_NOT_FOUND]: 'Utilisateur non trouvé',
    [errorCodes.INVALID_CREDENTIALS]: 'Identifiants invalides',
    [errorCodes.REFRESH_TOKEN_INVALID]:
      'Le token de rafraîchissement est invalide',
    [errorCodes.INVALID_ACCESS_TOKEN]: "Le token d'accès est invalide",
    [errorCodes.SYSTEM_NAME_INVALID]: 'Le nom du système est invalide',
    [errorCodes.SYSTEM_DESCRIPTION_INVALID]:
      'La description du système est invalide',
    [errorCodes.USER_ALREADY_HAS_SYSTEM]: "L'utilisateur a déjà un système",
    [errorCodes.USER_HAS_NO_SYSTEM]: "L'utilisateur n'a pas de système",
    [errorCodes.INVALID_MEMBER_NAME]: 'Le nom du membre est invalide',
    [errorCodes.INVALID_DESCRIPTION]: 'La description est invalide',
    [errorCodes.INVALID_PRONOUNS]:
      'Les pronoms sont invalides (doit être une chaîne de caractères)',
    [errorCodes.INVALID_ROLE_NAME]: 'Le nom du rôle est invalide',
    [errorCodes.SYSTEM_NOT_YOURS]: 'Ce système ne vous appartient pas',
    [errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM]:
      'Membre non trouvé dans le système',
    [errorCodes.SYSTEM_NOT_FOUND]: 'Système non trouvé',
    [errorCodes.INVALID_PRIVACY_SETTING]:
      'Paramètre de confidentialité invalide',
    [errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM]:
      'Champ personnalisé non trouvé dans le système',
    [errorCodes.CUSTOM_FIELD_NAME_INVALID]:
      'Le nom du champ personnalisé est invalide',
    [errorCodes.CUSTOM_FIELD_TYPE_INVALID]:
      'Le type du champ personnalisé est invalide',
    [errorCodes.CUSTOM_FIELD_VALUE_INVALID]:
      'La valeur du champ personnalisé est invalide',
    [errorCodes.CUSTOM_FIELD_ORDER_INVALID]:
      "L'ordre du champ personnalisé est invalide",
    [errorCodes.INVALID_FIELD_VALUE_FOR_TYPE]:
      'La valeur du champ est invalide pour le type spécifié',
    [errorCodes.UNKNOWN_FIELD_TYPE]: 'Type de champ inconnu',
    [errorCodes.FRONT_SESSION_NOT_FOUND_IN_SYSTEM]:
      'Session front non trouvée dans le système',
    [errorCodes.GROUP_NAME_INVALID]: 'Le nom du groupe est invalide',
    [errorCodes.GROUP_ICON_INVALID]: "L'icône du groupe est invalide",
    [errorCodes.GROUP_COLOR_INVALID]: 'La couleur du groupe est invalide',
    [errorCodes.GROUP_PARENT_ID_INVALID]: "L'ID du groupe parent est invalide",
    [errorCodes.IMPORT_DATA_MISSING_KEY]:
      "Donnée d'importation manquante : {key}",
    [errorCodes.IMPORT_DATA_INVALID_USER]:
      "Données d'importation invalides : l'utilisateur doit être un système",
    [errorCodes.GIFS_NOT_SUPPORTED]: 'Les GIFs ne sont pas supportés',
    [errorCodes.AVATAR_FILE_REQUIRED]: "Le fichier d'avatar est requis",
    [errorCodes.AVATAR_FORMAT_UNSUPPORTED]:
      "Le format de l'avatar n'est pas supporté (jpg, jpeg, png, webp)",
    [errorCodes.FRIENDSHIP_RECIPIENT_NOT_FOUND]:
      "Destinataire de l'amitié non trouvé",
    [errorCodes.FRIENDSHIP_ALREADY_EXISTS_OR_PENDING]:
      "L'amitié existe déjà ou est en attente",
    [errorCodes.FRIENDSHIP_NOT_FOUND]: 'Amitié non trouvée',
    [errorCodes.FRIENDSHIP_REQUEST_NOT_FOUND]: "Demande d'amitié non trouvée",
    [errorCodes.INVALID_USER_ID]: 'ID utilisateur invalide',
    [errorCodes.INVALID_SYSTEM_ID]: 'ID système invalide',
    [errorCodes.INVALID_MEMBER_ID]: 'ID membre invalide',
    [errorCodes.INVALID_FRIEND_REQUEST_ID]: "ID de demande d'amitié invalide",
    [errorCodes.INVALID_ACCEPT_VALUE]:
      "Valeur d'acceptation invalide (doit être true ou false)",
    [errorCodes.INVALID_FRIENDSHIP_TYPE]: "Type d'amitié invalide",
    [errorCodes.INVALID_COLOR]:
      'Couleur invalide (doit être un code hexadécimal)',
    [errorCodes.INVALID_FRIEND_REQUEST]:
      "Requête d'amitié invalide (doit inclure soit recipientId, soit username et federationUrl)",
    [errorCodes.CANNOT_FRIEND_SELF]: 'Vous ne pouvez pas vous ajouter en ami',
    [errorCodes.MEMBER_ALREADY_HAS_ACTIVE_SESSION]:
      'Le membre a déjà une session active',
    [errorCodes.IMPORT_DATA_MISSING_API_KEY]:
      "Donnée d'importation manquante : clé API",
    [errorCodes.IMPORT_DATA_INVALID_API_KEY]:
      "Donnée d'importation invalide : clé API invalide",
    [errorCodes.IMPORT_DATA_INVALID_CUSTOM_FIELDS]:
      "Donnée d'importation invalide : champs personnalisés invalides",
    [errorCodes.IMPORT_DATA_INVALID_MEMBERS]:
      "Donnée d'importation invalide : membres invalides",
    [errorCodes.IMPORT_DATA_INVALID_GROUPS]:
      "Donnée d'importation invalide : groupes invalides",
    [errorCodes.IMPORT_DATA_INVALID_PRIVACY_BUCKETS]:
      "Donnée d'importation invalide : compartiments de confidentialité invalides",
    [errorCodes.IMPORT_DATA_INVALID_FRONT_SESSIONS]:
      "Donnée d'importation invalide : sessions frontales invalides",
    [errorCodes.IMPORT_DATA_INVALID_POLLS]:
      "Donnée d'importation invalide : sondages invalides",
    [errorCodes.IMPORT_DATA_INVALID_CHAT_GROUPS]:
      "Donnée d'importation invalide : groupes de chat invalides",
    [errorCodes.IMPORT_DATA_INVALID_CHAT_CHANNELS]:
      "Donnée d'importation invalide : canaux de chat invalides",
    [errorCodes.IMPORT_DATA_INVALID_CHAT_MESSAGES]:
      "Donnée d'importation invalide : messages de chat invalides",
    [errorCodes.IMPORT_DATA_INVALID_BOARD_MESSAGES]:
      "Donnée d'importation invalide : messages de tableau invalides",
  },
};
