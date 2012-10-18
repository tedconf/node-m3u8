var util       = require('util'),
    StreamItem = require('./StreamItem');

var IframeStreamItem = module.exports = function IframeStreamItem(attributes) {
  StreamItem.apply(this, arguments);

  delete this.properties['uri'];
};

util.inherits(IframeStreamItem, StreamItem);

IframeStreamItem.create = function createIframeStreamItem(data) {
  var item =  new IframeStreamItem();
  item.setData(data);
  return item;
};

IframeStreamItem.prototype.toString = function toString() {
  return '#EXT-X-I-FRAME-STREAM-INF:' + this.attributes.toString();
};