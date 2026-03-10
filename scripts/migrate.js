import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && !error.code === '42P07') {
            console.error('Migration error:', error.message);
          }
        }
      }
    }
    
    // Run password migration
    const passwordMigrationPath = path.join(__dirname, '../database/migration_add_password.sql');
    if (fs.existsSync(passwordMigrationPath)) {
      const passwordMigration = fs.readFileSync(passwordMigrationPath, 'utf8');
      const passwordStatements = passwordMigration
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of passwordStatements) {
        if (statement) {
          try {
            await pool.query(statement);
          } catch (error) {
            if (!error.message.includes('already exists') && error.code !== '42P07' && !error.message.includes('duplicate column')) {
              console.error('Password migration error:', error.message);
            }
          }
        }
      }
      console.log('✅ Password migration completed');
    }
    
    console.log('✅ Database migrations completed');
    
    // Create default admin user if not exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@classera.com']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (email, username, password, name, role, is_active, avatar, invitation_accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        ['admin@classera.com', 'admin', hashedPassword, 'Admin User', 'admin', true, 'A']
      );
      console.log('✅ Default admin user created');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@classera.com');
    } else {
      // Update existing admin to have password if missing
      const adminUser = await pool.query('SELECT password FROM users WHERE email = $1', ['admin@classera.com']);
      if (!adminUser.rows[0].password) {
        const bcrypt = (await import('bcryptjs')).default;
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(
          `UPDATE users SET username = $1, password = $2 WHERE email = $3`,
          ['admin', hashedPassword, 'admin@classera.com']
        );
        console.log('✅ Admin user updated with credentials');
        console.log('   Username: admin');
        console.log('   Password: admin123');
      }
    }
    
    // Create fiscal year quarters if they don't exist
    // Fiscal year starts June 30:
    // Q1: June 30 - September 29
    // Q2: September 30 - December 29
    // Q3: December 30 - March 30
    // Q4: March 31 - June 29
    const today = new Date();
    const currentYear = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // Determine fiscal year (starts June 30)
    let fiscalYear = currentYear;
    if (month < 6 || (month === 6 && day < 30)) {
      fiscalYear = currentYear - 1; // Before June 30, we're in previous fiscal year
    }
    
    // Create quarters for current and next fiscal year
    for (let fy = fiscalYear; fy <= fiscalYear + 1; fy++) {
      // Q1: June 30 - September 29
      const q1Check = await pool.query('SELECT id FROM quarters WHERE year = $1 AND quarter = $2', [fy, 1]);
      if (q1Check.rows.length === 0) {
        await pool.query(
          `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [fy, 1, new Date(fy, 5, 30), new Date(fy, 8, 29)] // June 30 - Sept 29
        );
        console.log(`✅ Created Q1 ${fy}`);
      }
      
      // Q2: September 30 - December 29
      const q2Check = await pool.query('SELECT id FROM quarters WHERE year = $1 AND quarter = $2', [fy, 2]);
      if (q2Check.rows.length === 0) {
        await pool.query(
          `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [fy, 2, new Date(fy, 8, 30), new Date(fy, 11, 29)] // Sept 30 - Dec 29
        );
        console.log(`✅ Created Q2 ${fy}`);
      }
      
      // Q3: December 30 - March 30 (spans year boundary)
      const q3Check = await pool.query('SELECT id FROM quarters WHERE year = $1 AND quarter = $2', [fy, 3]);
      if (q3Check.rows.length === 0) {
        await pool.query(
          `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [fy, 3, new Date(fy, 11, 30), new Date(fy + 1, 2, 30)] // Dec 30 - Mar 30
        );
        console.log(`✅ Created Q3 ${fy}`);
      }
      
      // Q4: March 31 - June 29
      const q4Check = await pool.query('SELECT id FROM quarters WHERE year = $1 AND quarter = $2', [fy, 4]);
      if (q4Check.rows.length === 0) {
        await pool.query(
          `INSERT INTO quarters (year, quarter, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [fy, 4, new Date(fy + 1, 2, 31), new Date(fy + 1, 5, 29)] // Mar 31 - June 29
        );
        console.log(`✅ Created Q4 ${fy}`);
      }
    }
    
    // Don't exit in Docker environment
    if (process.env.NODE_ENV !== 'production' || !process.env.DOCKER) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (process.env.NODE_ENV !== 'production' || !process.env.DOCKER) {
      process.exit(1);
    }
    throw error;
  }
}

migrate();
