// this file handles the tracker which  is used to manage users participating in a torrent (know as peers).
// It stored statistics about the torrent, but its main role is allow peers to ‘find each other’
// and start communication, i.e. to find peers with the data they require.

'use strict';

const dgram = require('dgram');
const Buffer = require('buffer').Buffer;

const urlParse = require('url').parse;
const crypto = require('crypto');
const torrentParser = require('./torrent_parser');
const util = require('./util');

module.exports.getPeers = (torrent, callback) =>  {
  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  // send the request
  udpSend(socket, buildConnReq(), url);

  socket.on('message', response => {
    if(respType(response) == 'connect'){
      const connResp = parseConnResp(response);
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      udpSend(socket, announceReq, url);
    } else if (respType(response) == 'announce'){
      const announceResp = parseAnnounceResp(response);
      callback(announceResp.peers);
    }
  });
}

function respType(response) {
  const action = response.readUInt32BE(0);
  if(action == 0) {
    return 'connect';
  } else if (action == 1) {
    return 'announce';
  }
}

function udpSend(socket, message, rawUrl, callback){
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.hostname, () => {});
}

// We use the method writeUInt32BE which writes an unsigned 32-bit integer in big-endian format
function buildConnReq() {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  buf.writeUInt16BE(0, 8);
  crypto.randomBytes(4).copy(buf, 12);
  return buf;
}

function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8)
  }
}

function buildAnnounceReq(connId, torrent, port=6881) {
  const buf = Buffer.allocUnsafe(98);

  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  torrentParser.infoHash(torrent).copy(buf, 16);
  // peerId
  util.genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  torrentParser.size(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);

  return buf;
}

function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

function parseAnnounceResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}
