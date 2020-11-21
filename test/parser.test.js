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

  describe('#EXT-X-CUE-OUT', function() {
    it('should indicate cue out with a duration', function() {
      var parser = getParser();

      parser['EXT-X-CUE-OUT']('DURATION=30');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cueout').should.eql(30);
      parser.EXTINF('3.0,another title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      should.not.exist(parser.currentItem.get('cueout'));
    });

    it('should indicate cue out with duration 0 ', function() {
      var parser = getParser();

      parser['EXT-X-CUE-OUT']('');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cueout').should.eql(0);
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      should.not.exist(parser.currentItem.get('cueout'));
    });

    it('should indicate cue out duration without duration attr', function() {
      var parser = getParser();
      parser['EXT-X-CUE-OUT']('30');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cueout').should.eql(30);
    });
  });

  describe('#EXT-X-CUE-OUT-CONT', function() {
    it('should indicate cue out cont with progress if present', function() {
      var parser = getParser();

      parser['EXT-X-CUE-OUT']('30');
      parser.EXTINF('10,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cueout').should.eql(30);
      parser['EXT-X-CUE-OUT-CONT']('10/30');
      parser.EXTINF('10,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cont-offset').should.eql(10);
      parser.currentItem.get('cont-dur').should.eql(30);
      parser['EXT-X-CUE-OUT-CONT']('14.5/30');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cont-offset').should.eql(14.5);
      parser.currentItem.get('cont-dur').should.eql(30);
    });
  });

  describe('#EXT-X-CUE-IN', function() {
    it('should indicate cue in is true if present', function() {
      var parser = getParser();
    
      parser.EXTINF('4.5,some title');
      parser['EXT-X-CUE-IN']();
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('cuein').should.eql(true);
      parser.EXTINF('3.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      should.not.exist(parser.currentItem.get('cuein'));
    });

  });

  describe('#EXT-X-DATERANGE', function() {
    it('should handle a set of attributes / value pairs for a range of time', function() {
      var parser = getParser();

      parser['EXT-X-DATERANGE']('START-DATE="2020-11-21T10:00:00.000Z",X-CUSTOM="MY CUSTOM TAG"');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('daterange')['START-DATE'].should.eql('2020-11-21T10:00:00.000Z');
      parser.currentItem.toString().should.eql('#EXT-X-DATERANGE:START-DATE="2020-11-21T10:00:00.000Z",X-CUSTOM="MY CUSTOM TAG"\n#EXTINF:4.5000,some title\n');
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

  describe('#EXT-X-ASSET', function() {
    it('should return asset metadata', function() {
      var parser = getParser();

      parser['EXT-X-CUE-OUT']('30');
      parser['EXT-X-ASSET']('CAID=0x0000000020FB6501');
      parser.EXTINF('4.5,some title');
      parser.currentItem.constructor.name.should.eql('PlaylistItem');
      parser.currentItem.get('assetdata').should.eql('CAID=0x0000000020FB6501');
    });
  });
});

function getParser() {
  var parser = m3u8.createStream();

  return parser;
}
