import xmlrpc from 'xmlrpc';

class OdooAuthService {
    constructor(config) {
        this.config = config;

        const parsedUrl = new URL(config.url);
        const host = parsedUrl.hostname;
        const port = Number(config.port);
        const isHttps = parsedUrl.protocol === 'https:' || port === 443;

        const commonOptions = {
            host,
            port,
            path: '/xmlrpc/2/common',
            timeout: 10000
        };

        const modelsOptions = {
            host,
            port,
            path: '/xmlrpc/2/object',
            timeout: 15000
        };

        // Permitir desactivar verificación TLS para entornos de staging si se configura en .env
        if (isHttps && process.env.ODOO_REJECT_UNAUTHORIZED === 'false') {
            commonOptions.rejectUnauthorized = false;
            modelsOptions.rejectUnauthorized = false;
        }

        this.commonClient = isHttps
            ? xmlrpc.createSecureClient(commonOptions)
            : xmlrpc.createClient(commonOptions);

        this.modelsClient = isHttps
            ? xmlrpc.createSecureClient(modelsOptions)
            : xmlrpc.createClient(modelsOptions);
    };

    async authenticate () {
        return new Promise((resolve, reject) => {
            this.commonClient.methodCall(
                'authenticate', 
                [
                    this.config.db,
                    this.config.username,
                    this.config.password,
                    {}
                ],
                (err, uid) => {
                    if ( err ) {
                        console.error('Error al autenticar. Detalles del error:', err);
                        return reject(err);
                    } 

                    if (!uid) {
                        return reject(new Error('Credenciales inválidas.'))
                    }

                    resolve(uid);
                }
            )
        });
    }

    getModelsClient() {
        return this.modelsClient;
    }
}

export default OdooAuthService;
