const readline = require('readline');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const locales = {
    fr: {
        welcome: "Bienvenue dans la configuration de l'API Mosaic",
        chooseYourLanguage: "Choisissez votre langue ",
        instanceAddr: "Entrez l'adresse de votre instance Mosaic",
        invalidAddr: "Adresse invalide. Veuillez entrer une URL valide commençant par http:// ou https://",
        allowRegistration: "Autoriser l'inscription des utilisateurs ? (oui/non)",
        databaseUrl: "Entrez l'URL de la base de données... (laisser vide pour défaut)",
        minioUrl: "Entrez le domaine MinIO... (laisser vide pour défaut)",
        minioPort: "Entrez le port MinIO... (laisser vide pour défaut)",
        shouldUseSsl: "Utiliser SSL pour la connexion MinIO ? (oui/non)",
        minioUser: "Entrez le nom d'utilisateur MinIO... (laisser vide pour défaut)",
        minioPassword: "Entrez le mot de passe MinIO... (laisser vide pour défaut)",
        settingUp: "Configuration de l'API Mosaic en cours...",
        setupComplete: "Configuration de l'API Mosaic terminée ! Votre configuration a été enregistrée dans setup.env. Vérifiez son contenu et renommez-le en .env avant de démarrer le serveur API.",
        generatingKeys: "Génération des clés RSA pour votre instance...",
        keysGenerated: "Clés RSA générées et enregistrées dans private.key et public.key !",
        important: "IMPORTANT : NE PARTAGEZ PAS VOTRE CLÉ PRIVÉE AVEC QUICONQUE. GARDEZ-LA EN SÉCURITÉ. SI VOTRE CLÉ PRIVÉE EST COMPROMISE, VOTRE INSTANCE PEUT ÊTRE À RISQUE.",
        shouldRunPrisma: "Voulez-vous exécuter les migrations Prisma maintenant ? (oui/non)",
        runningPrisma: "Exécution des migrations Prisma...",
        runningGeneration: "Génération du client Prisma...",
        prismaGenerated: "Client Prisma généré avec succès !",
        prismaFailed: "Échec de l'exécution des migrations Prisma. Veuillez vérifier le message d'erreur ci-dessous et exécuter 'npx prisma migrate deploy' manuellement dans le répertoire src.",
        generationFailed: "Échec de la génération du client Prisma. Veuillez vérifier le message d'erreur ci-dessous et exécuter 'npx prisma generate' manuellement dans le répertoire src.",
        setupCompleteMessage: "La configuration est terminée ! Veuillez vérifier le fichier setup.env, le renommer en .env et démarrer votre serveur API Mosaic. Merci d'utiliser Mosaic !",
        env: {
            welcome: "Bienvenue dans le fichier .env de l'API Mosaic. Vous pouvez modifier ces valeurs selon vos besoins.",
            instanceAddr: "L'adresse où votre instance Mosaic sera accessible. Assurez-vous d'inclure le protocole (http:// ou https://).",
            allowRegistration: "Définissez sur true pour permettre aux utilisateurs de s'inscrire eux-mêmes. Si false, personne ne peut créer de comptes utilisateur. Les administrateurs devront créer des comptes manuellement dans la base de données.",
            databaseUrl: "URL de connexion à la base de données. La valeur par défaut est configurée pour une instance PostgreSQL locale.",
            minio: "Configuration MinIO pour le stockage des avatars. Assurez-vous de définir ces valeurs en fonction de votre configuration MinIO.",
            jwt: "Secrets JWT pour signer les tokens d'accès et de rafraîchissement. Ceux-ci sont générés aléatoirement lors de la configuration pour des raisons de sécurité."
        }
    },
    en: {
        welcome: "Welcome to the Mosaic API setup",
        chooseYourLanguage: "Choose your language ",
        instanceAddr: "Enter the address for your Mosaic instance",
        invalidAddr: "Invalid address. Please enter a valid URL starting with http:// or https://",
        allowRegistration: "Allow user registration? (yes/no)",
        databaseUrl: "Enter database URL... (blank for default)",
        minioUrl: "Enter MinIO domain... (blank for default)",
        minioPort: "Enter MinIO port... (blank for default)",
        shouldUseSsl: "Use SSL for MinIO connection? (yes/no)",
        minioUser: "Enter MinIO username... (blank for default)",
        minioPassword: "Enter MinIO password... (blank for default)",
        settingUp: "Setting up Mosaic API...",
        setupComplete: "Mosaic API setup complete! Your configuration has been saved to setup.env. Review its contents and rename it to .env before starting the API server.",
        generatingKeys: "Generating RSA keys for your instance...",
        keysGenerated: "RSA keys generated and saved to private.key and public.key!",
        important: "IMPORTANT: DO NOT SHARE YOUR PRIVATE KEY WITH ANYONE. KEEP IT SAFE AND SECURE. IF YOUR PRIVATE KEY IS COMPROMISED, YOUR INSTANCE MAY BE AT RISK.",
        shouldRunPrisma: "Do you want to run Prisma migrations now? (yes/no)",
        runningPrisma: "Running Prisma migrations...",
        runningGeneration: "Generating Prisma client...",
        prismaGenerated: "Prisma client generated successfully!",
        prismaFailed: "Failed to run Prisma migrations. Please check the error message below and run 'npx prisma migrate deploy' manually in the src directory.",
        generationFailed: "Failed to generate Prisma client. Please check the error message below and run 'npx prisma generate' manually in the src directory.",
        setupCompleteMessage: "Setup is complete! Please review the setup.env file, rename it to .env, and start your Mosaic API server. Thank you for using Mosaic!",
        env: {
            welcome: "Welcome to the Mosaic API .env file. You can modify these values as needed.",
            instanceAddr: "The address where your Mosaic Instance will be accessible. Make sure to include the protocol (http:// or https://).",
            allowRegistration: "Set to true to allow users to register themselves. If false, no one can create user accounts. Administrators will need to create accounts manually in the database.",
            databaseUrl: "Database connection URL. The default is configured for a local PostgreSQL instance.",
            minio: "MinIO configuration for avatar storage. Make sure to set these values according to your MinIO setup.",
            jwt: "JWT secrets for signing access and refresh tokens. These are generated randomly during setup for security."
        },
    }
}

