describe('parsing a partial stream', function() {
  it('should only emit items when line is done', function(done) {
    var parser = require('../parser').createStream();

    parser.on('item', function() {
      done(new Error('Emitted item without a complete item'));
    });
    parser.write('#EXTM3U\n');
    parser.write('#EXT-X-STREAM-INF:BANDWIDTH=69334, PROGRAM-ID=1, CODECS="avc1.42c00c", RESOLUTION=320x180, AUDIO="600k"\nhls_64k_');
    setTimeout(function() {
      parser.removeAllListeners('item');

      parser.on('item', function() {
        done();
      });
      parser.write('_video.m3u8\n');
    }, 5);
  });
});