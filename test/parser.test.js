var m3u8   = require('../parser'),
    sinon  = require('sinon'),
    should = require('should');

describe('parser', function() {
  it('should error if not valid M3U first line', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.include('Non-valid M3U file. First line: ');
      done();
    });
    parser.write('NOT VALID\n');
  });

  describe('#parseLine', function() {
    it('should call known tags', function() {
      var parser = getParser();
      var mock   = sinon.mock(parser);
      mock.expects('EXT-X-MEDIA').once().returns(45);

      parser.parseLine('#EXT-X-MEDIA:GROUP-ID="600k", LANGUAGE="eng"');
      mock.verify();
    });

    it('should set data on m3u on unknown tags', function() {
      var parser = getParser();

      parser.parseLine('#THIS-IS-A-TAG:some value');
      parser.m3u.get('THIS-IS-A-TAG').should.eql('some value');
    });
  });

  describe('#addItem', function() {
    it('should make currentItem the added item', function() {
      var parser = getParser();

      var item = new m3u8.M3U.PlaylistItem;
      parser.addItem(item);
      parser.currentItem.should.eql(item);
    });
  });

  describe('#EXTINF', function() {
    it('should create a new Playlist item', function() {
      var parser = getParser();

      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('duration').should.eql(4.5);
      parser.currentItem.get('title').should.eql('some title');
    });
  });

  describe('#EXT-X-BYTERANGE', function() {
    it('should set byteRange on currentItem', function() {
      var parser = getParser();

      parser.EXTINF('4.5,');
      parser['EXT-X-BYTERANGE']('45@90');
      parser.currentItem.get('byteRange').should.eql('45@90');
    });
  });

  describe('#EXT-X-STREAM-INF', function() {
    it('should create a new Stream item', function() {
      var parser = getParser();

      parser['EXT-X-STREAM-INF']('NAME="I am a stream!"');
      parser.currentItem.constructor.name.should.eql('StreamItem');
      parser.currentItem.get('name').should.eql('I am a stream!');
    });
  });

  describe('#EXT-X-I-FRAME-STREAM-INF', function() {
    it('should create a new Iframe Stream item', function() {
      var parser = getParser();

      parser['EXT-X-I-FRAME-STREAM-INF']('NAME="I am an iframe stream!"');
      parser.currentItem.constructor.name.should.eql('IframeStreamItem');
      parser.currentItem.get('name').should.eql('I am an iframe stream!');
    });
  });

  describe('#EXT-X-MEDIA-INF', function() {
    it('should create a new Media item', function() {
      var parser = getParser();

      parser['EXT-X-MEDIA']('NAME="I am a media item!"');
      parser.currentItem.constructor.name.should.eql('MediaItem');
      parser.currentItem.get('name').should.eql('I am a media item!');
    });
  });

  describe('#parseAttributes', function() {
    it('should return an array of key-values', function() {
      var parser = getParser();

      var keyValues = parser.parseAttributes(
        'KEY="I, am a value",RESOLUTION=640x360,FORCED=NO'
      );
      keyValues[0].key.should.eql('KEY');
      keyValues[0].value.should.eql('"I, am a value"');
      keyValues[2].value.should.eql('NO');
    });
  });
});

function getParser() {
  var parser = m3u8.createStream();

  return parser;
}
