var AttributeList = require('../m3u/AttributeList'),
    should        = require('should');

describe('AttributeList', function() {
  describe('#mergeAttributes', function() {
    it('should merge in attributes', function() {
      var list = new AttributeList;
      list.set('bandwidth', 1);
      list.mergeAttributes([{ key: 'forced', value: true }]);

      list.get('bandwidth').should.eql(1);
      list.get('forced').should.be.true;
    });
  });
  describe('#set', function() {
    it('should set coerce and set attributes', function() {
      var list = new AttributeList;
      list.set('bandwidth', '1');

      list.attributes.bandwidth.should.equal(1);
    });
  });
  describe('#get', function() {
    it('should get attribute', function() {
      var list = new AttributeList;
      list.attributes.bandwidth = 1;

      list.get('bandwidth').should.eql(1);
    });
  });
  describe('#getCoerced', function() {
    it('should get attribute value ready to be written out', function() {
      var list = new AttributeList;
      list.attributes.audio = 'hello';

      list.getCoerced('audio').should.eql('"hello"');
    });
  });
});
