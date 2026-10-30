var m3u8   = require('../parser'),
    sinon  = require('sinon'),
    should = require('should');

describe('parser', function() {
  it('should error if not valid M3U first line', function(done) {
    var parser = getParser();

    parser.on('error', function(error) {
      error.message.should.containEql('Non-valid M3U file. First line: ');
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

    it('should split on first colon only', function() {
      var parser = getParser();

      parser.parseLine('#THIS-IS-A-TAG:http://www.ted.com');
      parser.m3u.get('THIS-IS-A-TAG').should.eql('http://www.ted.com');
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

  describe('#EXT-X-DISCONTINUITY', function() {
    it('should indicate discontinuation on subsequent playlist item', function() {
      var parser = getParser();

      parser['EXT-X-DISCONTINUITY']();
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('duration').should.eql(4.5);
      parser.currentItem.get('title').should.eql('some title');
      parser.currentItem.get('discontinuity').should.eql(true);
    });
  });

  describe('#EXT-X-MAP', function() {
    it('should set map on following playlist items', function() {
      var parser = getParser();

      parser['EXT-X-MAP']('URI="init.mp4",BYTERANGE="720@0"');
      parser.EXTINF('4.5,');
      parser.currentItem.get('map').should.eql('init.mp4');
      parser.currentItem.get('mapByteRange').should.eql('720@0');
      parser.EXTINF('4.5,');
      parser.currentItem.get('map').should.eql('init.mp4');
      should.not.exist(parser.m3u.get('EXT-X-MAP'));
    });
  });

  describe('#EXT-X-PROGRAM-DATE-TIME', function() {
    it('should set date on the following playlist item only', function() {
      var parser = getParser();
      var programDateTime = '2017-03-23T19:26:41.000+0000';

      parser['EXT-X-PROGRAM-DATE-TIME'](programDateTime);
      parser.EXTINF('4.5,');
      parser.currentItem.get('date').should.eql(programDateTime);
      parser.EXTINF('4.5,');
      should.not.exist(parser.currentItem.get('date'));
      should.not.exist(parser.m3u.get('EXT-X-PROGRAM-DATE-TIME'));
    });
  });

  describe('#EXT-X-DISCONTINUITY-SEQUENCE', function() {
    it('should set discontinuitySequence as an integer', function() {
      var parser = getParser();

      parser.parseLine('#EXT-X-DISCONTINUITY-SEQUENCE:3');
      parser.m3u.get('discontinuitySequence').should.eql(3);
      parser.m3u.toString().should.containEql('#EXT-X-DISCONTINUITY-SEQUENCE:3\n');
    });
  });

  describe('streaming', function() {
    it('should handle lines and multi-byte characters split across chunks', function(done) {
      var parser = getParser();
      var body = Buffer.from('#EXTM3U\n#EXTINF:10,caf\u00e9\nseg.ts');

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem[0].get('title').should.eql('caf\u00e9');
        m3u.items.PlaylistItem[0].get('uri').should.eql('seg.ts');
        done();
      });
      for (var i = 0; i < body.length; i += 5) {
        parser.write(body.subarray(i, i + 5));
      }
      parser.end();
    });

    it('should accept CRLF line endings', function(done) {
      var parser = getParser();

      parser.on('m3u', function(m3u) {
        m3u.items.PlaylistItem[0].get('uri').should.eql('seg.ts');
        done();
      });
      parser.end('#EXTM3U\r\n#EXTINF:10,\r\nseg.ts\r\n');
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
