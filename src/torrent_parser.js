// Code for opening a torrent file
'use strict';

const fs = require('fs');
const bencode = require('bencode');
const crypto = require('crypto');
const bignum = require('bignum');

module.exports.BLOCK_LEN = Math.pow(2,14);

// open the torrent file using readFileSync and decode the obtained buffer
function open(filepath) {
  return bencode.decode(fs.readFileSync(filepath));
};

// Paring the info proferty from torrent file => SHA1 => we get infoHash
function infoHash(torrent) {
  const info = bencode.encode(torrent.info);
  return crypto.createHash('sha1').update(info).digest();
}

// if torrent only has one file then torrent.info.length is its size
// else if multiple files sum the length of individual files
function size(torrent){
  const size = torrent.info.files ? torrent.info.files.map(file => file.length).reduce((a,b) => a+b) : torrent.info.length;
  return bignum.toBuffer(size, {size: 8});
}

module.exports.open = open;
module.exports.infoHash = infoHash;
module.exports.size =  size;
