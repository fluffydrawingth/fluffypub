export interface Product {
  id: number;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  artist: string;
  artistSlug: string;
  category: string;
  tags: string[];
  pages: number;
  rating: number;
  reviews: number;
  description: string;
  image: string;
  featured: boolean;
  bestseller: boolean;
  new: boolean;
}

export const CATEGORIES = ['All', 'Animals', 'Fantasy', 'Botanicals', 'Mandala', 'Kawaii', 'Seasonal'];

export const PRODUCTS: Product[] = [
  {
    id: 1, title: 'Bunny Garden Dreams', slug: 'bunny-garden-dreams', price: 8.99,
    originalPrice: 12.99, artist: 'Mochi Arts', artistSlug: 'mochi-arts',
    category: 'Animals', tags: ['bunnies', 'garden', 'spring'],
    pages: 30, rating: 4.9, reviews: 247,
    description: 'Hop through enchanting gardens filled with playful bunnies, blooming flowers, and whimsical butterflies. Perfect for all ages!',
    image: '🐰', featured: true, bestseller: true, new: false,
  },
  {
    id: 2, title: 'Celestial Mandalas', slug: 'celestial-mandalas', price: 9.99,
    artist: 'StarDust Studio', artistSlug: 'stardust-studio',
    category: 'Mandala', tags: ['stars', 'moon', 'cosmic'],
    pages: 40, rating: 4.8, reviews: 189,
    description: 'Journey through the cosmos with intricate mandala designs featuring moons, stars, and constellations.',
    image: '🌙', featured: true, bestseller: false, new: false,
  },
  {
    id: 3, title: 'Sweet Kawaii World', slug: 'sweet-kawaii-world', price: 7.99,
    artist: 'Pastel Dreams', artistSlug: 'pastel-dreams',
    category: 'Kawaii', tags: ['cute', 'food', 'characters'],
    pages: 25, rating: 5.0, reviews: 312,
    description: 'Adorable kawaii characters, yummy food friends, and super cute scenes to bring to life with your colors!',
    image: '🍓', featured: true, bestseller: true, new: true,
  },
  {
    id: 4, title: 'Enchanted Forest', slug: 'enchanted-forest', price: 10.99,
    artist: 'Mochi Arts', artistSlug: 'mochi-arts',
    category: 'Fantasy', tags: ['forest', 'fairies', 'mushrooms'],
    pages: 35, rating: 4.7, reviews: 156,
    description: 'Step into a magical forest where fairies dance among giant mushrooms and fireflies light the way.',
    image: '🍄', featured: false, bestseller: false, new: true,
  },
  {
    id: 5, title: 'Botanical Bliss', slug: 'botanical-bliss', price: 9.49,
    artist: 'Green Thumb Studio', artistSlug: 'green-thumb',
    category: 'Botanicals', tags: ['flowers', 'leaves', 'nature'],
    pages: 45, rating: 4.6, reviews: 203,
    description: 'Lush botanical illustrations featuring exotic flowers, tropical leaves, and delicate succulents.',
    image: '🌿', featured: false, bestseller: false, new: false,
  },
  {
    id: 6, title: 'Winter Wonderland', slug: 'winter-wonderland', price: 8.49,
    originalPrice: 11.99, artist: 'Pastel Dreams', artistSlug: 'pastel-dreams',
    category: 'Seasonal', tags: ['winter', 'snow', 'holiday'],
    pages: 28, rating: 4.9, reviews: 178,
    description: 'Cozy winter scenes with snowflakes, woodland animals in scarves, and festive holiday magic.',
    image: '❄️', featured: false, bestseller: false, new: false,
  },
  {
    id: 7, title: 'Ocean Friends', slug: 'ocean-friends', price: 8.99,
    artist: 'StarDust Studio', artistSlug: 'stardust-studio',
    category: 'Animals', tags: ['ocean', 'fish', 'mermaids'],
    pages: 32, rating: 4.8, reviews: 134,
    description: 'Dive deep with adorable sea creatures, mermaids, coral reefs, and underwater kingdoms!',
    image: '🐠', featured: false, bestseller: false, new: true,
  },
  {
    id: 8, title: 'Dragon Tales', slug: 'dragon-tales', price: 11.99,
    artist: 'Green Thumb Studio', artistSlug: 'green-thumb',
    category: 'Fantasy', tags: ['dragons', 'castles', 'magic'],
    pages: 38, rating: 4.9, reviews: 267,
    description: 'Epic fantasy adventures with friendly dragons, mystical castles, and brave little knights.',
    image: '🐉', featured: true, bestseller: true, new: false,
  },
];

export const ARTISTS = [
  { name: 'Mochi Arts', slug: 'mochi-arts', avatar: '🎨', bio: 'Lover of bunnies, gardens, and all things soft and dreamy. Based in Kyoto 🌸', products: 12, followers: 3400 },
  { name: 'StarDust Studio', slug: 'stardust-studio', avatar: '⭐', bio: 'Creating cosmic and celestial art that takes you to another universe ✨', products: 8, followers: 2100 },
  { name: 'Pastel Dreams', slug: 'pastel-dreams', avatar: '🌈', bio: 'Everything pastel, everything kawaii, everything delightful 🍬', products: 15, followers: 5600 },
  { name: 'Green Thumb Studio', slug: 'green-thumb', avatar: '🌿', bio: 'Nature-inspired art that brings the outdoors to your coloring table 🍃', products: 10, followers: 1800 },
];
