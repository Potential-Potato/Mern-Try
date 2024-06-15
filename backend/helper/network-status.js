// helper/network-status.js
const dns = require('dns');
const mongoose = require('mongoose');
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

const checkNetworkStatus = async () => {
  try {
    dns.lookup('google.com', async (err) => {
      if (err && err.code === "ENOTFOUND") {
        console.log('Network is offline, attempting to connect to local MongoDB...');
        global.isOnline = false;
        const connected = await connectToDatabase(mongodUrl);
        if (connected) {
          console.log('Connected to local MongoDB');
        } else {WebGLContextEvent
          console.log('Failed to connect to local MongoDB');
        }
      } else {
        if (!global.isOnline) { // Only sync if previously offline
          console.log('Network is online, attempting to connect to Atlas...');
          const connected = await connectToDatabase(atlasUrl);
          if (connected) {
            global.isOnline = true;
            await syncOfflineOperations();
          } else {
            console.log('Failed to connect to Atlas, staying with local MongoDB');
            await connectToDatabase(mongodUrl); // Ensure local connection
          }
        } else {
          console.log('Network is online, already connected to Atlas');
        }
      }
    });
  } catch (error) {
    console.error('Error checking network status:', error);
  }
};

// Check network status every 10 seconds
setInterval(checkNetworkStatus, 10000);

module.exports = checkNetworkStatus;
