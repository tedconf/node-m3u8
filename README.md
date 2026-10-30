m3u8
====

node-m3u8 is a streaming m3u8 parser tailored for dealing with [Apple's HTTP
Live Streaming protocol](http://tools.ietf.org/html/draft-pantos-http-live-streaming).
It may work for other m3u files, but I have not tested it for those uses.

Requires Node.js 22 or later.

install
-------

Published to GitHub Packages as `@tedconf/m3u8`. Point the scope at the
registry in `.npmrc`, with a token that has `read:packages`:

```
@tedconf:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```
npm install m3u8@npm:@tedconf/m3u8@^1.0.0
```

The alias keeps `require('m3u8')` working.

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

fMP4 init segments
------------------

`EXT-X-MAP` is parsed per segment: every `PlaylistItem` after a map carries it
as `map` (the URI) and `mapByteRange`, until the next `EXT-X-MAP`. `toString()`
writes the tag before the segment's `EXTINF` (after `EXT-X-DISCONTINUITY`)
whenever the map changes, and writes at least `EXT-X-VERSION:6` when any segment
has a map. `merge()` keeps each playlist's maps.

```
parser.on('item', function(item) {
  if (item.get('map')) {
    item.set('map', 'http://example.com/' + item.get('map'));
  }
});
```

tests
-----

```
npm test
```

See tests for more usage patterns.