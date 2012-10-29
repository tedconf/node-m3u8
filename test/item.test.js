var Item    = require('../m3u/Item'),
    sinon  = require('sinon'),
    should = require('should');

describe('Item', function() {
  describe('#set', function() {
    it('should set property on item if a property', function() {
      var item = new Item;

      item.set('title', 'hello there');
      item.properties.title.should.eql('hello there');
    });
    it('should set an attribute if not a property', function() {
      var item = new Item;

      item.set('autoselect', true);
      item.attributes.get('autoselect').should.be.true;
    });
  });
  describe('#get', function() {
    it('should get property from item if a property', function() {
      var item = new Item;

      item.properties.uri = '/path';
      item.get('uri').should.eql('/path');
    });
    it('should get property from AttributeList if not a property', function() {
      var item = new Item;

      item.attributes.set('autoselect', true);
      item.get('autoselect').should.be.true;
    });
  });
  describe('#setData', function() {
    it('should set multiple properties/attributes', function() {
      var item = new Item;
      item.setData({ autoselect: true, uri: '/path' });

      item.get('autoselect').should.be.true;
      item.get('uri').should.eql('/path');
    });
  });
});
