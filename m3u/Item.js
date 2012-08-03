var inflect = require('inflect');

var Item = module.exports = function Item() {
  this.attributes = {
    uri: null
  };
};

var attributeData = {
  byteLength: 'decimal-integer',
  byteOffset: 'decimal-integer',
  bandwidth: 'decimal-integer',
  programId: 'decimal-integer',
  duration: 'decimal-floating-point',
  uri: 'quoted-string',
  groupId: 'quoted-string',
  language: 'quoted-string',
  name: 'quoted-string',
  codecs: 'quoted-string',
  audio: 'quoted-string',
  video: 'quoted-string',
  type: 'enumerated-string',
  default: 'boolean',
  autoselect: 'boolean',
  forced: 'boolean',
  resolution: 'decimal-resolution'
};

Item.prototype.mergeAttributes = function mergeAttributes(attributes) {
  for (var key in attributes) {
    this.attributes[key] = attributes[key];
  }
};

Item.prototype.uri = Item.prototype.URI = function setUri(uri) {
  this.attributes.uri = uri;
};

Item.prototype.attributesToString = function attributesToString() {
  var keyValues = [];
  var self = this;
  Object.keys(this.attributes).forEach(function(key) {
    var value = coerce[attributeData[key]](self.attributes[key]);
    key = inflect.dasherize(inflect.underscore(key)).toUpperCase();
    keyValues.push(key + '=' + value);
  });

  return keyValues.join(',');
};

var coerce = {
  'decimal-integer': function coerceDecimalInteger(value) {
    return parseInt(value, 10);
  },
  'decimal-floating-point': parseFloat,
  'quoted-string': function coerceQuotedString(value) {
    return '"' + value.replace(/"/g, '\\"') + '"';
  },
  'enumerated-string': function coerceEnumeratedString(value) {
    return value;
  },
  'boolean': function coerceBoolean(value) {
    return value ? 'YES' : 'NO';
  },
  'decimal-resolution': function coerceDecimalResolution(value) {
    if (Array.isArray(value)) {
      return value.join('x');
    } else {
      return value;
    }
  }
};