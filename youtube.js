const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

const yt = google.youtube({
    version: 'v3',
    auth: config['yt_api']
});

async function getChannelID(url)
{
    return new Promise((res, rej) => {
        // Normal channel ID
        let match = url.match(/https:\/\/.*\.?youtube\.com\/channel\/(.*)/);
        if (match) {
            res(match[1]);
            return;
        } else if ((match = url.match(/https:\/\/.*\.?youtube\.com\/user\/(.*)/))) {
            yt.channels.list({ part: 'id', forUsername: match[1] }).then(result => {
                res(result.data.items[0].id);
                return;
            });
        } else {
            match = url.match(/https:\/\/.*\.?youtube\.com(\/.*)?\/(.*)/);
            if (!match) {
                rej("Invalid YouTube channel URL");
                return;
            }

            console.log(match[2]);

            return yt.search.list({ part: 'snippet', q: match[2], order: 'relevance', type: 'channel' }).then(result => {
                const ids = [];
                for (let c of result.data.items) {
                    ids.push(c.id.channelId);
                }

                return yt.channels.list({ part: 'snippet', id: ids.join(',') }).then(result => {
		    if (!result.data.items) {
			rej("Could not find channel");
		        return;
		    }

                    for (let c of result.data.items) {
                        if (c.snippet.customUrl === match[2].toLowerCase()) {
                            res(c.id);
                            return c.id;
                        }
                    }
                });

            });
        }
    });
}

async function getChannelNameFromID(id)
{
    return new Promise((res, rej) => {
        yt.channels.list({ id: id, part: 'snippet' }).then(result => {
            if (!result.data.items) {
                res(null);
                return;
            }

            res(result.data.items[0].snippet.title);
        });
    });
}

module.exports = {
    getChannelID,
    getChannelNameFromID
}
