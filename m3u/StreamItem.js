var util = require('util'),
    Item = require('./Item'),
    AttributeList = require('./AttributeList');

var StreamItem = module.exports = function StreamItem(attributes) {
  Item.apply(this, arguments);
};

util.inherits(StreamItem, Item);

StreamItem.create = function createStreamItem(data) {
  var item = new StreamItem();
  item.setData(data);
  return item;
};

StreamItem.prototype.toString = function toString() {
  var output = [];
  output.push('#EXT-X-STREAM-INF:' + this.attributes.toString());
  output.push(this.get('uri'));

  return output.join('\n');
};