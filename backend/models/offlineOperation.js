const mongoose = require('mongoose');

const offlineOperationSchema = new mongoose.Schema({
  operationType: { type: String, required: true },
  collectionName: { type: String, required: true },
  document: { type: Object, required: true },
  timestamp: { type: Date, default: Date.now },
  synced: { type: Boolean, default: false }
});

const OfflineOperation = mongoose.model('OfflineOperation', offlineOperationSchema);
module.exports = OfflineOperation;
