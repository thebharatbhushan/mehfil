import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mehfil — Poetry Sanctuary',
    short_name: 'Mehfil',
    description: 'हिंदी और उर्दू कविता, शायरी और साहित्य का मंच — A Hindi & Urdu poetry community',
    start_url: '/',
    lang: 'hi',
    display: 'standalone',
    background_color: '#fef9f2',
    theme_color: '#c16a4b',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
