import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import Header from './Header';
import Footer from './Footer';
import '../styles/SignupPage.css';
const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Email/Password Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  // Google Signup (actually works same as sign-in)
  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Header />
      <div className="signup-back-button">
        <button onClick={() => navigate(-1)}>← Back</button>
        </div>

      <div className="auth-container">
        <h2>Sign Up</h2>

        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Create Account</button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <hr />

        <button onClick={handleGoogleSignup} className="google-btn">
          Sign up with Google
        </button>

        <p>
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>

      <Footer />
    </>
  );
};

export default SignupPage;
