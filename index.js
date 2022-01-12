'use strict';

const download = require('./src/download');
const torrentParser = require('./src/torrent_parser');

const torrent = torrentParser.open(process.argv[2]);

download(torrent, torrent.info.name);
