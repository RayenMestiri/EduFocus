const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const User = require('../models/User');

/**
 * Initialize Passport middleware and Google OAuth strategy on the Express app.
 * Must be called after CORS and body-parser middleware in server.js.
 */
const initializePassport = (app) => {
  // ── express-session (required by passport for the OAuth handshake only) ──
  // In-memory store is intentional: sessions exist only during the brief
  // Google redirect/callback cycle. No persistent store needed.
  app.use(session({
    secret: process.env.SESSION_SECRET || 'edufocus_session_fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      httpOnly: true,
      maxAge: 5 * 60 * 1000 // 5 minutes — only needed for OAuth handshake
    }
  }));

  // ── Passport initialization ──
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Minimal session serialization (user.id only) ──
  passport.serializeUser((user, done) => done(null, user._id.toString()));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // ── Google OAuth 2.0 Strategy ──
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5002'}/api/auth/google/callback`,
      // Request profile + email scopes
      scope: ['profile', 'email'],
      // Pass request to callback (allows accessing req.query etc.)
      passReqToCallback: false
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // ── Extract Google profile data ──
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const name = profile.displayName || profile.name?.givenName || 'EduFocus User';
        // Use Google profile photo if available, fallback to default avatar
        const avatar = profile.photos?.[0]?.value || 'https://res.cloudinary.com/dmdhy6rj8/image/upload/v1/default-avatar.png';

        if (!email) {
          return done(new Error('Google account has no email address'), null);
        }

        // ── Validate email format ──
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return done(new Error('Invalid email address from Google'), null);
        }

        // ── Look up user: first by googleId, then by email ──
        let user = await User.findOne({ googleId });

        if (!user) {
          // Check if an existing local account uses this email
          user = await User.findOne({ email });

          if (user) {
            // ── Link Google to existing local account ──
            user.googleId = googleId;
            // Only set authProvider to 'google' if they had no password at all
            // (keeps hybrid accounts as 'local' so they can still use password login)
            if (!user.password) {
              user.authProvider = 'google';
            }
            // Update avatar only if still using the default one
            if (user.avatar && user.avatar.includes('default-avatar')) {
              user.avatar = avatar;
            }
            await user.save({ validateBeforeSave: false });
          } else {
            // ── Create brand new Google user ──
            user = await User.create({
              name,
              email,
              googleId,
              authProvider: 'google',
              avatar,
              // No password field — the conditional validator allows this
            });
          }
        } else {
          // ── Existing Google user — refresh avatar if changed ──
          let changed = false;
          if (user.avatar && user.avatar.includes('default-avatar') && avatar) {
            user.avatar = avatar;
            changed = true;
          }
          if (changed) await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (error) {
        console.error('[Passport Google] Strategy error:', error.message);
        return done(error, null);
      }
    }
  ));
};

module.exports = { initializePassport };
