const mongoose = require('mongoose')

const user = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        unique: true
    },
    timestamp: { type: Date, default: Date.now },
})

const userModel = mongoose.model('User', user)
module.exports = userModel