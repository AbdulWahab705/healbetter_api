import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import emailService from './EmailService.js';
import moment from 'moment';

class TherapistAuthService {
  constructor(therapistRepository) {
    this.therapistRepository = therapistRepository;
  }

  async signUp({ firstName, lastName, phone, email, password, dob, city, state, country }) {
    const existingUser = await this.therapistRepository.findByEmail(email);
    const formattedDob = moment(dob, 'YYYY-MM-DD').toDate();
    if (!formattedDob || isNaN(formattedDob)) {
      throw new Error('Invalid date of birth format. Please use YYYY-MM-DD.');
    }
    console.log("existingUser", existingUser)
    if (existingUser) {
      throw new Error('Patient already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // const verificationToken = jwt.sign({ email }, config.jwtSecret, { expiresIn: '1h' });
    const verificationToken = Math.floor(10000 + Math.random() * 90000);
    const user = { firstName, lastName, phone, email, password: hashedPassword, verificationToken, dob: formattedDob, city, state, country };
    console.log("useruser", user)
    let savedUser = null;
    try{
      savedUser = await this.therapistRepository.save(user);
    } catch (e)
    {
      console.log(e)
    }
    console.log("savedUser", savedUser)
    await emailService.sendVerificationEmail(savedUser, verificationToken);
    return { message: 'Verification email sent. Please check your email.' };
  }

  async sendVerificationEmail({ email }) {
    const user = await this.therapistRepository.findByEmail(email);
    if (!user) {
      throw new Error('User does not exist');
    }

    const verificationToken = Math.floor(10000 + Math.random() * 90000);
    user.verificationToken = verificationToken;
    await this.therapistRepository.update(user);

    await emailService.sendVerificationEmail(user, verificationToken);
    return { message: 'Verification email sent successfully.' };
  }

  async verifyEmail(email, code) {
    try {
      const user = await this.therapistRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      if (user.isVerified) {
        throw new Error('User is already verified');
      }

      if (user.verificationToken !== parseInt(code, 10)) {
        throw new Error('Invalid verification code');
      }

      user.isVerified = true;
      user.verificationToken = null;
      await this.therapistRepository.update(user);
      return { message: 'Email verified successfully!' };
    } catch (err) {
      throw new Error(err.message || 'Verification failed');
    }
  }

  async signIn({ email, password }) {
    const user = await this.therapistRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.isDeleted) {
      throw new Error('Account marked as Deleted.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.refreshTokenSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
      const accessToken = jwt.sign({ userId: decoded.userId }, config.jwtSecret, { expiresIn: '15m' });
      return { accessToken };
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.therapistRepository.findById(userId);
    if (!user) {
      throw new Error('Patient not found');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await this.therapistRepository.update(user);
  }

  async resetPassword(email) {
    const user = await this.therapistRepository.findByEmail(email);
    if (!user) {
      throw new Error('Patient not found');
    }
    const temPass = "tempPassword@123";
    const hashedPassword = await bcrypt.hash(temPass, await bcrypt.genSalt(10));
    user.password = hashedPassword;
    let savedUser = await this.therapistRepository.update(user);
    await emailService.sendPasswordResetEmail(savedUser, temPass);
  }


  async markAccountAsDeleted(userId) {
    const user = await this.therapistRepository.findById(userId);
    if (!user) {
      throw new Error('Patient not found');
    }
    user.isDeleted = true;
    await this.therapistRepository.update(user);
  }


}

export default TherapistAuthService;
