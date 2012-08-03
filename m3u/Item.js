var Item = module.exports = function Item() {
  this.attributes = {
    uri: null
  };
};

Item.prototype.mergeAttributes = function mergeAttributes(attributes) {
  for (var key in attributes) {
    this.attributes[key] = attributes[key];
  }
};

Item.prototype.uri = Item.prototype.URI = function setUri(uri) {
  this.attributes.uri = uri;
};