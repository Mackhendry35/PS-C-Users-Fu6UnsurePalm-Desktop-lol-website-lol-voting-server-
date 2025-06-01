import express from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const app = express();
const port = 3000;

// Setup database
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { defaultData: { votes: {} } });

// Wrap everything inside an async function
const startServer = async () => {
  await db.read();

  app.use(cors());
  app.use(express.json());

  // Normalize keys to always use the same format (e.g., dashes)
  app.get('/votes', (req, res) => {
    const matchup = req.query.matchup;
  
    if (matchup) {
      const key = matchup.replace(/_/g, '-'); // normalize
      const voteData = db.data.votes[key] || {};
      return res.json(voteData);
    }
  
    // If no specific matchup requested, return all normalized votes
    const normalizedVotes = {};
    for (const key in db.data.votes) {
      const normalizedKey = key.replace(/_/g, '-');
      normalizedVotes[normalizedKey] = db.data.votes[key];
    }

    res.json({ votes: normalizedVotes });
  });
  

 // Route to vote
 app.post('/votes', async (req, res) => {
  const { matchup, vote } = req.body; // This expects 'matchup' and 'vote' from the frontend
  const key = matchup.replace(/_/g, '-');

  if (!db.data.votes[key]) {
    db.data.votes[key] = { [vote]: 1 }; // Initialize vote count for the first time
  } else {
    db.data.votes[key][vote] = (db.data.votes[key][vote] || 0) + 1;
  }

  await db.write();

  res.json({ success: true, votes: db.data.votes[key] });
});

// ADDED!!! Serve the results for the results page
 app.get('/api/results', async (req, res) => {
  await db.read();
  const results = {};

  for (const matchup in db.data.votes) {
    results[matchup] = db.data.votes[matchup];
  }

  res.json(results);
});

  // **ADDED ROUTE** to fix "Cannot GET /" error (line 54)
  app.get('/', (req, res) => {
    res.send('Hello, backend is working!');
  });

  app.get('/dump-votes', async (req, res) => {
  await db.read(); // Refresh from db.json
  res.json(db.data.votes);
});


  app.listen(port, () => {
    console.log(`✅ Server is running at http://localhost:${port}`);
  });
};

startServer();
