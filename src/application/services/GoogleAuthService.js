import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import PatientRepositoryImpl from '../../infrastructure/repositories/PatientRepositoryImpl.js';
import config from '../../config/config.js';
import TherapistRepositoryImpl from "../../infrastructure/repositories/TherapistRepositoryImpl.js";

const patientRepository = new PatientRepositoryImpl();
const therapistRepository = new TherapistRepositoryImpl();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: '/api/v1/auth/patient/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await patientRepository.findByGoogleId(profile.id);
    if (!user) {
      user = await patientRepository.save({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        password: "googlePass"
      });
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
},
async (jwtPayload, done) => {
  try {
    let user = null;
    user = await patientRepository.findById(jwtPayload.userId);
    if(!user) {
      user = await therapistRepository.findById(jwtPayload.userId);
    }
    if (user) {
      return done(null, user);
    } else {
      return done(null, false); // Patient not found
    }
  } catch (error) {
    return done(error, false);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await patientRepository.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
