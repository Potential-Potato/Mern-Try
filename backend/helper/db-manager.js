// helper/db-manager.js
const mongoose = require('mongoose');
const startChangeStream = require('./CS-config');
const syncOfflineOperations = require('./sync-offline');
const { atlasUrl, mongodUrl } = require('../config');

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

let isConnectedToAtlas = false;

const initializeDatabaseConnection = async () => {
  let connected = await connectToDatabase(atlasUrl);
  if (connected) {
    isConnectedToAtlas = true;
    startChangeStream();
    await syncOfflineOperations(); // Sync offline operations when server starts
  } else {
    console.log('Attempting to connect to local MongoDB...');
    connected = await connectToDatabase(mongodUrl);
    if (connected) {
      isConnectedToAtlas = false;
    } else {
      console.error('Failed to connect to both Atlas and local MongoDB');
    }
  }
};

const switchToAtlas = async () => {
  const connected = await connectToDatabase(atlasUrl);
  if (connected) {
    isConnectedToAtlas = true;
    await syncOfflineOperations();
  }
  return connected;
};

const switchToLocal = async () => {
  const connected = await connectToDatabase(mongodUrl);
  if (connected) {
    isConnectedToAtlas = false;
  }
  return connected;
};

module.exports = {
  initializeDatabaseConnection,
  switchToAtlas,
  switchToLocal,
  isConnectedToAtlas: () => isConnectedToAtlas,
};
