var util = require('util'),
    ChunkedStream = require('chunked-stream'),
    M3U = require('./m3u'),
    PlaylistItem = require('./m3u/PlaylistItem'),
    StreamItem = require('./m3u/StreamItem'),
    IframeStreamItem = require('./m3u/IframeStreamItem'),
    MediaItem = require('./m3u/MediaItem');

// used for splitting strings by commas not within double quotes
var NON_QUOTED_COMMA = /,(?=(?:[^"]|"[^"]*")*$)/;

var m3uParser = module.exports = function m3uParser() {
  ChunkedStream.apply(this, ['\n', true]);

  this.linesRead = 0;
  this.m3u = new M3U;

  this.on('data', this.parse.bind(this));
  var self = this;
  this.on('end', function() {
    self.emit('m3u', self.m3u);
  });
};

util.inherits(m3uParser, ChunkedStream);

m3uParser.M3U = M3U;

m3uParser.createStream = function() {
  return new m3uParser;
};

m3uParser.prototype.parse = function parse(line) {
  line = line.trim();
  if (this.linesRead == 0) {
    if (line != '#EXTM3U') {
      return this.emit('error', new Error(
        'Non-valid M3U file. First line: ' + line
      ));
    }
    this.linesRead++;
    return true;
  }
  if (['', '#EXT-X-ENDLIST'].indexOf(line) > -1) return true;
  if (line.indexOf('#') == 0) {
    this.parseLine(line);
  } else {
    if (this.currentItem.attributes.uri != undefined) {
      this.addItem(new PlaylistItem);
    }
    this.currentItem.set('uri', line);
    this.emit('item', this.currentItem);
  }
  this.linesRead++;
};

m3uParser.prototype.parseLine = function parseLine(line) {
  var parts = line.slice(1).split(/:(.*)/);
  var tag   = parts[0];
  var data  = parts[1];
  if (typeof this[tag] == 'function') {
    this[tag](data, tag);
  } else {
    this.m3u.set(tag, data);
  }
};

m3uParser.prototype.addItem = function addItem(item) {
  this.m3u.addItem(item);
  this.currentItem = item;
  return item;
};

m3uParser.prototype['EXTINF'] = function parseInf(data) {
  this.addItem(new PlaylistItem);

  data = data.split(',');
  this.currentItem.set('duration', parseFloat(data[0]));
  this.currentItem.set('title', data[1]);
  if (this.playlistDiscontinuity) {
    this.currentItem.set('discontinuity', true);
    this.playlistDiscontinuity = false;
  }
};

m3uParser.prototype['EXT-X-DISCONTINUITY'] = function parseInf() {
  this.playlistDiscontinuity = true;
}

m3uParser.prototype['EXT-X-BYTERANGE'] = function parseByteRange(data) {
  this.currentItem.set('byteRange', data);
};

m3uParser.prototype['EXT-X-STREAM-INF'] = function(data) {
  this.addItem(new StreamItem(this.parseAttributes(data)));
};

m3uParser.prototype['EXT-X-I-FRAME-STREAM-INF'] = function(data) {
  this.addItem(new IframeStreamItem(this.parseAttributes(data)));
  this.emit('item', this.currentItem);
};

m3uParser.prototype['EXT-X-MEDIA'] = function(data) {
  this.addItem(new MediaItem(this.parseAttributes(data)));
  this.emit('item', this.currentItem);
};

m3uParser.prototype.parseAttributes = function parseAttributes(data) {
  data = data.split(NON_QUOTED_COMMA);
  var self = this;
  return data.map(function(attribute) {
    var keyValue = attribute.split(/=(.+)/).map(function(str) {
      return str.trim();
    });
    return {
      key   : keyValue[0],
      value : keyValue[1]
    };
  });
};
