export interface ProfileCompletionUser {
  profilePic?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  gender?: string;
  dob?: string;
  city?: string;
  state?: string;
  country?: string;
  highestEducation?: string;
  institution?: string;
  fieldOfStudy?: string;
  bio?: string;
  literaryInterests?: string[];
  languages?: string[];
}

export interface CompletionItem {
  key: string;
  label: string;
  weight: number;
  complete: boolean;
  section: string;
}

const hasText = (value?: unknown) => typeof value === 'string' && value.trim().length > 0;
const hasItems = (value?: unknown) => Array.isArray(value) && value.length > 0;

/**
 * Profile completion intentionally excludes password and social links.
 * Password is security-only data and social links are optional extras.
 */
export function getProfileCompletionItems(profile: ProfileCompletionUser): CompletionItem[] {
  return [
    { key: 'profilePic', label: 'प्रोफ़ाइल तस्वीर', weight: 15, complete: hasText(profile.profilePic), section: 'basic' },
    { key: 'name', label: 'नाम', weight: 10, complete: hasText(profile.firstName) && hasText(profile.lastName), section: 'basic' },
    { key: 'username', label: 'यूज़रनेम', weight: 10, complete: hasText(profile.username), section: 'account' },
    { key: 'email', label: 'ईमेल', weight: 10, complete: hasText(profile.email), section: 'account' },
    { key: 'gender', label: 'लिंग', weight: 5, complete: hasText(profile.gender), section: 'basic' },
    { key: 'dob', label: 'जन्म तिथि', weight: 5, complete: hasText(profile.dob), section: 'basic' },
    { key: 'city', label: 'शहर', weight: 5, complete: hasText(profile.city), section: 'location' },
    { key: 'state', label: 'राज्य', weight: 3, complete: hasText(profile.state), section: 'location' },
    { key: 'country', label: 'देश', weight: 2, complete: hasText(profile.country), section: 'location' },
    { key: 'highestEducation', label: 'उच्चतम शिक्षा', weight: 5, complete: hasText(profile.highestEducation), section: 'education' },
    { key: 'institution', label: 'संस्थान', weight: 3, complete: hasText(profile.institution), section: 'education' },
    { key: 'fieldOfStudy', label: 'अध्ययन क्षेत्र', weight: 2, complete: hasText(profile.fieldOfStudy), section: 'education' },
    { key: 'bio', label: 'परिचय', weight: 10, complete: hasText(profile.bio), section: 'about' },
    { key: 'literaryInterests', label: 'साहित्यिक रुचियाँ', weight: 5, complete: hasItems(profile.literaryInterests), section: 'interests' },
    { key: 'languages', label: 'भाषाएँ', weight: 5, complete: hasItems(profile.languages), section: 'languages' },
  ];
}

export function calculateProfileCompletion(profile: ProfileCompletionUser): number {
  const total = getProfileCompletionItems(profile).reduce((sum, item) => sum + item.weight, 0);
  const earned = getProfileCompletionItems(profile)
    .filter((item) => item.complete)
    .reduce((sum, item) => sum + item.weight, 0);
  return Math.max(0, Math.min(100, Math.round((earned / total) * 100)));
}

export function getCompletionMessage(percent: number): string {
  if (percent >= 100) return 'आपकी प्रोफ़ाइल पूरी हो गई है ✨';
  if (percent >= 80) return 'बस थोड़ा और — प्रोफ़ाइल लगभग पूरी है!';
  if (percent >= 50) return 'आप आधे रास्ते से आगे हैं!';
  return 'अपनी प्रोफ़ाइल पूरी करके मेहफ़िल में अपनी पहचान बेहतर बनाइए।';
}
