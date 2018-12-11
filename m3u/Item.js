var AttributeList    = require('./AttributeList');

var Item = module.exports = function Item(attributes) {
  this.attributes = new AttributeList(attributes);
  this.properties = {
    byteRange     : null,
    daiPlacementOpportunity: null,
    date          : null,
    discontinuity : null,
    duration      : null,
    title         : null,
    uri           : null
  };
};

Item.prototype.get = function get(key) {
  if (this.propertiesHasKey(key)) {
    return this.properties[key];
  } else {
    return this.attributes.get(key);
  }
};

Item.prototype.set = function set(key, value) {
  if (this.propertiesHasKey(key)) {
    this.properties[key] = value;
  } else {
    this.attributes.set(key, value);
  }

  return this;
};

Item.prototype.serialize = function serialize() {
  return {
    attributes  : this.attributes.serialize(),
    properties  : this.properties
  }
};

Item.unserialize = function unserialize(constructor, object) {
  var item = new constructor;
  item.attributes = AttributeList.unserialize(object.attributes);
  item.properties = object.properties;
  return item;
};

Item.prototype.setData = function setData(data) {
  var self = this;
  Object.keys(data).forEach(function(key) {
    self.set(key, data[key]);
  });
};

Item.prototype.propertiesHasKey = function hasKey(key) {
  return Object.keys(this.properties).indexOf(key) > -1;
};
