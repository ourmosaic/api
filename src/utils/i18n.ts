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
        [errorCodes.USER_HAS_NO_SYSTEM]: "L'utilisateur n'a pas de système"
    }
}