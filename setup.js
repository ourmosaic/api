const readline = require('readline');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

const spinnerApi = ora.default ?? ora;
const spinnerPresets = ora.spinners ?? spinnerApi.spinners;
const dotsSpinner = spinnerPresets?.dots ?? 'dots';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const setupFilePath = path.join(__dirname, 'setup.env');
const privateKeyPath = path.join(__dirname, 'private.key');
const publicKeyPath = path.join(__dirname, 'public.key');

const locales = {
    fr: {
        welcome: "Bienvenue dans la configuration de l'API Mosaic",
        chooseYourLanguage: 'Choisissez votre langue (en/fr)',
        legalIntro: "Des modèles pour les documents légaux se trouvent dans le dossier legal/. Si vous ne les avez pas encore remplis, vous pouvez les compléter plus tard.",
        instanceName: "Nom de l'instance Mosaic (par exemple api.ourmosaic.space)",
        instanceAddr: "Adresse de fédération de l'instance (laisser vide pour reprendre le nom de l'instance)",
        frontendUrl: 'URL du frontend public (par exemple https://ourmosaic.space)',
        invalidUrl: 'Adresse invalide. Veuillez entrer une URL valide commençant par http:// ou https://',
        legalPrivacyPrompt: 'URL de la politique de confidentialité (laisser vide pour utiliser la valeur par défaut de stockage)',
        legalTosPrompt: 'URL des Conditions Générales d\'Utilisation (CGU) (laisser vide pour utiliser la valeur par défaut de stockage)',
        legalMentionsPrompt: 'URL des mentions légales (laisser vide pour utiliser la valeur par défaut de stockage)',
        databaseUrl: 'URL de la base de données',
        redisUrl: 'URL Redis',
        minioEndpoint: 'Hôte MinIO (vous pouvez coller une URL complète, elle sera normalisée)',
        minioPort: 'Port MinIO',
        minioUseSsl: 'Utiliser SSL pour MinIO ? (oui/non)',
        minioAccessKey: "Clé d'accès MinIO",
        minioSecretKey: 'Clé secrète MinIO',
        smtpHost: 'Hôte SMTP',
        smtpPort: 'Port SMTP',
        smtpSecure: 'Utiliser une connexion SMTP sécurisée ? (oui/non)',
        smtpUser: 'Utilisateur SMTP',
        smtpPassword: 'Mot de passe SMTP',
        settingUp: "Génération du fichier de configuration en cours...",
        configSaved: `Configuration enregistrée dans ${path.basename(setupFilePath)}.`,
        generatingKeys: 'Génération des clés RSA pour votre instance...',
        keysGenerated: 'Clés RSA générées et enregistrées dans private.key et public.key !',
        important: "IMPORTANT : NE PARTAGEZ PAS VOTRE CLÉ PRIVÉE AVEC QUICONQUE. GARDEZ-LA EN SÉCURITÉ. SI VOTRE CLÉ PRIVÉE EST COMPROMISE, VOTRE INSTANCE PEUT ÊTRE À RISQUE.",
        shouldRunPrisma: 'Voulez-vous exécuter les migrations Prisma maintenant ? (oui/non)',
        runningPrisma: 'Exécution des migrations Prisma...',
        runningGeneration: 'Génération du client Prisma...',
        prismaGenerated: 'Opération Prisma terminée avec succès !',
        prismaFailed: "Échec de l'opération Prisma. Vérifiez le message d'erreur ci-dessous et relancez les commandes manuellement si nécessaire.",
        generationFailed: 'Échec de la génération du client Prisma. Vérifiez le message d’erreur ci-dessous.',
        setupCompleteMessage: `La configuration est terminée ! Vérifiez le fichier ${path.basename(setupFilePath)}, renommez-le en .env puis démarrez votre serveur API Mosaic.`,
        env: {
            databaseUrl: 'URL de connexion à la base de données.',
            redisUrl: 'URL de connexion à Redis.',
            jwt: 'Secrets JWT générés aléatoirement lors de la configuration.',
            minio: 'Configuration MinIO pour le stockage des fichiers.',
            smtp: 'Configuration SMTP utilisée pour les e-mails.',
            instance: 'Identité publique de votre instance Mosaic.',
            frontend: 'URL du frontend utilisée pour les liens d’activation.',
            legal: 'URLs publiques des documents légaux (politique de confidentialité, CGU, mentions légales).',
        },
    },
    en: {
        welcome: 'Welcome to the Mosaic API setup',
        chooseYourLanguage: 'Choose your language (en/fr)',
        legalIntro: 'There are ready-to-fill templates for legal documents in the legal/ folder. If you have not filled them yet, you can do it later.',
        instanceName: 'Mosaic instance name (for example api.ourmosaic.space)',
        instanceAddr: 'Instance federation address (leave blank to reuse the instance name)',
        frontendUrl: 'Public frontend URL (for example https://ourmosaic.space)',
        invalidUrl: 'Invalid address. Please enter a valid URL starting with http:// or https://',
        legalPrivacyPrompt: 'Privacy policy URL (leave empty to use default storage value)',
        legalTosPrompt: 'Terms of Service (TOS) URL (leave empty to use default storage value)',
        legalMentionsPrompt: 'Legal mentions URL (leave empty to use default storage value)',
        databaseUrl: 'Database URL',
        redisUrl: 'Redis URL',
        minioEndpoint: 'MinIO host (you can paste a full URL; it will be normalized)',
        minioPort: 'MinIO port',
        minioUseSsl: 'Use SSL for MinIO? (yes/no)',
        minioAccessKey: 'MinIO access key',
        minioSecretKey: 'MinIO secret key',
        smtpHost: 'SMTP host',
        smtpPort: 'SMTP port',
        smtpSecure: 'Use a secure SMTP connection? (yes/no)',
        smtpUser: 'SMTP username',
        smtpPassword: 'SMTP password',
        settingUp: 'Generating configuration file...',
        configSaved: `Configuration saved to ${path.basename(setupFilePath)}.`,
        generatingKeys: 'Generating RSA keys for your instance...',
        keysGenerated: 'RSA keys generated and saved to private.key and public.key!',
        important: 'IMPORTANT: DO NOT SHARE YOUR PRIVATE KEY WITH ANYONE. KEEP IT SAFE AND SECURE. IF YOUR PRIVATE KEY IS COMPROMISED, YOUR INSTANCE MAY BE AT RISK.',
        shouldRunPrisma: 'Do you want to run Prisma migrations now? (yes/no)',
        runningPrisma: 'Running Prisma migrations...',
        runningGeneration: 'Generating Prisma client...',
        prismaGenerated: 'Prisma operation completed successfully!',
        prismaFailed: 'Prisma operation failed. Please check the error message below and rerun the commands manually if needed.',
        generationFailed: 'Failed to generate Prisma client. Please check the error message below.',
        setupCompleteMessage: `Setup is complete! Please review the ${path.basename(setupFilePath)} file, rename it to .env, and start your Mosaic API server.`,
        env: {
            databaseUrl: 'Database connection URL.',
            redisUrl: 'Redis connection URL.',
            jwt: 'JWT secrets generated randomly during setup.',
            minio: 'MinIO configuration for file storage.',
            smtp: 'SMTP configuration used for emails.',
            instance: 'Public identity for your Mosaic instance.',
            frontend: 'Frontend URL used for activation links.',
            legal: 'Public URLs for legal documents (privacy policy, terms, legal mentions).',
        },
    },
};

