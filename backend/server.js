// server.js
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');

const { atlasUrl, mongodUrl } = require('./config');
const indexRoute = require('./routes/index');
const startChangeStream = require('./helper/CS-config');
const syncOfflineOperations = require('./helper/sync-offline');
const checkNetworkStatus = require('./helper/network-status');

const app = express();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(atlasUrl);
    console.log('Connected to Atlas');
    global.isOnline = true;
    startChangeStream();
    await syncOfflineOperations(); // Sync offline operations when server starts
  } catch (error) {
    console.error('Error connecting to Atlas:', error);
    console.log('Attempting to connect to local MongoDB...');
    try {
      await mongoose.connect(mongodUrl);
      console.log('Connected to local MongoDB');
      global.isOnline = false;
    } catch (localError) {
      console.error('Error connecting to local MongoDB:', localError);
      global.isOnline = false;
    }
  }
};

connectToDatabase();

app.use(express.json());
app.use('/', indexRoute);

// Check network status periodically
checkNetworkStatus();

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
