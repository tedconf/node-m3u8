var AttributeList = require('../m3u/AttributeList'),
    should        = require('should');

describe('AttributeList', function() {
  describe('#mergeAttributes', function() {
    it('should merge in attributes', function() {
      var list = createAttributeList();
      list.mergeAttributes([{ key: 'forced', value: true }]);

      list.get('bandwidth').should.eql(1);
      list.get('forced').should.be.true;
    });
  });

  describe('#set', function() {
    it('should set coerce and set attributes', function() {
      var list = createAttributeList();

      list.attributes.bandwidth.should.equal(1);
    });
  });

  describe('#get', function() {
    it('should get attribute', function() {
      var list = createAttributeList();

      list.get('bandwidth').should.eql(1);
    });
  });

  describe('#getCoerced', function() {
    it('should get attribute value ready to be written out', function() {
      var list = createAttributeList();

      list.getCoerced('audio').should.eql('"hello"');
    });
  });

  describe('#serialize', function() {
    it('should return the attributs object', function() {
      var list = createAttributeList();
      list.serialize().should.eql(list.attributes);
    });
  });

  describe('unserialize', function() {
    it('should populate the attributes object', function() {
      var data = {
        bandwidth: 1,
        audio: 'hello'
      };
      var list = AttributeList.unserialize(data);
      data.should.eql(list.attributes);
      list.should.be.instanceof(AttributeList);
    });
  });
});

function createAttributeList() {
  var list = new AttributeList;
  list.set('bandwidth', 1);
  list.attributes.audio = 'hello';
  return list;
}