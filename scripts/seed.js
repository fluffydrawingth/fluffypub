#!/usr/bin/env node
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.js
// Or:  cp .env.example .env  (fill in values)  then  node -r dotenv/config scripts/seed.js

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log('🌸 Seeding Fluffy Pub...\n');

  // 1. Create admin user
  const { data: admin, error: adminErr } = await supabase.auth.admin.createUser({
    email: 'admin@fluffypub.com',
    password: 'fluffyadmin2026',
    email_confirm: true,
    user_metadata: { name: 'Admin', role: 'admin' },
  });
  if (adminErr && !adminErr.message.includes('already')) console.error('Admin:', adminErr.message);
  else console.log('✅ Admin:', admin?.user?.email || 'already exists');

  // Update admin role in profiles
  if (admin?.user?.id) {
    await supabase.from('profiles').upsert({ id: admin.user.id, email: 'admin@fluffypub.com', name: 'Admin', role: 'admin' });
  } else {
    // Find and update existing
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', 'admin@fluffypub.com').single();
    if (existing) await supabase.from('profiles').update({ role: 'admin' }).eq('id', existing.id);
  }

  // 2. Create artist user
  const { data: artist, error: artistErr } = await supabase.auth.admin.createUser({
    email: 'artist@mochi.art',
    password: 'mochiartist',
    email_confirm: true,
    user_metadata: { name: 'Mochi Arts', role: 'artist' },
  });
  if (artistErr && !artistErr.message.includes('already')) console.error('Artist:', artistErr.message);
  else console.log('✅ Artist:', artist?.user?.email || 'already exists');

  let artistId = artist?.user?.id;
  if (!artistId) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', 'artist@mochi.art').single();
    artistId = existing?.id;
  }
  if (artistId) {
    await supabase.from('profiles').upsert({
      id: artistId, email: 'artist@mochi.art', name: 'Mochi Arts',
      role: 'artist', artist_slug: 'mochi-arts',
      bio: 'Lover of bunnies, gardens, and all things soft and dreamy.',
    });
  }

  // 3. Create customer user
  const { data: customer } = await supabase.auth.admin.createUser({
    email: 'customer@test.com', password: 'customer123',
    email_confirm: true, user_metadata: { name: 'Sophie Martin', role: 'customer' },
  });
  console.log('✅ Customer:', customer?.user?.email || 'already exists');

  // 4. Seed products
  if (artistId) {
    const products = [
      { title:'Bunny Garden Dreams', slug:'bunny-garden-dreams', price:8.99, original_price:12.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Animals', description:'Hop through enchanting gardens filled with playful bunnies, blooming flowers, and whimsical butterflies.', image:'🐰', type:'digital', pages:30, rating:4.9, reviews:247, tags:['bunnies','garden','spring'], featured:true, bestseller:true, is_new:false },
      { title:'Celestial Mandalas', slug:'celestial-mandalas', price:9.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Mandala', description:'Journey through the cosmos with intricate mandala designs featuring moons, stars, and constellations.', image:'🌙', type:'digital', pages:40, rating:4.8, reviews:189, tags:['stars','moon','cosmic'], featured:true, is_new:false },
      { title:'Sweet Kawaii World', slug:'sweet-kawaii-world', price:7.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Kawaii', description:'Adorable kawaii characters, yummy food friends, and super cute scenes!', image:'🍓', type:'digital', pages:25, rating:5.0, reviews:312, tags:['cute','food','characters'], featured:true, bestseller:true, is_new:true },
      { title:'Enchanted Forest', slug:'enchanted-forest', price:10.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Fantasy', description:'Step into a magical forest where fairies dance among giant mushrooms.', image:'🍄', type:'digital', pages:35, rating:4.7, reviews:156, tags:['forest','fairies','mushrooms'], is_new:true },
      { title:'Botanical Bliss', slug:'botanical-bliss', price:9.49, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Botanicals', description:'Lush botanical illustrations featuring exotic flowers, tropical leaves, and succulents.', image:'🌿', type:'digital', pages:45, rating:4.6, reviews:203, tags:['flowers','leaves','nature'] },
      { title:'Winter Wonderland', slug:'winter-wonderland', price:8.49, original_price:11.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Seasonal', description:'Cozy winter scenes with snowflakes, woodland animals in scarves, and holiday magic.', image:'❄️', type:'digital', pages:28, rating:4.9, reviews:178, tags:['winter','snow','holiday'] },
      { title:'Ocean Friends', slug:'ocean-friends', price:8.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Animals', description:'Dive deep with adorable sea creatures, mermaids, coral reefs, and underwater kingdoms!', image:'🐠', type:'digital', pages:32, rating:4.8, reviews:134, tags:['ocean','fish','mermaids'], is_new:true },
      { title:'Dragon Tales', slug:'dragon-tales', price:11.99, artist_id:artistId, artist_name:'Mochi Arts', artist_slug:'mochi-arts', category:'Fantasy', description:'Epic fantasy adventures with friendly dragons, mystical castles, and brave little knights.', image:'🐉', type:'digital', pages:38, rating:4.9, reviews:267, tags:['dragons','castles','magic'], featured:true, bestseller:true },
    ];

    for (const p of products) {
      const { error } = await supabase.from('products').upsert(p, { onConflict: 'slug' });
      if (error) console.error('Product error:', p.title, error.message);
    }
    console.log('✅ Products seeded (8)');
  }

  // 5. Ensure theme row exists
  await supabase.from('theme').upsert({ id: 1, config: {
    primaryColor:'#f472b6', secondaryColor:'#c084fc', accentColor:'#fb923c',
    bgColor:'#fdf2f8', bgColor2:'#faf5ff', textColor:'#4a1942',
    fontFamily:"'Nunito', sans-serif", logoText:'Fluffy Pub', logoEmoji:'🐰',
    heroTitle:'Color Your World ✨', heroSubtitle:'Adorable coloring books for every dreamer 🌸',
    bannerText:'🌟 Free shipping on orders over $30! Use FLUFFY15 for 15% off 🌸',
    bannerBg:'#f472b6', sections:['hero','featured','categories','artists','newsletter'],
  }}, { onConflict: 'id' });
  console.log('✅ Theme seeded');

  console.log('\n🎉 Done!');
  console.log('   Admin:    admin@fluffypub.com / fluffyadmin2026');
  console.log('   Artist:   artist@mochi.art / mochiartist');
  console.log('   Customer: customer@test.com / customer123');
}

seed().catch(console.error);
