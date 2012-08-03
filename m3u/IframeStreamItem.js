var StreamItem = require('./StreamItem');

var IframeStreamItem = module.exports = function IframeStreamItem() {
  StreamItem.apply(this);
};

IframeStreamItem.prototype = Object.create(
  StreamItem.prototype,
  { constructor: { value: IframeStreamItem } }
);