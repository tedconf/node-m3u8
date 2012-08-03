var util       = require('util'),
    StreamItem = require('./StreamItem');

var IframeStreamItem = module.exports = function IframeStreamItem() {
  StreamItem.call(this);
};

util.inherits(IframeStreamItem, StreamItem);