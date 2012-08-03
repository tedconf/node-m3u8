var util       = require('util'),
    StreamItem = require('./StreamItem');

var IframeStreamItem = module.exports = function IframeStreamItem() {
  StreamItem.call(this);
};

util.inherits(IframeStreamItem, StreamItem);

IframeStreamItem.prototype.toString = function toString() {
  return '#EXT-X-I-FRAME-STREAM-INF:' + this.attributesToString();
};