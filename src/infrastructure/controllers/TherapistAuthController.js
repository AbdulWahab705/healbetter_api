import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import TherapistRepositoryImpl from '../repositories/TherapistRepositoryImpl.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import TherapistAuthService from "../../application/services/TherapistAuthService.js";

const router = express.Router();
const therapistRepository = new TherapistRepositoryImpl();
const authService = new TherapistAuthService(therapistRepository);

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, dob, city, state, country } = req.body;
    const user = await authService.signUp({ firstName, lastName, phone, email, password, dob, city, state, country });
    CommonResponse.success(res, { user });
  } catch (err) {
    CommonResponse.error(res, err)
  }
});

router.post('/resend-verification-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return CommonResponse.error(res, 'Email is required', 400);
    }

    const response = await authService.sendVerificationEmail({ email });
    CommonResponse.success(res, response);
  } catch (err) {
    CommonResponse.error(res, err);
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken } = await authService.signIn({ email, password });
    CommonResponse.success(res, { accessToken, refreshToken});
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});

router.post('/refresh-token', async (req, res) => {
  try {    CommonResponse.success(res, { accessToken, refreshToken }, null, 200);
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    CommonResponse.success(res, { accessToken });
  } catch (err) {
    CommonResponse.error(res, err.message, 400);
  }
});


// Initiate Google Authentication
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Route to handle Google authentication callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: true }, (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return CommonResponse.error(res, 'Authentication failed');
      // return res.status(500).send('Authentication failed');
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return CommonResponse.error(res, 'Login failed');
        // return res.status(500).send('Login failed');
      }
      CommonResponse.success(res, null, "Login Successful!");
      // return res.status(200).send("Login Successful!");
    });
  })(req, res, next);
});

// Handle Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});


export default router;