function askQuestion(query) {
    return new Promise(resolve => rl.question(`> ${query}\n  > `, ans => resolve(ans)));
}

async function main() {
    console.log(`

      █████████████████████████████████████      
   ███████████████████████████████████████████   
  █████████████████████████████████████████████  
 ██████▒▒▒▒▒█████████████████████████░░░░░██████ 
██████▒▒▒▒▒▒█████████████████████████░░░░░░██████
██████▒▒▒▒▒▒█████████████████████████░░░░░░██████
████████▒▒▓███████████████████████████▒▒▒████████
███████    ████░░░░███████████░░░░████    ███████
██████      ██░░░░░░█████████░░░░░░██ ░░   ██████
██████      ██░░░░░░█████████░░░░░░██  ░░  ██████
███████    ████░░░░███████████░░░░████  ░░███████
███████░░░░███████████░░░░░███████████    ███████
██████░░░░░░█████████░░░░░░░█████████      ██████
██████░░░░░░█████████░░░░░░░█████████      ██████
███████░░░░███████████░░░░░███████████    ███████
███████░░░░███████████████████████████    ███████
██████░░░░░░█████████████████████████      ██████
██████░░░░░░█████████████████████████      ██████
███████░░░░███████████████████████████    ███████
████████▒▒▒███████████████████████████▒░░████████
██████░░░░░░█████████████████████████░░░░░░██████
██████░░░░░░█████████████████████████░░░░░░██████
 ██████░░░░░█████████████████████████░░░░░██████ 
  █████████████████████████████████████████████  
   ███████████████████████████████████████████   
      █████████████████████████████████████      
`)
    console.log(`${locales.en.welcome} / ${locales.fr.welcome}`);

    const locale = await askQuestion(`${locales.en.chooseYourLanguage} (en/fr)`);
    const selectedLocale = locales[locale.toLowerCase()] || locales.en;

    const instanceAddr = await askQuestion(`${selectedLocale.instanceAddr}`);
    // check if the address is valid
    if (!/^https?:\/\/[^\s]+$/.test(instanceAddr)) {
        console.error(`${selectedLocale.invalidAddr}`);
        process.exit(1);
    }

    const allowRegistrationAnswer = await askQuestion(`${selectedLocale.allowRegistration}`);
    const allowRegistration = allowRegistrationAnswer.toLowerCase() === 'yes' || allowRegistrationAnswer.toLowerCase() === 'y' || allowRegistrationAnswer.toLowerCase() === 'oui' || allowRegistrationAnswer.toLowerCase() === 'o';

    let databaseUrl = await askQuestion(`${selectedLocale.databaseUrl}`);
    if (!databaseUrl) databaseUrl = 'postgresql://mosaic_user:mosaic_password@localhost:5433/mosaic_db?schema=public';

    let minioUrl = await askQuestion(`${selectedLocale.minioUrl}`);
    if (!minioUrl) minioUrl = 'localhost';
    
    let minioPort = await askQuestion(`${selectedLocale.minioPort}`);
    if (!minioPort) minioPort = '9000';

    let shouldUseSslAnswer = await askQuestion(`${selectedLocale.shouldUseSsl}`);
    const shouldUseSsl = shouldUseSslAnswer.toLowerCase() === 'yes' || shouldUseSslAnswer.toLowerCase() === 'y' || shouldUseSslAnswer.toLowerCase() === 'oui' || shouldUseSslAnswer.toLowerCase() === 'o';

    let minioUser = await askQuestion(`${selectedLocale.minioUser}`);
    if (!minioUser) minioUser = 'minio_user';

    let minioPassword = await askQuestion(`${selectedLocale.minioPassword}`);
    if (!minioPassword) minioPassword = 'minio_password';

    const spinner = ora.default({spinner: ora.spinners.dots}).start(selectedLocale.settingUp);

    const jwtAccessSecret = crypto.randomBytes(32).toString('hex');
    const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

    const envContent = `# ${selectedLocale.env.welcome}

# ${selectedLocale.env.instanceAddr}
INSTANCE_ADDR=${instanceAddr}

# ${selectedLocale.env.allowRegistration}
ALLOW_REGISTRATION=${allowRegistration}

# ${selectedLocale.env.databaseUrl}
DATABASE_URL=${databaseUrl}

# ${selectedLocale.env.minio}
MINIO_ENDPOINT=${minioUrl}
MINIO_PORT=${minioPort}
MINIO_USE_SSL=${shouldUseSsl}
MINIO_ACCESS_KEY=${minioUser}
MINIO_SECRET_KEY=${minioPassword}

# ${selectedLocale.env.jwt}
JWT_ACCESS_SECRET=${jwtAccessSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
`;

    fs.writeFileSync(path.join(__dirname, 'setup.env'), envContent);
    spinner.succeed(selectedLocale.setupComplete);
    
    const keysSpinner = ora.default({spinner: ora.spinners.dots}).start(selectedLocale.generatingKeys);
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    fs.writeFileSync(path.join(__dirname, 'private.key'), privateKey);
    fs.writeFileSync(path.join(__dirname, 'public.key'), publicKey);
    keysSpinner.succeed(selectedLocale.keysGenerated);
    console.log('\x1b[31m%s\x1b[0m', selectedLocale.privateKeyWarning);

    const shouldRunPrisma = await askQuestion(selectedLocale.shouldRunPrisma);
    if (shouldRunPrisma.toLowerCase() === 'yes' || shouldRunPrisma.toLowerCase() === 'y' || shouldRunPrisma.toLowerCase() === 'oui' || shouldRunPrisma.toLowerCase() === 'o') {
        const prismaSpinner = ora.default({spinner: ora.spinners.dots}).start(selectedLocale.runningPrisma);
        await new Promise((resolve, reject) => {
            exec('npx prisma migrate deploy', { cwd: path.join(__dirname) }, (error, stdout, stderr) => {
                if (error) {
                    prismaSpinner.fail(selectedLocale.prismaFailed);
                    console.error(error);
                    reject(error);
                } else {
                    prismaSpinner.succeed(selectedLocale.prismaGenerated);
                    console.log(stdout);
                    resolve();
                }
            });
        });
        const generationSpinner = ora.default({spinner: ora.spinners.dots}).start(selectedLocale.runningGeneration);
        await new Promise((resolve, reject) => {
            exec('npx prisma generate', { cwd: path.join(__dirname) }, (error, stdout, stderr) => {
                if (error) {
                    generationSpinner.fail(selectedLocale.generationFailed);
                    console.error(error);
                    reject(error);
                } else {
                    generationSpinner.succeed(selectedLocale.prismaGenerated);
                    console.log(stdout);
                    resolve();
                }
            });
        });
    }

    console.log(selectedLocale.setupCompleteMessage);
    rl.close();
}

main();