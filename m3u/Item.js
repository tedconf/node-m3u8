var Item = module.exports = function Item() {

};

Item.prototype.uri = Item.prototype.URI = function setUri(uri) {
  this.attributes.uri = uri;
};