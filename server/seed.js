// run with: npm run seed
// force:true wipes the tables first, so only use it here
const { sequelize, Playlist, Song } = require("./models");

// durations are in seconds (225 = 3:45)
const data = [
  {
    name: "Morning Focus",
    description: "Calm songs to start the day",
    songs: [
      { title: "Sunrise", artist: "Ambient Flow", duration: 225 },      // 3:45
      { title: "Coffee Break", artist: "Lo-Fi Chill", duration: 170 },  // 2:50
      { title: "Deep Breath", artist: "Mindful Tones", duration: 250 }, // 4:10
      { title: "Daily Focus", artist: "Study Rhythms", duration: 210 }, // 3:30
      { title: "Weightless", artist: "Marconi Union", duration: 480 },
      { title: "Clair de Lune", artist: "Claude Debussy", duration: 300 },
      { title: "Gymnopédie No. 1", artist: "Erik Satie", duration: 210 },
      { title: "Morning Dew", artist: "Nils Frahm", duration: 195 },
    ],
  },
  {
    name: "Workout Mix",
    description: "High-energy music for exercise",
    songs: [
      { title: "Till I Collapse", artist: "Eminem", duration: 297 },
      { title: "Stronger", artist: "Kanye West", duration: 312 },
      { title: "Can't Hold Us", artist: "Macklemore & Ryan Lewis", duration: 258 },
      { title: "Eye of the Tiger", artist: "Survivor", duration: 245 },
      { title: "Lose Yourself", artist: "Eminem", duration: 326 },
      { title: "POWER", artist: "Kanye West", duration: 292 },
      { title: "Believer", artist: "Imagine Dragons", duration: 204 },
      { title: "Thunderstruck", artist: "AC/DC", duration: 292 },
      { title: "Pump It", artist: "Black Eyed Peas", duration: 213 },
      { title: "Remember the Name", artist: "Fort Minor", duration: 230 },
      { title: "Bangarang", artist: "Skrillex", duration: 215 },
      { title: "Uptown Funk", artist: "Mark Ronson", duration: 270 },
    ],
  },
  {
    name: "Chill Evening",
    description: "Relaxing songs for the evening",
    songs: [
      { title: "Sunset Lover", artist: "Petit Biscuit", duration: 234 },
      { title: "Night Owl", artist: "Galimatias", duration: 197 },
      { title: "Coastline", artist: "Hollow Coves", duration: 228 },
      { title: "Holocene", artist: "Bon Iver", duration: 337 },
      { title: "Ivy", artist: "Frank Ocean", duration: 249 },
      { title: "The Night We Met", artist: "Lord Huron", duration: 208 },
      { title: "Redbone", artist: "Childish Gambino", duration: 327 },
      { title: "Landslide", artist: "Fleetwood Mac", duration: 199 },
      { title: "Skinny Love", artist: "Bon Iver", duration: 238 },
      { title: "Vienna", artist: "Billy Joel", duration: 214 },
    ],
  },
  {
    name: "Road Trip",
    description: "Windows down, volume up",
    songs: [
      { title: "Mr. Blue Sky", artist: "Electric Light Orchestra", duration: 305 },
      { title: "Life Is a Highway", artist: "Tom Cochrane", duration: 264 },
      { title: "Africa", artist: "Toto", duration: 295 },
      { title: "Take It Easy", artist: "Eagles", duration: 208 },
      { title: "Born to Run", artist: "Bruce Springsteen", duration: 270 },
      { title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd", duration: 283 },
      { title: "Free Fallin'", artist: "Tom Petty", duration: 256 },
      { title: "Don't Stop Believin'", artist: "Journey", duration: 251 },
      { title: "Livin' on a Prayer", artist: "Bon Jovi", duration: 249 },
      { title: "Go Your Own Way", artist: "Fleetwood Mac", duration: 218 },
      { title: "American Pie", artist: "Don McLean", duration: 522 },
      { title: "Hotel California", artist: "Eagles", duration: 391 },
      { title: "Sweet Caroline", artist: "Neil Diamond", duration: 201 },
      { title: "Wagon Wheel", artist: "Old Crow Medicine Show", duration: 289 },
      { title: "Ramble On", artist: "Led Zeppelin", duration: 275 },
      { title: "Drive", artist: "Incubus", duration: 231 },
      { title: "On the Road Again", artist: "Willie Nelson", duration: 150 },
      { title: "Running on Empty", artist: "Jackson Browne", duration: 209 },
      { title: "Highway to Hell", artist: "AC/DC", duration: 208 },
      { title: "Fast Car", artist: "Tracy Chapman", duration: 296 },
      { title: "Come Together", artist: "The Beatles", duration: 259 },
      { title: "Dancing in the Dark", artist: "Bruce Springsteen", duration: 245 },
      { title: "Feel It Still", artist: "Portugal. The Man", duration: 163 },
      { title: "Ho Hey", artist: "The Lumineers", duration: 163 },
      { title: "Shut Up and Dance", artist: "Walk the Moon", duration: 199 },
    ],
  },
  {
    name: "Study Beats",
    description: "Lo-fi instrumentals to focus to",
    songs: [
      { title: "Snowman", artist: "WYS", duration: 137 },
      { title: "Affection", artist: "Jinsang", duration: 132 },
      { title: "Aruarian Dance", artist: "Nujabes", duration: 244 },
      { title: "Feather", artist: "Nujabes", duration: 231 },
      { title: "Comfort", artist: "Idealism", duration: 118 },
      { title: "Small Hours", artist: "Deauxnuma", duration: 145 },
      { title: "Kyoto", artist: "Idealism", duration: 122 },
      { title: "Lush", artist: "Purrple Cat", duration: 160 },
      { title: "Cotton Cloud", artist: "Fatb", duration: 138 },
      { title: "Sleepless", artist: "Kupla", duration: 174 },
      { title: "Breathe", artist: "Sworn", duration: 152 },
      { title: "Fluffy", artist: "Kudasaibeats", duration: 129 },
      { title: "Wander", artist: "Aso", duration: 156 },
      { title: "Warmth", artist: "brillion", duration: 141 },
    ],
  },
  {
    name: "Party Hits",
    description: "Dance floor favorites",
    songs: [
      { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: 270 },
      { title: "Dance Monkey", artist: "Tones and I", duration: 209 },
      { title: "Levitating", artist: "Dua Lipa", duration: 203 },
      { title: "Blinding Lights", artist: "The Weeknd", duration: 200 },
      { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", duration: 236 },
      { title: "Party Rock Anthem", artist: "LMFAO", duration: 262 },
      { title: "I Gotta Feeling", artist: "Black Eyed Peas", duration: 289 },
      { title: "Shape of You", artist: "Ed Sheeran", duration: 233 },
      { title: "One Dance", artist: "Drake", duration: 173 },
      { title: "Get Lucky", artist: "Daft Punk", duration: 369 },
      { title: "Titanium", artist: "David Guetta ft. Sia", duration: 245 },
      { title: "We Found Love", artist: "Rihanna", duration: 215 },
      { title: "Don't Start Now", artist: "Dua Lipa", duration: 183 },
      { title: "September", artist: "Earth, Wind & Fire", duration: 215 },
      { title: "Yeah!", artist: "Usher", duration: 250 },
      { title: "Hey Ya!", artist: "OutKast", duration: 235 },
      { title: "Sugar", artist: "Maroon 5", duration: 235 },
      { title: "Timber", artist: "Pitbull ft. Kesha", duration: 204 },
      { title: "Where Have You Been", artist: "Rihanna", duration: 244 },
      { title: "The Middle", artist: "Zedd, Maren Morris", duration: 184 },
    ],
  },
];

// make each playlist then add its songs
async function seed() {
  try {
    await sequelize.sync({ force: true }); // drop + recreate every table

    for (const p of data) {
      const playlist = await Playlist.create({
        name: p.name,
        description: p.description,
      });

      for (const s of p.songs) {
        await Song.create({ ...s, PlaylistId: playlist.id });
      }
    }

    const totalSongs = data.reduce((n, p) => n + p.songs.length, 0);
    console.log(`✅ Seeded ${data.length} playlists and ${totalSongs} songs`);

    await sequelize.close();
    process.exit(0); // exit code 0 = success
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1); // exit code 1 = failure
  }
}

seed();
