m3u8
====

node-m3u8 is a streaming m3u8 parser tailored for dealing with [Apple's HTTP
Live Streaming protocol](http://tools.ietf.org/html/draft-pantos-http-live-streaming).
It may work for other m3u files, but I have not tested it for those uses.

example
-------

``` js
var m3u8 = require('m3u8');
var fs   = require('fs');

var parser = m3u8.createStream();
var file   = fs.createReadStream('/path/to/file.m3u8');
file.pipe(parser);

parser.on('item', function(item) {
  // emits PlaylistItem, MediaItem, StreamItem, and IframeStreamItem
});
parser.on('m3u', function(m3u) {
  // fully parsed m3u file
});
```

All items and the m3u object have `toString()` methods for conversion to m3u8.
Attributes and properties have getter/setters on m3u and item objects:

```
parser.on('item', function(item) {
  var duration = item.get('bandwidth');
  item.set('uri', 'http://example.com/' + item.get('uri'));
});
```

The M3U and Item objects are available on m3u8:
```
var m3u8 = require('m3u8');

var m3u = m3u8.M3U.create();
m3u.addPlaylistItem({
  duration : 10,
  uri      : 'file'
});
```

See tests for more usage patterns.