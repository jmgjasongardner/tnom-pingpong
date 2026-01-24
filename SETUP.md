# Technomics Ping Pong Tournament - Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Choose a name (e.g., "technomics-pingpong")
4. Set a secure database password (save this!)
5. Choose a region close to your users
6. Wait for the project to be created

## 2. Get Your API Credentials

1. Go to Project Settings > API
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (starts with `eyJ...`)

## 3. Create Environment Variables

Create a file called `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ADMIN_KEY=choose-a-secret-key-for-admin-access
```

## 4. Create Database Tables

Go to Supabase Dashboard > SQL Editor and run this SQL:

```sql
-- Create players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  seed INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_seed INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create matches table
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  round VARCHAR(20) NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id INTEGER REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  player1_score INTEGER,
  player2_score INTEGER,
  winner_id INTEGER REFERENCES players(id),
  next_match_id INTEGER REFERENCES matches(id),
  next_match_slot INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(round, match_number)
);

-- Create indexes for performance
CREATE INDEX idx_matches_round ON matches(round);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_players_seed ON players(seed);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public bracket view)
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can read matches" ON matches FOR SELECT USING (true);

-- Allow anyone to update matches (score entry)
CREATE POLICY "Anyone can update matches" ON matches FOR UPDATE USING (true);

-- Allow inserts (for seeding)
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert matches" ON matches FOR INSERT WITH CHECK (true);

-- Enable real-time for matches table
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
```

## 5. Seed the Tournament Data

Run the seeding script to populate players and generate the bracket:

```bash
npm run seed
```

This will:
- Import all 76 players from `data/seeding.csv`
- Generate all 75 matches with correct matchups
- Set up the bracket structure with proper advancement paths

## 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the bracket.

## 7. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add your environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_KEY`
4. Deploy!

## Admin Access

Access the admin panel at `/admin?key=YOUR_ADMIN_KEY` to:
- Edit or undo match scores
- View all completed matches
- Manage seedings (before tournament starts)

## Bracket Structure

| Round | Players | Matches |
|-------|---------|---------|
| Play-in | Seeds 53-76 | 12 |
| Round 2 | 33-52 + winners | 16 |
| Round 3 | 17-32 + winners | 16 |
| Round 4 | 1-16 + winners | 16 |
| Sweet 16 | 16 winners | 8 |
| Elite 8 | 8 winners | 4 |
| Final Four | 4 winners | 2 |
| Championship | 2 winners | 1 |

**Total: 75 matches**
