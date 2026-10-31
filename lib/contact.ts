/** Single source of truth for the public support address and the bilingual feedback invitation. */
export const SUPPORT_EMAIL = 'support@mehfilpoetry.in';

export const FEEDBACK_INVITE = {
  hi: {
    title: 'मेहफ़िल को और बेहतर बनाने में हमारा साथ दीजिए',
    text: 'आपके सुझाव, शिकायतें और विचार हमारे लिए बेहद अहम हैं। अपनी बात हमें इस ईमेल पर भेजिए:',
  },
  en: {
    title: 'Help us make Mehfil better',
    text: 'Your suggestions, complaints and ideas matter deeply to us. Write to us at:',
  },
} as const;
