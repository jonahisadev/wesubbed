const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/ytsub', {useNewUrlParser: true, useUnifiedTopology: true});

var guildSchema = mongoose.Schema({
    server: String,
    channel_out: String,
    subscribed: [String]
});

module.exports = mongoose.model('Guild', guildSchema);