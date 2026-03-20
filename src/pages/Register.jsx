import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router';
import burgerToast from '../components/BurgerToast';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock, FaUser, FaUserPlus } from 'react-icons/fa';
import Lottie from 'lottie-react';
import chefAnimation from '../assets/Playing chef.json';
import chefMobile from '../assets/chef.json';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      burgerToast.success('Welcome! Set up your group.');
      navigate('/group-setup');
    } catch (error) {
      // error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/5 via-base-200 to-primary/10 py-8 px-4">
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
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
                  <FaUserPlus className="text-4xl text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-base-content">Create Account</h2>
                <p className="text-base-content/60 mt-2">Join us and start managing your mess</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Full Name</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-base-content/40" />
                    </div>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="input input-bordered w-full pl-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

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
                  <label className="label">
                    <span className="label-text font-semibold">Password</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-base-content/40" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className="input input-bordered w-full pl-10 pr-12 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-primary transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash className="text-xl" /> : <FaEye className="text-xl" />}
                    </button>
                  </div>
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">Minimum 6 characters required</span>
                  </label>
                </div>

                <div className="form-control mt-8">
                  <button
                    type="submit"
                    className={"btn btn-primary w-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all " + (loading ? 'loading' : '')}
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </div>
              </form>

              <div className="divider my-6">OR</div>

              <div className="text-center">
                <p className="text-base-content/70">
                  Already have an account?{' '}
                  <Link to="/login" className="link link-primary font-semibold hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
