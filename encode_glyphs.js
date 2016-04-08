const fs = require('fs');
const path = require('path');

const dev = require('./index');

const glyphlist_data = fs.readFileSync(path.join(__dirname, '..', 'encoding', 'glyphlist.txt'));
// glyphlist is a list of [glyphname: string, alternatives: string]-tuples
const glyphlist = dev.parseGlyphlist(glyphlist_data.toString('ascii'));
// glyphs is a mapping from glyphnames to alternatives
const glyphs = new Map(glyphlist);

dev.readToEnd(process.stdin, (err, buffer) => {
  // process.stdout.write('read' + JSON.stringify(Buffer.concat(chunks).toJSON()) + 'EOF');
  buffer.toString('ascii').split(/\n/).forEach(glyphname => {
    const replacement = glyphs.get(glyphname) || '';
    process.stdout.write(replacement + '\n');
  });
});
