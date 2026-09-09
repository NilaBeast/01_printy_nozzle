import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Settings,
  Mail,
  Megaphone,
  Truck,
  CreditCard,
  Heart,
  MapPin,
  Box,
  CalendarCheck,
} from "lucide-react";
import "../../public/css/profile.css";

function Profile() {
  const location = useLocation();

  /* =====================================================
     AUTO-SCROLL TO ADDRESSES
     ===================================================== */
  useEffect(() => {
    if (
      location.hash === "#addresses" ||
      location.state?.scrollTo === "addresses"
    ) {
      const scrollTimer = setTimeout(() => {
        const addressEl = document.getElementById("profile-addresses-section");
        if (addressEl) {
          addressEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(scrollTimer);
    }
  }, [location]);

  /* =====================================================
     STATES
     ===================================================== */

  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: "Diprati",
    lastName: "Das",
    email: "diprati@example.com",
    phone: "+91 98765 43210",
    dob: "03/11/2002",
    gender: "Male",
  });

  const [editData, setEditData] = useState({ ...profileData });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    marketingUpdates: false,
    orderUpdates: true,
  });

  const [addresses] = useState([
    {
      id: 1,
      type: "Home",
      icon: "bi-house-door",
      isDefault: true,
      name: "Diprati Das",
      street: "123, Maker Street",
      area: "Koramangala",
      city: "Bengaluru, Karnataka 560034",
      country: "India",
      phone: "+91 98765 43210",
    },
    {
      id: 2,
      type: "Office",
      icon: "bi-building",
      isDefault: false,
      name: "Diprati Das",
      street: "XYZ Tech Park, 5th Floor",
      area: "Outer Ring Road, Bellandur",
      city: "Bengaluru, Karnataka 560103",
      country: "India",
      phone: "+91 98765 43210",
    },
  ]);

  const summaryData = [
    { Icon: CreditCard, label: "Total Orders", value: "12" },
    { Icon: Heart, label: "Wishlist Items", value: "8" },
    { Icon: MapPin, label: "Saved Addresses", value: "2" },
    { Icon: Box, label: "3D Print Files", value: "5" },
    { Icon: CalendarCheck, label: "Member Since", value: "Aug 2024" },
  ];

  /* =====================================================
     HANDLERS
     ===================================================== */

  const getInitials = () => {
    const f = profileData.firstName?.[0] || "";
    const l = profileData.lastName?.[0] || "";
    return (f + l).toUpperCase();
  };

  const handleEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      toast.warn("First name and last name are required.");
      return;
    }
    setProfileData({ ...editData });
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleFieldChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success("Preference updated!");
  };

  const handleAddAddress = () => {
    toast.info("Add address feature coming soon!");
  };

  const handleEditAddress = (id) => {
    toast.info("Edit address feature coming soon!");
  };

  const handleRemoveAddress = (id) => {
    toast.info("Remove address feature coming soon!");
  };

  const handleChangePassword = () => {
    toast.info("Change password feature coming soon!");
  };

  const handleChangePhoto = () => {
    toast.info("Change photo feature coming soon!");
  };

  /* =====================================================
     RENDER
     ===================================================== */

  const data = isEditing ? editData : profileData;

  return (
    <div className="profile-page-wrapper">
      {/* ======================== HERO ======================== */}

      <div className="profile-hero">
        <div className="profile-hero-container">
          <div className="profile-hero-text">
            <h1>My Profile</h1>
            <p>Manage your personal information and account settings.</p>
          </div>
        </div>
      </div>

      {/* ======================== CONTENT ======================== */}

      <div className="profile-content">
        <div className="profile-grid">
          {/* ==================== LEFT COLUMN ==================== */}

          <div className="profile-left-column">
            {/* ========== PROFILE INFORMATION ========== */}

            <div className="profile-card profile-info-card" style={{ marginBottom: 28 }}>
              <div className="profile-card-header">
                <div className="profile-card-title">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20.59 22c0-3.87-3.85-7-8.59-7s-8.59 3.13-8.59 7"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Profile Information</span>
                </div>

                {!isEditing ? (
                  <button
                    className="profile-edit-btn"
                    onClick={handleEdit}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.26 3.6l-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.4 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16z" stroke="#2563eb" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.89 5.05a6.126 6.126 0 005.45 5.15" stroke="#2563eb" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Edit
                  </button>
                ) : (
                  <div className="profile-edit-actions">
                    <button
                      className="profile-cancel-btn"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button
                      className="profile-save-btn"
                      onClick={handleSave}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="profile-card-body">
                <div className="profile-info-layout">
                  {/* Avatar */}

                  <div className="profile-avatar-section">
                    <div className="profile-avatar">
                      {getInitials()}
                    </div>

                    <button
                      className="profile-change-photo-btn"
                      onClick={handleChangePhoto}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.76 22h10.48c2.76 0 3.86-1.69 3.99-3.75l.52-8.26A3.753 3.753 0 0018 6c-.61 0-1.17-.35-1.45-.89l-.72-1.45C15.37 2.75 14.17 2 13.15 2h-2.29c-1.03 0-2.23.75-2.69 1.66l-.72 1.45C7.17 5.65 6.61 6 6 6 3.83 6 2.11 7.83 2.25 9.99l.52 8.26C2.9 20.31 4 22 6.76 22z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Change Photo
                    </button>

                    <span className="profile-photo-hint">
                      JPG, PNG up to 2MB
                    </span>
                  </div>

                  {/* Form Fields */}

                  <div className="profile-form-grid">
                    <div className="profile-form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        value={data.firstName}
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleFieldChange("firstName", e.target.value)
                        }
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        value={data.lastName}
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleFieldChange("lastName", e.target.value)
                        }
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        className="profile-email-input"
                        value={data.email}
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleFieldChange("email", e.target.value)
                        }
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={data.phone}
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleFieldChange("phone", e.target.value)
                        }
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Date of Birth</label>
                      <div className="profile-input-with-icon">
                        <input
                          type="text"
                          value={data.dob}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleFieldChange("dob", e.target.value)
                          }
                        />
                        <svg
                          className="profile-field-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="#64748b" strokeWidth="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>

                    <div className="profile-form-group">
                      <label>Gender</label>
                      <div className="profile-select-wrapper">
                        <select
                          value={data.gender}
                          disabled={!isEditing}
                          onChange={(e) =>
                            handleFieldChange("gender", e.target.value)
                          }
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                        <svg
                          className="profile-select-chevron"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M6 9l6 6 6-6" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== SAVED ADDRESSES ========== */}

            <div id="profile-addresses-section" className="profile-card profile-addresses-card">
              <div className="profile-addresses-header">
                <div className="profile-addresses-title">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 13.43a3.12 3.12 0 100-6.24 3.12 3.12 0 000 6.24z"
                      stroke="#2563eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
                      stroke="#2563eb"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Saved Addresses</span>
                </div>

                <button
                  className="profile-add-address-btn"
                  onClick={handleAddAddress}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add New Address
                </button>
              </div>

              <div className="profile-addresses-grid">
                {addresses.map((address) => (
                  <div className="profile-address-card" key={address.id}>
                    <div className="profile-address-card-inner">
                      <div className="profile-address-card-header">
                        <div className="profile-address-type-icon">
                          {address.type === "Home" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9.02 2.84l-5.39 4.2C2.73 7.74 2 9.23 2 10.36v7.41c0 2.32 1.91 4.23 4.23 4.23h11.54c2.32 0 4.23-1.91 4.23-4.23v-7.28c0-1.21-.81-2.76-1.8-3.45l-6.18-4.33c-1.4-.98-3.65-.93-5 .13z" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 17.99v-3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 22h22M19.78 22.01V17.55M19.8 10.89c-1.22 0-2.2.98-2.2 2.2v2.27c0 1.22.98 2.2 2.2 2.2 1.22 0 2.2-.98 2.2-2.2v-2.27c0-1.22-.99-2.2-2.2-2.2zM2.1 22V6.03c0-2.01 1-3.03 2.99-3.03h6.03c1.99 0 2.98 1.02 2.98 3.03V22" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M5.8 8.25h4.01M5.8 12h4.01M7.8 22v-3.75" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>

                        <span className="profile-address-type">
                          {address.type}
                        </span>

                        {address.isDefault && (
                          <span className="profile-address-default-badge">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="profile-address-details">
                        <span className="address-name">{address.name}</span>
                        <p>{address.street}</p>
                        <p>{address.area}</p>
                        <p>{address.city}</p>
                        <p>{address.country}</p>
                        <span className="address-phone">{address.phone}</span>
                      </div>
                    </div>

                    <div className="profile-address-actions">
                      <button
                        className="profile-address-action-btn edit-btn"
                        onClick={() => handleEditAddress(address.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.26 3.6l-8.21 8.69c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.4 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Edit
                      </button>

                      <button
                        className="profile-address-action-btn remove-btn"
                        onClick={() => handleRemoveAddress(address.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 5.98c-3.33-.33-6.68-.5-10.02-.5-1.98 0-3.96.1-5.94.3L3 5.98M8.5 4.97l.22-1.31C8.88 2.71 9 2 10.69 2h2.62c1.69 0 1.82.75 1.97 1.67l.22 1.3M18.85 9.14l-.65 10.07C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14M10.33 16.5h3.33M9.5 12.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN ==================== */}

          <div className="profile-right-column">
            {/* ========== ACCOUNT SUMMARY ========== */}

            <div className="profile-card profile-summary-card">
              <div className="profile-card-header">
                <div className="profile-card-title">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="3"
                      y="10"
                      width="3.5"
                      height="11"
                      rx="1.75"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                    />
                    <rect
                      x="10.25"
                      y="3"
                      width="3.5"
                      height="18"
                      rx="1.75"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                    />
                    <rect
                      x="17.5"
                      y="13"
                      width="3.5"
                      height="8"
                      rx="1.75"
                      stroke="#2563eb"
                      strokeWidth="2.2"
                    />
                  </svg>
                  <span>Account Summary</span>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="profile-summary-list">
                  {summaryData.map((item, index) => {
                    const IconComponent = item.Icon;
                    return (
                      <div className="profile-summary-item" key={index}>
                        <div className="profile-summary-label">
                          <IconComponent
                            size={20}
                            strokeWidth={2}
                            color="#1e293b"
                          />
                          <span>{item.label}</span>
                        </div>

                        <span className="profile-summary-value">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ========== PREFERENCES ========== */}

            <div className="profile-card profile-preferences-card">
              <div className="profile-card-header">
                <div className="profile-card-title">
                  <Settings size={22} color="#2563eb" strokeWidth={2.2} />
                  <span>Preferences</span>
                </div>
              </div>

              <div className="profile-card-body">
                <div className="profile-preferences-list">
                  {/* Email Notifications */}

                  <div className="profile-pref-item">
                    <div className="profile-pref-info">
                      <div className="profile-pref-icon pref-icon-blue">
                        <Mail size={22} strokeWidth={2.2} />
                      </div>

                      <div className="profile-pref-text">
                        <span className="pref-item-title">Email Notifications</span>
                        <span className="pref-item-desc">
                          Order updates, offers and more
                        </span>
                      </div>
                    </div>

                    <label className="profile-toggle">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={() =>
                          togglePreference("emailNotifications")
                        }
                      />
                      <span className="profile-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Marketing Updates */}

                  <div className="profile-pref-item">
                    <div className="profile-pref-info">
                      <div className="profile-pref-icon pref-icon-dark">
                        <Megaphone size={22} strokeWidth={2.2} />
                      </div>

                      <div className="profile-pref-text">
                        <span className="pref-item-title">Marketing Updates</span>
                        <span className="pref-item-desc">
                          New products, discounts and offers
                        </span>
                      </div>
                    </div>

                    <label className="profile-toggle">
                      <input
                        type="checkbox"
                        checked={preferences.marketingUpdates}
                        onChange={() =>
                          togglePreference("marketingUpdates")
                        }
                      />
                      <span className="profile-toggle-slider"></span>
                    </label>
                  </div>

                  {/* Order Updates */}

                  <div className="profile-pref-item">
                    <div className="profile-pref-info">
                      <div className="profile-pref-icon pref-icon-dark">
                        <Truck size={22} strokeWidth={2.2} />
                      </div>

                      <div className="profile-pref-text">
                        <span className="pref-item-title">Order Updates</span>
                        <span className="pref-item-desc">
                          Shipping and delivery notifications
                        </span>
                      </div>
                    </div>

                    <label className="profile-toggle">
                      <input
                        type="checkbox"
                        checked={preferences.orderUpdates}
                        onChange={() =>
                          togglePreference("orderUpdates")
                        }
                      />
                      <span className="profile-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== CHANGE PASSWORD ========== */}

            <div className="profile-card profile-password-card">
              <div className="profile-password-section">
                <div className="profile-password-info">
                  <div className="profile-password-icon">
                    <svg
                      width="30"
                      height="34"
                      viewBox="0 0 24 28"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="1.5"
                        y="9.5"
                        width="21"
                        height="17"
                        rx="3.5"
                        stroke="#2563eb"
                        strokeWidth="2.4"
                      />
                      <path
                        d="M5.5 10V6.5C5.5 3.46 7.96 1 11 1h2c3.04 0 5.5 2.46 5.5 5.5V10"
                        stroke="#2563eb"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <polygon
                        points="12,16 13.8,18 12,20 10.2,18"
                        fill="#2563eb"
                      />
                    </svg>
                  </div>

                  <div className="profile-password-text">
                    <span className="password-title">Change Password</span>
                    <span className="password-desc">
                      Keep your account secure with a strong password.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="profile-password-btn"
                  onClick={handleChangePassword}
                >
                  <svg
                    width="15"
                    height="17"
                    viewBox="0 0 24 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="1.5"
                      y="9.5"
                      width="21"
                      height="17"
                      rx="3.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                    />
                    <path
                      d="M5.5 10V6.5C5.5 3.46 7.96 1 11 1h2c3.04 0 5.5 2.46 5.5 5.5V10"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="12,16 13.8,18 12,20 10.2,18"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
