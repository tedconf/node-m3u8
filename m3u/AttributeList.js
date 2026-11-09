var AttributeList = module.exports = function AttributeList(attributes) {
  this.attributes = {};
  this.mergeAttributes(attributes);
};

var dataTypes = AttributeList.dataTypes = {
  'allowed-cpc'        : 'quoted-string',
  'assoc-language'     : 'quoted-string',
  'audio'              : 'quoted-string',
  'autoselect'         : 'boolean',
  'average-bandwidth'  : 'decimal-integer',
  'bandwidth'          : 'decimal-integer',
  'byterange'          : 'quoted-string',
  'channels'           : 'quoted-string',
  'characteristics'    : 'quoted-string',
  'codecs'             : 'quoted-string',
  'default'            : 'boolean',
  'duration'           : 'decimal-floating-point',
  'forced'             : 'boolean',
  'frame-rate'         : 'decimal-floating-point',
  'group-id'           : 'quoted-string',
  'hdcp-level'         : 'enumerated-string',
  'instream-id'        : 'quoted-string',
  'method'            : 'enumerated-string',
  'iv'                : 'enumerated-string',
  'keyformat'         : 'quoted-string',
  'keyformatversions' : 'quoted-string',
  'language'           : 'quoted-string',
  'name'               : 'quoted-string',
  'pathway-id'         : 'quoted-string',
  'program-id'         : 'decimal-integer',
  'resolution'         : 'decimal-resolution',
  'score'              : 'decimal-floating-point',
  'stable-rendition-id': 'quoted-string',
  'stable-variant-id'  : 'quoted-string',
  'subtitles'          : 'quoted-string',
  'supplemental-codecs': 'quoted-string',
  'title'              : 'enumerated-string',
  'type'               : 'enumerated-string',
  'uri'                : 'quoted-string',
  'video'              : 'quoted-string',
  'video-range'        : 'enumerated-string'
};

function typeOf(key) {
  return Object.prototype.hasOwnProperty.call(dataTypes, key) ? dataTypes[key] : 'unknown';
}

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
  this.attributes[key] = value == null
    ? null
    : parse[typeOf(key)](value, key);

  return this;
};

AttributeList.prototype.getCoerced = function getCoerced(key) {
  return coerce[typeOf(key)](this.get(key));
};

AttributeList.prototype.toString = function toString() {
  var self = this;
  return Object.keys(this.attributes).map(function(key) {
    if (self.get(key) == null) {
      return key.toUpperCase();
    }
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

var NON_QUOTED_COMMA = /,(?=(?:[^"]|"[^"]*")*$)/;

AttributeList.parse = function parseAttributes(data) {
  if (typeof data != 'string') {
    return [];
  }
  data = data.split(NON_QUOTED_COMMA);
  return data.map(function(attribute) {
    var keyValue = attribute.split(/=(.+)/).map(function(str) {
      return str.trim();
    });
    return {
      key   : keyValue[0],
      value : keyValue[1]
    };
  });
};
