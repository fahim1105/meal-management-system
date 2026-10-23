import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import Lottie from 'lottie-react';
import chefAnimation from '../assets/Playing chef.json';
import chefMobile from '../assets/chef.json';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // Wait a bit for userData to be available after login
      // Then ProtectedRoute will handle the redirect appropriately
      // If user has groupId -> Dashboard, otherwise -> group-setup
      navigate('/dashboard');
    } catch {
      // error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      // error handled by AuthContext
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgot(false);
    setResetEmail('');
    setResetSent(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-base-100 py-8 px-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-0 lg:gap-8">

        {/* Large screen: Playing chef on left */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div style={{ width: '100%', maxWidth: '420px' }} className="[&_svg]:bg-transparent [&>div]:bg-transparent">
            <Lottie
              animationData={chefAnimation}
              loop
              autoplay
              renderer="svg"
              rendererSettings={{ clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' }}
              style={{ background: 'transparent' }}
            />
          </div>
        </div>

        {/* Mobile/tablet: chef.json above form */}
        <div className="flex lg:hidden justify-center w-full -mb-4">
          <div style={{ width: '160px', height: '160px' }}>
            <Lottie
              animationData={chefMobile}
              loop
              autoplay
              renderer="svg"
              rendererSettings={{ clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-md mx-auto lg:max-w-none lg:flex-1">
          <div className="card w-full bg-base-100 shadow-2xl border border-primary/10">
            <div className="card-body p-8">

              {/* ── Login Form ── */}
              {!showForgot && (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                      <FaLock className="text-4xl text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-base-content">Welcome Back!</h2>
                    <p className="text-base-content/60 mt-2">Login to your account</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold">Email Address</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaEnvelope className="text-base-content/40" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          className="input input-bordered w-full pl-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-control">
                      <div className="flex items-center justify-between">
                        <label className="label py-0">
                          <span className="label-text font-semibold">Password</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => { setShowForgot(true); setResetEmail(email); }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative mt-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaLock className="text-base-content/40" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="input input-bordered w-full pl-10 pr-12 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-primary transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <FaEyeSlash className="text-xl" /> : <FaEye className="text-xl" />}
                        </button>
                      </div>
                    </div>

                    <div className="form-control mt-8">
                      <button
                        type="submit"
                        className={'btn btn-primary text-white w-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ' + (loading ? 'loading' : '')}
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </button>
                    </div>
                  </form>

                  <div className="divider my-6">OR</div>

                  <div className="text-center">
                    <p className="text-base-content/70">
                      Don't have an account?{' '}
                      <Link to="/register" className="link link-primary font-semibold hover:underline">
                        Create Account
                      </Link>
                    </p>
                  </div>
                </>
              )}

              {/* ── Forgot Password Form ── */}
              {showForgot && (
                <>
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-2 text-sm text-base-content/50 hover:text-primary transition-colors mb-4"
                  >
                    <FaArrowLeft className="text-xs" /> Back to login
                  </button>

                  {!resetSent ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                          <FaEnvelope className="text-4xl text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-base-content">Forgot Password?</h2>
                        <p className="text-base-content/60 mt-2 text-sm">
                          Enter your email and we'll send you a reset link
                        </p>
                      </div>

                      <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-semibold">Email Address</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaEnvelope className="text-base-content/40" />
                            </div>
                            <input
                              type="email"
                              placeholder="Enter your email"
                              className="input input-bordered w-full pl-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className={'btn btn-primary w-full gap-2 shadow-lg ' + (resetLoading ? 'loading' : '')}
                          disabled={resetLoading}
                        >
                          {!resetLoading && <FaPaperPlane />}
                          {resetLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                      </form>
                    </>
                  ) : (
                    /* Success state */
                    <div className="text-center py-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
                        <FaPaperPlane className="text-3xl text-success" />
                      </div>
                      <h2 className="text-2xl font-bold text-base-content mb-2">Email Sent!</h2>
                      <p className="text-base-content/60 text-sm mb-1">
                        We sent a password reset link to
                      </p>
                      <p className="font-semibold text-primary text-sm mb-6">{resetEmail}</p>
                      <p className="text-base-content/50 text-xs mb-6">
                        Check your inbox (and spam folder). The link expires in 1 hour.
                      </p>
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="btn btn-primary w-full"
                      >
                        Back to Login
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