function askQuestion(query, defaultValue = '') {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    return new Promise((resolve) =>
        rl.question(`> ${query}${suffix}\n  > `, (answer) => {
            const trimmed = String(answer ?? '').trim();
            resolve(trimmed || defaultValue);
        }),
    );
}

function isAffirmative(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return ['yes', 'y', 'oui', 'o', 'true', '1'].includes(normalized);
}

function normalizeHttpUrl(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return '';
    }

    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(candidate);
        return url.toString().replace(/\/$/, '');
    } catch {
        return trimmed;
    }
}

function normalizeHostLikeValue(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return '';
    }

    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(candidate);
        return url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
        return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    }
}

function normalizePort(value, fallback) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return fallback;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return String(parsed);
}

function buildEnvLine(key, value, quote = false) {
    if (value === '') {
        return `${key}=`;
    }
    return quote ? `${key}="${value}"` : `${key}=${value}`;
}

function runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
                return;
            }
            resolve({ stdout, stderr });
        });
    });
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
`);

    console.log(`${locales.en.welcome} / ${locales.fr.welcome}`);

    const localeChoice = await askQuestion(locales.en.chooseYourLanguage, 'en');
    const selectedLocale = locales[localeChoice.toLowerCase()] || locales.en;

    const instanceName = normalizeHostLikeValue(
        await askQuestion(selectedLocale.instanceName, 'api.ourmosaic.space'),
    );
    if (!instanceName) {
        console.error(selectedLocale.invalidUrl);
        process.exitCode = 1;
        rl.close();
        return;
    }

    const instanceAddrInput = await askQuestion(
        selectedLocale.instanceAddr,
        instanceName,
    );
    const instanceAddr = normalizeHostLikeValue(instanceAddrInput || instanceName);
    if (!instanceAddr) {
        console.error(selectedLocale.invalidUrl);
        process.exitCode = 1;
        rl.close();
        return;
    }

    const frontendUrlInput = await askQuestion(
        selectedLocale.frontendUrl,
        'https://ourmosaic.space',
    );
    const frontendUrl = normalizeHttpUrl(frontendUrlInput);
    if (!frontendUrl) {
        console.error(selectedLocale.invalidUrl);
        process.exitCode = 1;
        rl.close();
        return;
    }

    // Legal documents: offer defaults that point to our storage path using the instance name
    console.log('');
    console.log(selectedLocale.legalIntro ?? '');
    const legalBase = `https://storage.ourmosaic.space/mosaic/${instanceName}/legal`;
    const defaultPrivacy = `${legalBase}/Pol%20Conf.pdf`;
    const defaultTos = `${legalBase}/CGU.pdf`;
    const defaultMentions = `${legalBase}/Mentions%20L%C3%A9gales.pdf`;

    const legalPrivacyUrl = String(
        await askQuestion(selectedLocale.legalPrivacyPrompt, defaultPrivacy),
    ).trim();
    const legalTosUrl = String(
        await askQuestion(selectedLocale.legalTosPrompt, defaultTos),
    ).trim();
    const legalMentionsUrl = String(
        await askQuestion(selectedLocale.legalMentionsPrompt, defaultMentions),
    ).trim();

    const databaseUrl = normalizeHttpUrl(
        await askQuestion(
            selectedLocale.databaseUrl,
            'postgresql://mosaic_user:mosaic_password@localhost:5433/mosaic_db?schema=public',
        ),
    );

    const redisUrl = normalizeHttpUrl(
        await askQuestion(selectedLocale.redisUrl, 'redis://localhost:6380'),
    );

    const minioEndpoint = normalizeHostLikeValue(
        await askQuestion(
            selectedLocale.minioEndpoint,
            'https://assets.ourmosaic.space',
        ),
    );

    const minioPort = normalizePort(
        await askQuestion(selectedLocale.minioPort, '9000'),
        '9000',
    );

    const minioUseSsl = isAffirmative(
        await askQuestion(selectedLocale.minioUseSsl, 'false'),
    );

    const minioAccessKey = String(
        await askQuestion(selectedLocale.minioAccessKey, 'supersecretusername'),
    ).trim();

    const minioSecretKey = String(
        await askQuestion(selectedLocale.minioSecretKey, 'supersecretpassword'),
    ).trim();

    const smtpHost = String(await askQuestion(selectedLocale.smtpHost, '')).trim();
    const smtpPort = normalizePort(await askQuestion(selectedLocale.smtpPort, ''), '');
    const smtpSecure = isAffirmative(
        await askQuestion(selectedLocale.smtpSecure, 'true'),
    );
    const smtpUser = String(await askQuestion(selectedLocale.smtpUser, '')).trim();
    const smtpPassword = String(
        await askQuestion(selectedLocale.smtpPassword, ''),
    ).trim();

    const configSpinner = spinnerApi({ spinner: dotsSpinner }).start(
        selectedLocale.settingUp,
    );

    const jwtAccessSecret = crypto.randomBytes(32).toString('hex');
    const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');

    const envContent = [
        `# ${selectedLocale.welcome}`,
        '',
        `# ${selectedLocale.env.databaseUrl}`,
        buildEnvLine('DATABASE_URL', databaseUrl, true),
        buildEnvLine('REDIS_URL', redisUrl, true),
        '',
        `# ${selectedLocale.env.jwt}`,
        buildEnvLine('JWT_ACCESS_SECRET', jwtAccessSecret, true),
        buildEnvLine('JWT_REFRESH_SECRET', jwtRefreshSecret, true),
        '',
        `# ${selectedLocale.env.minio}`,
        buildEnvLine('MINIO_ENDPOINT', minioEndpoint, true),
        buildEnvLine('MINIO_PORT', minioPort),
        buildEnvLine('MINIO_USE_SSL', String(minioUseSsl)),
        buildEnvLine('MINIO_ACCESS_KEY', minioAccessKey, true),
        buildEnvLine('MINIO_SECRET_KEY', minioSecretKey, true),
        '',
        `# ${selectedLocale.env.smtp}`,
        buildEnvLine('SMTP_HOST', smtpHost, true),
        buildEnvLine('SMTP_PORT', smtpPort),
        buildEnvLine('SMTP_SECURE', String(smtpSecure)),
        buildEnvLine('SMTP_USER', smtpUser, true),
        buildEnvLine('SMTP_PASSWORD', smtpPassword, true),
        '',
        `# ${selectedLocale.env.instance}`,
        buildEnvLine('INSTANCE_NAME', instanceName),
        buildEnvLine('INSTANCE_ADDR', instanceAddr),
        buildEnvLine('FRONTEND_URL', frontendUrl, true),
        '',
        `# ${selectedLocale.env.legal}`,
        buildEnvLine('LEGAL_PRIVACY_POLICY_URL', legalPrivacyUrl, true),
        buildEnvLine('LEGAL_TOS_URL', legalTosUrl, true),
        buildEnvLine('LEGAL_MENTIONS_URL', legalMentionsUrl, true),
        '',
    ].join('\n');

    fs.writeFileSync(setupFilePath, `${envContent}\n`, 'utf8');
    configSpinner.succeed(selectedLocale.configSaved);

    const keysSpinner = spinnerApi({ spinner: dotsSpinner }).start(
        selectedLocale.generatingKeys,
    );
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });
    fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
    fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
    keysSpinner.succeed(selectedLocale.keysGenerated);
    console.log('\x1b[31m%s\x1b[0m', selectedLocale.important);

    const shouldRunPrisma = await askQuestion(selectedLocale.shouldRunPrisma, 'no');
    if (isAffirmative(shouldRunPrisma)) {
        const prismaSpinner = spinnerApi({ spinner: dotsSpinner }).start(
            selectedLocale.runningPrisma,
        );
        try {
            const migrateResult = await runCommand('npx prisma migrate dev --name migration', __dirname);
            prismaSpinner.succeed(selectedLocale.prismaGenerated);
            if (migrateResult.stdout) {
                console.log(migrateResult.stdout);
            }
            if (migrateResult.stderr) {
                console.error(migrateResult.stderr);
            }

            const generationSpinner = spinnerApi({ spinner: dotsSpinner }).start(
                selectedLocale.runningGeneration,
            );
            try {
                const generateResult = await runCommand('npx prisma generate', __dirname);
                generationSpinner.succeed(selectedLocale.prismaGenerated);
                if (generateResult.stdout) {
                    console.log(generateResult.stdout);
                }
                if (generateResult.stderr) {
                    console.error(generateResult.stderr);
                }
            } catch (result) {
                generationSpinner.fail(selectedLocale.generationFailed);
                if (result.stdout) {
                    console.log(result.stdout);
                }
                if (result.stderr) {
                    console.error(result.stderr);
                }
                console.error(result.error);
            }
        } catch (result) {
            prismaSpinner.fail(selectedLocale.prismaFailed);
            if (result.stdout) {
                console.log(result.stdout);
            }
            if (result.stderr) {
                console.error(result.stderr);
            }
            console.error(result.error);
        }
    }

    console.log(selectedLocale.setupCompleteMessage);
    rl.close();
}

main().catch((error) => {
    console.error(error);
    rl.close();
    process.exitCode = 1;
});
