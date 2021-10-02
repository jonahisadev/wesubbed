const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const feed = require('pubsubhubbub');
const xml = require('fast-xml-parser');
const Guild = require('./guild.db');
const youtube = require('./youtube');

// Config
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

// Start
client.once('ready', () => {
    console.log("Here we go!");
});

// Join Server
client.on('guildCreate', (guild) => {
    const g = new Guild({
        server: guild.id.toString(),
        channel_out: '',
        subscribed: []
    });
    g.save({}).then(_ => {
        console.log("Saved new server to database");
    });
});

// Handle commands
client.on('message', async (message) => {
    if (message.toString().startsWith(config['prefix'])) {
        const args = message.toString().split(' ');

        switch (args[1]) {
            case 'output': {

                message.guild.channels.fetch(args[2].substr(2, args[2].length - 3)).then(found => {
                    if (!found) {
                        console.log('Could not find text channel with name ' + args[2]);
                        return;
                    }

                    Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                        doc.channel_out = found.id.toString();
                        doc.save({}).then(_ => {
                            console.log('Set output channel to ' + found.id.toString());
                        });
                    });
                });

                break;
            }

            case 'subscribe': {
                const url = args[2];
                youtube.getChannelID(url).then(id => {
                    Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                        doc.subscribed.push(id);
                        doc.save({}).then(_ => {
                            console.log("Saved document");
                        });
                    });
                });
                break;
            }

            case 'ping': {
                // Testing only
                if (process.env.MODE === 'production')
                    break;

                Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                    message.guild.channels.fetch(doc.channel_out).then(channel => {
                        channel.send("pong!");
                    });
                });

                break;
            }
        }
    }
});

// Login
client.login(config['token']);

function getVideoLink(data)
{
    const video = xml.parse(data.toString());
    return [
        'https://youtube.com/watch?v=' + video.feed.entry['yt:videoId'],
        video.feed.entry['yt:channelId']
    ];
}

// Feed
const subscriber = feed.createServer({
    callbackUrl: 'http://18.221.66.24:22765'
});
subscriber.on('listen', () => {
    const hub = 'http://pubsubhubbub.appspot.com/';
    const topic = 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=';

    Guild.find().then(guilds => {
        guilds.forEach(guild => {
            guild.subscribed.forEach(channel_id => {
                subscriber.subscribe(topic + channel_id, hub, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            })
        });
    });
});
subscriber.on('subscribe', (data) => {
    console.log('Subscribed to ' + data.topic);
});
subscriber.on('feed', data => {
    const [link, channel_id] = getVideoLink(data.feed);

    // const [link, channel_id] = getVideoLink(fs.readFileSync(path.join(__dirname, 'test.xml')));

    Guild.find({ subscribed: channel_id }).then(guilds => {
        guilds.forEach(guild_obj => {
            client.guilds.fetch(guild_obj.server).then(guild => {
                guild.channels.fetch(guild_obj.channel_out).then(channel => {
                    channel.send("New Video: " + link);
                });
            });
        });
    });
});
subscriber.listen(22765);

// const test_link = getVideoLink(fs.readFileSync(path.join(__dirname, 'test.xml')));
// console.log(test_link);