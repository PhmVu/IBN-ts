import { jwtService } from '@services/auth/JwtService';
import logger from '@core/logger';

async function generateKeys() {
    try {
        logger.info('Generating JWT keys...');
        await jwtService.rotateKeys();
        logger.info('✅ JWT keys generated successfully');
        process.exit(0);
    } catch (error: any) {
        logger.error('Failed to generate JWT keys', { error: error.message });
        process.exit(1);
    }
}

generateKeys();
