import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './connection';

async function main() {
  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './src/lib/db/migrations' });
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

main(); 