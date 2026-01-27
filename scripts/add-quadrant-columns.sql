-- Add quadrant column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS quadrant smallint;

-- Add quadrant_match_num column to matches table (for ordering within quadrant)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS quadrant_match_num smallint;

-- Add quadrant column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS quadrant smallint;

-- Note: After running this migration, re-run the seed script:
-- npm run seed
