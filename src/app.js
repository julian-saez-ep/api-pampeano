import express from 'express';
import xmlrpc from 'xmlrpc';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import router from './routes/index.js';
import { odooConfig } from './utils/odoo-config.js';

dotenv.config();

const HOSTNAME = process.env.HOSTNAME || 'localhost';

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(express.raw({ type: 'multipart/form-data', limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 requests por ventana
});

app.use('/api/', limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function initializeOdoo() {
    return new Promise((resolve, reject) => {
        // Crear cliente para autenticación
        const authClient = xmlrpc.createClient(`${odooConfig.url}/xmlrpc/2/common`);
        
        // Autenticar
        authClient.methodCall('authenticate', [
            odooConfig,
            odooConfig.db,
            odooConfig.username,
            odooConfig.password,
            {}
        ], (err, uid) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Crear cliente para operaciones
            const client = xmlrpc.createClient(`${odooConfig.url}/xmlrpc/2/object`);
            
            resolve({ client, uid });
        });
    });
}

const main = async () => {
    try {
        app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                odooConnection: 'connected'
            });
        });

        app.use('/api/attendance', router);

        app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Ruta no encontrada'
            });
        });

        app.use((err, req, res, next) => {
            console.error('Error:', err);
            
            res.status(err.status || 500).json({
                success: false,
                error: err.message || 'Error interno del servidor',
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });

        // Iniciar servidor
        const PORT = process.env.PORT || 3000;
        const server = app.listen(PORT, HOSTNAME, () => {
            console.log(`Servidor ejecutándose en puerto ${PORT}`);
            console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
        });

        process.on('SIGTERM', () => {
            console.log('SIGTERM recibido. Cerrando servidor...');
            server.close(() => {
                console.log('Servidor cerrado');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        process.exit(1);
    }
}

main().catch(console.error);

export default app;
