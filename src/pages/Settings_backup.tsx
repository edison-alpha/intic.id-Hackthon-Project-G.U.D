import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/hooks/usePushChainWallet';
import { toast } from 'sonner';
import { isOrganizerRegistered, getOrganizerProfile, updateOrganizerProfile } from '@/services/eventOrganizerContract';
import { uploadImageToPinata, uploadMetadataToPinata, getIpfsUrl } from '@/services/pinataService';
import {
  User,
  Mail,
  Bell,
  Upload,
  Save,
  Download,
  Trash2,
  Camera,
  Globe,
  Moon,
  Sun,
  Check,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  Loader2,
  RotateCcw,
} from 'lucide-react';

const Settings = () => {
  const { wallet } = useWallet();
  const walletAddress = wallet?.address;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // EO Profile state
  const [isEO, setIsEO] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Original data for reset functionality
  const [originalData, setOriginalData] = useState<any>(null);

  // EO Form data - matches registration modal structure
  const [formData, setFormData] = useState({
    eoName: '',
    organizationName: '',
    email: '',
    contactPhone: '',
    website: '',
    location: '',
    description: '',
    category: '',
    logoUrl: '',
    twitter: '',
    instagram: '',
    tiktok: '',
    telegram: '',
  });

  // Changed fields tracking
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadEOProfile();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const loadEOProfile = async () => {
    if (!walletAddress) return;

    setLoading(true);

    try {
      // Check if user is registered as EO
      const registered = await isOrganizerRegistered(walletAddress);
      setIsEO(registered);

      if (registered) {

        // Get EO profile from blockchain
        const profile = await getOrganizerProfile(walletAddress);

        if (profile && profile.metadata) {
          const profileData = {
            eoName: profile.metadata.eoName || '',
            organizationName: profile.metadata.organizationName || '',
            email: profile.metadata.email || '',
            contactPhone: profile.metadata.contactPhone || '',
            website: profile.metadata.website || '',
            location: profile.metadata.location || '',
            description: profile.metadata.description || '',
            category: profile.metadata.category || '',
            logoUrl: profile.metadata.logo || profile.metadata.logoUrl || '',
            twitter: profile.metadata.socialMedia?.twitter || '',
            instagram: profile.metadata.socialMedia?.instagram || '',
            tiktok: profile.metadata.socialMedia?.tiktok || '',
            telegram: profile.metadata.socialMedia?.telegram || '',
          };

          setFormData(profileData);
          setOriginalData(profileData); // Store original data for reset

          // Load notification preferences from metadata if available
          if (profile.metadata.preferences) {
            setEmailNotifications(profile.metadata.preferences.emailNotifications ?? true);
            setPushNotifications(profile.metadata.preferences.pushNotifications ?? true);
          }

        } else {
          console.warn('⚠️ No metadata found in profile');
          toast.warning('Profile data is incomplete. Some fields may be empty.');
        }
      }
    } catch (error) {
      console.error('Failed to load EO profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Track changed fields
    if (originalData && originalData[name] !== value) {
      setChangedFields(prev => new Set(prev.add(name)));
    } else if (originalData && originalData[name] === value) {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(name);
        return newSet;
      });
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setChangedFields(new Set());
      toast.success('Form reset to original values');
    }
  };

  const handleSave = async () => {
    if (!walletAddress || !isEO) return;

    // Only proceed if there are changes
    if (changedFields.size === 0 && !uploadingImage) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);

    try {
      // Validate required fields only if they were changed or are empty
      const requiredFields = ['eoName', 'organizationName', 'email'];
      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]?.trim()) {
          toast.error(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`);
          setSaving(false);
          return;
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Invalid email address');
        setSaving(false);
        return;
      }

      toast.loading('Updating profile...', { id: 'saving' });

      // Get the current metadata and merge with changes
      const currentProfile = await getOrganizerProfile(walletAddress);
      const currentMetadata = currentProfile?.metadata || {};

      // Prepare updated metadata, preserving existing fields not in the form
      const updatedMetadata = {
        ...currentMetadata, // Keep existing data
        eoName: formData.eoName,
        organizationName: formData.organizationName,
        email: formData.email,
        contactPhone: formData.contactPhone,
        website: formData.website,
        location: formData.location,
        description: formData.description,
        category: formData.category,
        logo: formData.logoUrl, // Use 'logo' field like in registration
        logoUrl: formData.logoUrl, // Keep both for compatibility
        socialMedia: {
          twitter: formData.twitter,
          instagram: formData.instagram,
          tiktok: formData.tiktok,
          telegram: formData.telegram,
        },
        preferences: {
          emailNotifications,
          pushNotifications,
        },
        updatedAt: new Date().toISOString(),
        version: currentMetadata.version || '1.0',
      };

      // Upload updated metadata to IPFS
      const { ipfsUrl, cid } = await uploadMetadataToPinata(updatedMetadata);

      // Update on blockchain
      const result = await updateOrganizerProfile(walletAddress, ipfsUrl);

      toast.success('Profile updated successfully!', { id: 'saving' });

      // Update original data and clear changed fields
      setOriginalData(formData);
      setChangedFields(new Set());

      // Reload profile after a short delay to confirm changes
      setTimeout(() => {
        loadEOProfile();
      }, 1000);

    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile', { id: 'saving' });
    } finally {
      setSaving(false);
    }
  };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!walletAddress) return;

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      toast.loading('Uploading logo...', { id: 'upload-logo' });
      
      // Upload to IPFS
      const logoUrl = await uploadImageToPinata(file);
      
      // Mark logo as changed
      if (originalData && originalData.logoUrl !== logoUrl) {
        setChangedFields(prev => new Set(prev.add('logoUrl')));
      }
      
      setFormData(prev => ({ ...prev, logoUrl }));
      toast.success('Logo uploaded! Remember to save changes.', { id: 'upload-logo' });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo', { id: 'upload-logo' });
    } finally {
      setUploadingImage(false);
    }
  };

  // Helper function to get field status
  const getFieldClassName = (fieldName: string, baseClassName: string) => {
    const isChanged = changedFields.has(fieldName);
    return isChanged 
      ? `${baseClassName} border-orange-500/50 focus:border-orange-500 bg-orange-500/5`
      : baseClassName;
  };

  const getFieldIndicator = (fieldName: string) => {
    return changedFields.has(fieldName) ? (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
      </div>
    ) : null;
  };
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">
              Please connect your wallet to access settings
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] rounded-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Profile Settings</h2>
            <p className="text-gray-400">Please wait while we fetch your profile data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isEO) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Event Organizer Only</h2>
            <p className="text-gray-400 mb-6">
              This page is only available for registered Event Organizers
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0]"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Event Organizer Settings</h1>
          <p className="text-gray-400">Update your EO profile and preferences</p>
          
          {/* Changes indicator */}
          {changedFields.size > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-orange-300 font-medium">
                    You have unsaved changes in {changedFields.size} field{changedFields.size > 1 ? 's' : ''}
                  </p>
                  <p className="text-orange-400/80 text-sm">
                    Modified: {Array.from(changedFields).map(field => 
                      field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                    ).join(', ')}
                  </p>
                </div>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* EO Identity */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#d548ec]" />
                Organization Identity
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your organization's display information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Organization Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute bottom-0 right-0 bg-[#d548ec] hover:bg-[#c030d6] text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-white mb-2 block">Organization Logo</Label>
                  <p className="text-sm text-gray-400 mb-2">
                    Upload your organization's logo
                  </p>
                  <p className="text-xs text-gray-500">
                    Recommended: Square image, max 5MB
                  </p>
                </div>
              </div>

              {/* EO Name */}
              <div>
                <Label htmlFor="eoName" className="text-white mb-2 block">
                  EO Name (Display Name) <span className="text-[#d548ec]">*</span>
                </Label>
                <Input
                  id="eoName"
                  name="eoName"
                  value={formData.eoName}
                  onChange={handleChange}
                  placeholder="Enter your display name"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is how your organization will appear to users
                </p>
              </div>

              {/* Organization Name */}
              <div>
                <Label htmlFor="organizationName" className="text-white mb-2 block">
                  Organization Name (Legal Name) <span className="text-[#d548ec]">*</span>
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Enter your legal organization name"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Official registered name of your organization
                </p>
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category" className="text-white mb-2 block">
                  Primary Category <span className="text-[#d548ec]">*</span>
                </Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-[#0A0A0A] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#d548ec] focus:bg-gray-900/70 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                  required
                >
                  <option value="">Select a category</option>
                  <option value="concert">🎵 Concert & Music</option>
                  <option value="conference">💼 Conference & Business</option>
                  <option value="sports">⚽ Sports & Fitness</option>
                  <option value="festival">🎪 Festival & Fair</option>
                  <option value="theater">🎭 Theater & Arts</option>
                  <option value="education">📚 Education & Workshop</option>
                  <option value="networking">🤝 Networking</option>
                  <option value="other">🌟 Other</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#d548ec]" />
                Contact Information
              </CardTitle>
              <CardDescription className="text-gray-400">
                How people can reach you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-white mb-2 block">
                  Email Address <span className="text-[#d548ec]">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your-email@example.com"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="contactPhone" className="text-white mb-2 block">
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="+62 812-3456-7890"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                />
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website" className="text-white mb-2 block">
                  Website
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-white mb-2 block">
                  Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, Country"
                  className="bg-[#0A0A0A] border-gray-800 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#d548ec]" />
                Social Media
              </CardTitle>
              <CardDescription className="text-gray-400">
                Connect your social media profiles (Optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Twitter */}
                <div>
                  <Label htmlFor="twitter" className="text-white mb-2 block">
                    Twitter / X
                  </Label>
                  <Input
                    id="twitter"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    placeholder="@username or link"
                    className="bg-[#0A0A0A] border-gray-800 text-white"
                  />
                </div>

                {/* Instagram */}
                <div>
                  <Label htmlFor="instagram" className="text-white mb-2 block">
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    placeholder="@username or link"
                    className="bg-[#0A0A0A] border-gray-800 text-white"
                  />
                </div>

                {/* TikTok */}
                <div>
                  <Label htmlFor="tiktok" className="text-white mb-2 block">
                    TikTok
                  </Label>
                  <Input
                    id="tiktok"
                    name="tiktok"
                    value={formData.tiktok}
                    onChange={handleChange}
                    placeholder="@username or link"
                    className="bg-[#0A0A0A] border-gray-800 text-white"
                  />
                </div>

                {/* Telegram */}
                <div>
                  <Label htmlFor="telegram" className="text-white mb-2 block">
                    Telegram
                  </Label>
                  <Input
                    id="telegram"
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleChange}
                    placeholder="@username or link"
                    className="bg-[#0A0A0A] border-gray-800 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Organization */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#d548ec]" />
                About Your Organization
              </CardTitle>
              <CardDescription className="text-gray-400">
                Tell people about your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="description" className="text-white mb-2 block">
                  Description <span className="text-[#d548ec]">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell us about your organization, the types of events you host, your experience..."
                  className="bg-[#0A0A0A] border-gray-800 text-white min-h-[120px]"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  {formData.description.length} / 500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#d548ec]" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-white">Email Notifications</Label>
                  <p className="text-sm text-gray-400">
                    Receive updates about your events and ticket sales
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-white">Push Notifications</Label>
                  <p className="text-sm text-gray-400">
                    Get browser notifications for important updates
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between gap-3 sticky bottom-4">
            <div className="text-sm text-gray-400">
              {changedFields.size > 0 ? (
                <span className="text-orange-400">
                  {changedFields.size} field{changedFields.size > 1 ? 's' : ''} modified
                </span>
              ) : (
                <span>No changes detected</span>
              )}
            </div>
            
            <div className="flex gap-3">
              {changedFields.size > 0 && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Changes
                </Button>
              )}
              
              <Button
                onClick={handleSave}
                disabled={saving || (changedFields.size === 0 && !uploadingImage)}
                size="lg"
                className="bg-gradient-to-r from-[#d548ec] to-[#e7a4fd] hover:from-[#c030d6] hover:to-[#d183f0] text-white font-semibold shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : changedFields.size > 0 || uploadingImage ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes ({changedFields.size})
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    No Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;