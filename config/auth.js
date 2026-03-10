import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import pool from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Custom Microsoft OAuth Strategy
class MicrosoftStrategy extends OAuth2Strategy {
  constructor(options, verify) {
    const tenantId = options.tenant || options.tenantId || 'common';
    super({
      authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      clientID: options.clientID,
      clientSecret: options.clientSecret,
      callbackURL: options.callbackURL,
      scope: options.scope || 'openid profile email User.Read'
    }, verify);
    this.name = 'microsoft';
  }

  userProfile(accessToken, done) {
    fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(res => res.json())
    .then(profile => {
      profile.provider = 'microsoft';
      done(null, profile);
    })
    .catch(err => done(err));
  }
}

// Configure Microsoft OAuth Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.MICROSOFT_TENANT_ID) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    tenantId: process.env.MICROSOFT_TENANT_ID,
    callbackURL: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
    scope: 'openid profile email User.Read'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = {
        microsoftId: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        accessToken,
        refreshToken
      };
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  console.log('✅ Microsoft OAuth strategy configured');
} else {
  console.warn('⚠️  Microsoft OAuth credentials not configured. Authentication will not work.');
  console.warn('⚠️  Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file');
  
  // Register a dummy strategy that returns an error
  passport.use('microsoft', new (class {
    authenticate() {
      return (req, res, next) => {
        res.status(400).json({
          error: 'Microsoft OAuth not configured',
          message: 'Please configure MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in your .env file'
        });
      };
    }
  })());
}

// Local username/password strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 OR username = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const user = result.rows[0];

      if (!user.password) {
        return done(null, false, { message: 'Password not set for this account. Please use Microsoft login or set a password.' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      if (!user.is_active) {
        return done(null, false, { message: 'Account is inactive' });
      }

      return done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
