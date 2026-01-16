import { PasswordService } from './src/services/auth/PasswordService';

async function generateHash() {
    const password = 'Test123456';
    const hash = await PasswordService.hashPassword(password);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nSQL Command:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'testuser';`);
}

generateHash().catch(console.error);
