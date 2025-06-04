import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Onboarding.css';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [profileData, setProfileData] = useState({
    photoURL: '',
    title: '',
    department: '',
    bio: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [loading, setLoading] = useState(false);
  const { currentUser, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // TODO: Upload to Firebase Storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({
          ...profileData,
          photoURL: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateUserProfile(profileData);
      navigate('/');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
    setLoading(false);
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <h2>Welcome to Moccet, {currentUser?.displayName}! 👋</h2>
            <p>Let's set up your profile in a few quick steps</p>
            
            <div className="photo-upload">
              <div className="photo-preview">
                {profileData.photoURL ? (
                  <img src={profileData.photoURL} alt="Profile" />
                ) : (
                  <i className="fa-solid fa-user"></i>
                )}
              </div>
              <label htmlFor="photo-upload" className="upload-button">
                Choose Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </div>

            <button onClick={handleNext} className="continue-button">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>Tell us about your role</h2>
            <p>This helps your team know what you do</p>

            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="title"
                value={profileData.title}
                onChange={handleChange}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <select 
                name="department" 
                value={profileData.department}
                onChange={handleChange}
              >
                <option value="">Select department</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button onClick={handleNext} className="continue-button">
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <h2>Almost done!</h2>
            <p>Add a bio to help teammates get to know you</p>

            <div className="form-group">
              <label>Bio (optional)</label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleChange}
                placeholder="Tell your team a bit about yourself..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Timezone</label>
              <select 
                name="timezone" 
                value={profileData.timezone}
                onChange={handleChange}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>

            <button 
              onClick={handleComplete} 
              className="continue-button"
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;