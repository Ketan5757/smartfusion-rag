import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';
import Header from './Header';
import Footer from './Footer';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account' // ✅ This line forces account selection
  });

  try {
    await signInWithPopup(auth, provider);
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
  return (
    <>
      <Header />

      <div className="auth-container">
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
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
          <button type="submit">Login</button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <hr />

        <button onClick={handleGoogleSignIn} className="google-btn">
          Sign in with Google
        </button>

        <p>
          Don't have an account? <a href="/signup">Sign up here</a>
        </p>
      </div>

      <Footer />
    </>
  );
};

export default LoginPage;
