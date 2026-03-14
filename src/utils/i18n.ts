import errorCodes from "./errorCodes";

export default {
    "fr-FR": {
        [errorCodes.INVALID_EMAIL]: "Adresse email invalide",
        [errorCodes.INVALID_PASSWORD_REQUIREMENTS]: "Les exigences de mot de passe ne sont pas respectées",
        [errorCodes.USERNAME_TOO_SHORT]: "Le nom d'utilisateur est trop court",
        [errorCodes.USER_ALREADY_EXISTS]: "L'utilisateur existe déjà",
        [errorCodes.USER_NOT_FOUND]: "Utilisateur non trouvé",
        [errorCodes.INVALID_CREDENTIALS]: "Identifiants invalides",
        [errorCodes.REFRESH_TOKEN_INVALID]: "Le token de rafraîchissement est invalide",
        [errorCodes.INVALID_ACCESS_TOKEN]: "Le token d'accès est invalide",
        [errorCodes.SYSTEM_NAME_INVALID]: "Le nom du système est invalide",
        [errorCodes.SYSTEM_DESCRIPTION_INVALID]: "La description du système est invalide",
        [errorCodes.USER_HAS_NO_SYSTEM]: "L'utilisateur n'a pas de système",
        [errorCodes.INVALID_MEMBER_NAME]: "Le nom du membre est invalide",
        [errorCodes.INVALID_DESCRIPTION]: "La description est invalide",
        [errorCodes.INVALID_PRONOUNS]: "Les pronoms sont invalides (doit être une chaîne de caractères)",
        [errorCodes.INVALID_ROLE_NAME]: "Le nom du rôle est invalide",
        [errorCodes.SYSTEM_NOT_YOURS]: "Ce système ne vous appartient pas",
        [errorCodes.MEMBER_NOT_FOUND_IN_SYSTEM]: "Membre non trouvé dans le système",
        [errorCodes.SYSTEM_NOT_FOUND]: "Système non trouvé",
        [errorCodes.INVALID_PRIVACY_SETTING]: "Paramètre de confidentialité invalide",
        [errorCodes.CUSTOM_FIELD_NOT_FOUND_IN_SYSTEM]: "Champ personnalisé non trouvé dans le système",
        [errorCodes.CUSTOM_FIELD_NAME_INVALID]: "Le nom du champ personnalisé est invalide",
        [errorCodes.CUSTOM_FIELD_TYPE_INVALID]: "Le type du champ personnalisé est invalide",
        [errorCodes.CUSTOM_FIELD_VALUE_INVALID]: "La valeur du champ personnalisé est invalide",
        [errorCodes.CUSTOM_FIELD_ORDER_INVALID]: "L'ordre du champ personnalisé est invalide",
        [errorCodes.INVALID_FIELD_VALUE_FOR_TYPE]: "La valeur du champ est invalide pour le type spécifié",
        [errorCodes.UNKNOWN_FIELD_TYPE]: "Type de champ inconnu"
    }
}