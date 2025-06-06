import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// 🟢 GET votes for a matchup or all
app.get('/votes', async (req, res) => {
  const { matchup } = req.query;

  if (matchup) {
    const key = matchup.replace(/_/g, '-');
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('matchup', key)
      .single();

    if (error && error.code !== 'PGRST116') return res.status(500).json({ error });
    return res.json(data || {});
  }

  // If no matchup is specified, return all
  const { data, error } = await supabase.from('votes').select('*');
  if (error) return res.status(500).json({ error });

  const results = {};
  data.forEach(({ matchup, vote_counts }) => {
    results[matchup] = vote_counts;
  });

  res.json({ votes: results });
});

// 🟢 POST vote
app.post('/votes', async (req, res) => {
  const { matchup, vote } = req.body;
  const key = matchup.replace(/_/g, '-');

  // Try to get existing vote data
  const { data: existing, error: fetchError } = await supabase
    .from('votes')
    .select('*')
    .eq('matchup', key)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return res.status(500).json({ error: fetchError });
  }

  let vote_counts = existing?.vote_counts || {};
  vote_counts[vote] = (vote_counts[vote] || 0) + 1;

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('votes')
      .update({ vote_counts })
      .eq('matchup', key);

    if (updateError) return res.status(500).json({ error: updateError });
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from('votes')
      .insert([{ matchup: key, vote_counts }]);

    if (insertError) return res.status(500).json({ error: insertError });
  }

  res.json({ success: true, votes: vote_counts });
});

// 🟢 Simple route to verify server is up
app.get('/', (req, res) => {
  res.send('✅ Backend is working with Supabase now!');
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});

