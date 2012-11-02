var AttributeList = require('../m3u/AttributeList'),
    Item   = require('../m3u/Item'),
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

  describe('#serialize', function() {
    it('should return an object containing properties and attributes', function() {
      var item = new Item;
      item.setData({
          autoselect: true,
          uri: '/path'
      });
      var data = item.serialize();
      data.attributes.should.eql(item.attributes.serialize());
      data.properties.should.eql(item.properties);
    });
  });

  describe('unserialize', function() {
    it('should return an Item object with attributes and properties', function() {
      var list = new AttributeList;
      list.set('autoselect', true);
      var data = {
        attributes: list.serialize(),
        properties: { url: '/path' }
      };
      var item = Item.unserialize(Item, data);
      item.attributes.should.eql(list);
      item.properties.should.eql(data.properties);
      item.should.be.instanceof(Item);
    });
  });
});
