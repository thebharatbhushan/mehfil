import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mehfil — Poetry Sanctuary',
    short_name: 'Mehfil',
    description: 'A premium Hindi & Urdu poetry sanctuary',
    start_url: '/',
    display: 'standalone',
    background_color: '#fef9f2',
    theme_color: '#c16a4b',
    icons: [],
  };
}
