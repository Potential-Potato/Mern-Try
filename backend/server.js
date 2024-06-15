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

const connectToDatabase = async (url) => {
  try {
    await mongoose.connect(url);
    console.log(`Connected to database: ${url}`);
    return true;
  } catch (error) {
    console.error(`Error connecting to database: ${url}`, error);
    return false;
  }
};

const initialConnect = async () => {
  let connected = await connectToDatabase(atlasUrl);
  if (connected) {
    global.isOnline = true;
    startChangeStream();
    await syncOfflineOperations(); // Sync offline operations when server starts
  } else {
    console.log('Attempting to connect to local MongoDB...');
    connected = await connectToDatabase(mongodUrl);
    if (connected) {
      global.isOnline = false;
    } else {
      console.error('Failed to connect to both Atlas and local MongoDB');
    }
  }
};

initialConnect();

app.use(express.json());
app.use('/', indexRoute);

// Check network status periodically
checkNetworkStatus();

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
