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

// Feed
const hub = 'http://pubsubhubbub.appspot.com/';
const topic = 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=';
const all_subbed = [];

function subscribe(id)
{
    if (!all_subbed.includes(id)) {
        subscriber.subscribe(topic + id, hub, (err) => {
            if (err) {
                console.log(err);
            }
        });
        all_subbed.push(id);
    }
}

const subscriber = feed.createServer({
    callbackUrl: 'http://test.cubewithme.com:22765'
});
subscriber.on('listen', () => {

    Guild.find().then(guilds => {
        guilds.forEach(guild => {
            guild.subscribed.forEach(channel_id => {
                subscribe(channel_id);
            })
        });
    });
});
subscriber.on('subscribe', data => {
    console.log('Subscribed: ' + data.topic);
});
subscriber.on('feed', data => {
    console.log('We got something!');
    const [link, channel_id] = getVideoLink(data.feed);

    if (!link)
        return;

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

// Start Discord
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

                        // Subscribe
                        subscribe(id);
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
    console.log(data.toString());
    const video = xml.parse(data.toString());
    console.log(video);

    // Ignore deleted videos
    if (video.feed['at:deleted-entry']) {
        return [];
    }

    return [
        'https://youtube.com/watch?v=' + video.feed.entry['yt:videoId'],
        video.feed.entry['yt:channelId']
    ];
}

// Listen to feed
subscriber.listen(22765);

// const test_link = getVideoLink(fs.readFileSync(path.join(__dirname, 'test.xml')));
// console.log(test_link);