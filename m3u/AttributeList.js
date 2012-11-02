var AttributeList = module.exports = function AttributeList(attributes) {
  this.attributes = {};
  this.mergeAttributes(attributes);
};

var dataTypes = AttributeList.dataTypes = {
  'audio'      : 'quoted-string',
  'autoselect' : 'boolean',
  'bandwidth'  : 'decimal-integer',
  'byterange'  : 'enumerated-string',
  'codecs'     : 'quoted-string',
  'default'    : 'boolean',
  'duration'   : 'decimal-floating-point',
  'forced'     : 'boolean',
  'group-id'   : 'quoted-string',
  'language'   : 'quoted-string',
  'name'       : 'quoted-string',
  'program-id' : 'decimal-integer',
  'resolution' : 'decimal-resolution',
  'subtitles'  : 'quoted-string',
  'title'      : 'enumerated-string',
  'type'       : 'enumerated-string',
  'uri'        : 'quoted-string',
  'video'      : 'quoted-string'
};

AttributeList.prototype.mergeAttributes = function mergeAttributes(attributes) {
  var self = this;
  if (Array.isArray(attributes)) {
    attributes.forEach(function(attribute) {
      self.set(attribute.key, attribute.value);
    });
  }
};

AttributeList.prototype.get = function getValue(key) {
  return this.attributes[key];
};

AttributeList.prototype.set = function setValue(key, value) {
  key = key.toLowerCase();
  this.attributes[key] = parse[dataTypes[key] || 'unknown'](value, key);

  return this;
};

AttributeList.prototype.getCoerced = function getCoerced(key) {
  return coerce[dataTypes[key] || 'unknown'](this.get(key));
};

AttributeList.prototype.toString = function toString() {
  var self = this;
  return Object.keys(this.attributes).map(function(key) {
    return [key.toUpperCase(), self.getCoerced(key)].join('=');
  }).join(',');
};

AttributeList.prototype.serialize = function serialize() {
  return this.attributes;
};

AttributeList.unserialize = function unserialize(object) {
  var list = new AttributeList;
  list.attributes = object;
  return list;
};

var coerce = {
  'boolean': function coerceBoolean(value) {
    return value ? 'YES' : 'NO';
  },
  'decimal-floating-point': parseFloat,
  'decimal-integer': function coerceDecimalInteger(value) {
    return parseInt(value, 10);
  },
  'decimal-resolution': function coerceDecimalResolution(value) {
    if (Array.isArray(value)) {
      return value.join('x');
    } else {
      return value;
    }
  },
  'enumerated-string': function coerceEnumeratedString(value) {
    return value;
  },
  'quoted-string': function coerceQuotedString(value) {
    return '"' + value.replace(/"/g, '\\"') + '"';
  },
  'unknown': function coerceUnknown(value) {
    return value;
  }
};

var parse = {
  'boolean': function parseBoolean(value) {
    return typeof value == 'boolean'
      ? value
      : (value == 'YES' ? true : false);
  },
  'decimal-floating-point': parseFloat,
  'decimal-integer': function parseDecimalInteger(value) {
    return parseInt(value, 10);
  },
  'decimal-resolution': function coerceDecimalResolution(value) {
    return value.split('x').map(parse['decimal-integer']);
  },
  'enumerated-string': function parseEnumeratedString(value) {
    return value;
  },
  'quoted-string': function parseQuotedString(value) {
    if (Array.isArray(value)) {
      return value.join(',');
    } else if (value.indexOf('"') === 0 &&
               value.lastIndexOf('"') == value.length - 1) {
      return value.slice(1,-1);
    } else {
      return value;
    }
  },
  'unknown': function parseUnknown(value, key) {
    console.error('Handling value:', value, ' for unknown key:', key);
    return value;
  }
};