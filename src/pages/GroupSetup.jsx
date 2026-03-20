import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import axios from 'axios';
import burgerToast from '../components/BurgerToast';
import { FaUsers, FaUserPlus, FaKey, FaArrowLeft, FaCheckCircle, FaLock } from 'react-icons/fa';

const GroupSetup = () => {
  const [mode, setMode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders, fetchUserData, currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL;

  // Already in a group — redirect to dashboard
  useEffect(() => {
    if (userData?.groupId) navigate('/dashboard');
  }, [userData]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/create`, { name: groupName }, { headers });
      
      if (currentUser) await fetchUserData(currentUser);
      
      burgerToast.success('Group created successfully!');
      navigate('/dashboard');
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(`${API_URL}/group/join`, { groupCode }, { headers });
      
      if (currentUser) await fetchUserData(currentUser);
      
      burgerToast.success('Joined group successfully!');
      navigate('/dashboard');
    } catch (error) {
      burgerToast.error(error.response?.data?.error || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 via-base-100 to-base-200 py-12 px-4">
        <div className="w-full max-w-5xl">
          {/* Header Section */}
          <div className="text-center mb-8 animate-fadeIn">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-3">
              Group Setup
            </h1>
            <p className="text-base-content/70 text-lg">
              Create a new group or join an existing one to get started
            </p>
          </div>

          {/* Mode Selection */}
          {!mode && (
            <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
              {/* Create Group Card */}
              <div 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-primary/20 hover:border-primary cursor-pointer group"
                onClick={() => setMode('create')}
              >
                <div className="card-body items-center text-center p-8">
                  <div className="bg-gradient-to-br from-primary to-blue-600 p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FaUsers className="text-5xl text-white" />
                  </div>
                  <h2 className="card-title text-2xl font-bold text-primary mb-2">
                    Create New Group
                  </h2>
                  <p className="text-base-content/70 mb-4">
                    Start your own mess group and invite members to join
                  </p>
                  <ul className="text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>You'll be the group manager</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>Get a unique group code</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>Full control over settings</span>
                    </li>
                  </ul>
                  <button className="btn btn-primary btn-wide shadow-lg">
                    <FaUserPlus className="text-lg" />
                    Create Group
                  </button>
                </div>
              </div>

              {/* Join Group Card */}
              <div 
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-secondary/20 hover:border-secondary cursor-pointer group"
                onClick={() => setMode('join')}
              >
                <div className="card-body items-center text-center p-8">
                  <div className="bg-gradient-to-br from-secondary to-purple-600 p-6 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FaKey className="text-5xl text-white" />
                  </div>
                  <h2 className="card-title text-2xl font-bold text-secondary mb-2">
                    Join Existing Group
                  </h2>
                  <p className="text-base-content/70 mb-4">
                    Enter a group code to join an existing mess group
                  </p>
                  <ul className="text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>Quick and easy setup</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>Join with a code</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <FaCheckCircle className="text-success" />
                      <span>Start tracking meals instantly</span>
                    </li>
                  </ul>
                  <button className="btn btn-secondary btn-wide shadow-lg">
                    <FaKey className="text-lg" />
                    Join Group
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Group Form */}
          {mode === 'create' && (
            <div className="card bg-base-100 shadow-2xl border-t-4 border-t-primary max-w-2xl mx-auto animate-fadeIn">
              <div className="card-body p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FaUsers className="text-3xl text-primary" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl font-bold text-primary">Create New Group</h2>
                    <p className="text-sm text-base-content/70">Set up your mess management group</p>
                  </div>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Group Name</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Dhaka Mess, Bachelor's Paradise"
                      className="input input-bordered input-lg focus:input-primary"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Choose a memorable name for your group
                      </span>
                    </label>
                  </div>

                  <div className="alert bg-primary/10 border-primary/30">
                    <FaLock className="text-primary" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary">You'll be the manager</p>
                      <p className="text-base-content/70">You'll receive a unique code to share with members</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      className="btn btn-ghost flex-1"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className={`btn btn-primary flex-1 shadow-lg ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : (
                        <>
                          <FaUserPlus />
                          Create Group
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Join Group Form */}
          {mode === 'join' && (
            <div className="card bg-base-100 shadow-2xl border-t-4 border-t-secondary max-w-2xl mx-auto animate-fadeIn">
              <div className="card-body p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-secondary/10 p-3 rounded-full">
                    <FaKey className="text-3xl text-secondary" />
                  </div>
                  <div>
                    <h2 className="card-title text-2xl font-bold text-secondary">Join Existing Group</h2>
                    <p className="text-sm text-base-content/70">Enter the group code to join</p>
                  </div>
                </div>

                <form onSubmit={handleJoinGroup} className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Group Code</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-character code (e.g., ABC123)"
                      className="input input-bordered input-lg focus:input-secondary font-mono text-center text-2xl tracking-widest uppercase"
                      value={groupCode}
                      onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Ask your group manager for the code
                      </span>
                    </label>
                  </div>

                  <div className="alert bg-secondary/10 border-secondary/30">
                    <FaCheckCircle className="text-secondary" />
                    <div className="text-sm">
                      <p className="font-semibold text-secondary">Quick Setup</p>
                      <p className="text-base-content/70">You'll be added as a member instantly</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      className="btn btn-ghost flex-1"
                      onClick={() => setMode('')}
                    >
                      <FaArrowLeft />
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className={`btn btn-secondary flex-1 shadow-lg ${loading ? 'loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Joining...' : (
                        <>
                          <FaKey />
                          Join Group
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default GroupSetup;
