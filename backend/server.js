require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');

const indexRoute = require('./routes/index');
const startChangeStream = require('./helper/CS-config')

const app = express();

mongoose.connect(process.env.AtlastURL)
  .then(() => {
    console.log('Connected to Atlas');
    startChangeStream();
  })
  .catch((error) => {
    console.error('Error connecting to Atlas:', error);
  });

app.use(express.json());
app.use('/', indexRoute);

app.listen(3000, () => {
  console.log('Listening on port 3000');
});

