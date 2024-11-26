import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import PatientRepositoryImpl from '../repositories/PatientRepositoryImpl.js';
import PatientAuthService from '../../application/services/PatientAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';

const router = express.Router();
const patientRepository = new PatientRepositoryImpl();
const authService = new PatientAuthService(patientRepository);

router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    const user = await authService.signUp({ firstName, lastName, phone, email, password });
    console.log("userincontoler", user)
    CommonResponse.success(res, { user });
  } catch (err) {
    CommonResponse.error(err)
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