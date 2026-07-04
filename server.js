require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { router: authRouter, requireAuth } = require('./routes/auth');
const usersRouter = require('./routes/users');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public auth routes (login)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Config panel running at http://localhost:${PORT}`);
});
