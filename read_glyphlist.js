/**
Usage: `node read_glyphlist <glyphlist.txt >glyphlist.ts

Where `glyphlist.txt` comes from
http://partners.adobe.com/public/developer/en/opentype/glyphlist.txt or similar,
and has ;-separated lines like:

nine;0039

Where the first value is the glyphname, and the second value is the unicode
character code.
*/
const dev = require('./index');

dev.readToEnd(process.stdin, (err, buffer) => {
  const glyphs = {};
  const glyphlist_data = buffer.toString('ascii');
  dev.parseGlyphlist(glyphlist_data).map((pair) => {
    const glyphname = pair[0];
    const alternatives = pair[1].split(',');
    glyphs[glyphname] = dev.parseUnicodeCharCodes(alternatives[0]);
  });
  process.stdout.write('export default ');
  process.stdout.write(JSON.stringify(glyphs, null, ' '));
  process.stdout.write(';\n');
});
