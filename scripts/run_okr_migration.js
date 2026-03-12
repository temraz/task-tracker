import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running OKR migration...');
    
    const migrationPath = path.join(__dirname, '../database/migration_add_okr_and_indexes.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migration = fs.readFileSync(migrationPath, 'utf8');
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        try {
          await pool.query(statement);
          console.log('✅ Executed:', statement.substring(0, 60) + '...');
        } catch (error) {
          if (!error.message.includes('already exists') && 
              error.code !== '42P07' && 
              !error.message.includes('duplicate column') && 
              !error.message.includes('duplicate key') &&
              !error.message.includes('already exists')) {
            console.error('❌ Error:', error.message);
            console.error('Statement:', statement.substring(0, 100));
          } else {
            console.log('ℹ️  Skipped (already exists):', statement.substring(0, 60) + '...');
          }
        }
      }
    }
    
    console.log('✅ OKR migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
