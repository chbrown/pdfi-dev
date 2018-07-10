import {readFileSync} from 'fs';
import {join} from 'path';

export function readToEnd(stream: any, callback: (error: Error, buffer?: Buffer) => void) {
  const chunks: Buffer[] = [];
  stream.on('readable', () => {
    const chunk = stream.read();
    if (chunk) {
      chunks.push(chunk);
    }
  })
  .on('error', error => {
    callback(error);
  })
  .on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
}

export function parseOctal(str) {
  return (str === '—') ? null : parseInt(str, 8);
}

/**
Parse space-separated unicode character sequence as a native JavaScript string.
E.g.:

    'F766 F766 F76C' -> 'ffl'
    '2126' -> 'Ω'
*/
export function parseUnicodeCharCodes(unicodeCharCodes: string): string {
  const charCodes = unicodeCharCodes.split(' ').map(s => parseInt(s, 16));
  return String.fromCharCode.apply(null, charCodes);
}

/**
Parse comma-separated list of unicode character code sequences as a list of
native JavaScript strings.
*/
function parseAlternatives(alternatives: string): string[] {
  return alternatives.split(',').map(parseUnicodeCharCodes);
}

/**
The provided {buffer} should have ;-separated lines like:

nine;0039

Where the first value is the glyphname, and the second value is the
corresponding unicode index (or in some cases, like TeX's glyphlist, is a
,-separated list of equivalent potentially multi-character replacement strings)

The {buffer} may also have #-prefixed lines, indicating comments, which are ignored.
*/
export function parseGlyphlist(input: string): [string, string][] {
  return input.split(/\r?\n/)
  // ignore #-prefixed lines
  .filter(line => line[0] !== '#')
  // ignore empty lines
  .filter(line => line.trim().length > 0)
  .map(line => {
    const [glyphname, replacements] = line.split(';');
    // TODO: remove type hint when TypeScript grows up and can actually infer tuples properly
    return [glyphname, replacements] as [string, string];
  });
}

type Command = (inputStream: NodeJS.ReadableStream,
                outputStream: NodeJS.WritableStream) => void;

export const commands: {[name: string]: Command} = {
  encodeGlyphs(inputStream, outputStream) {
    const glyphlist_data = readFileSync(join(__dirname, 'encoding', 'glyphlist.txt'));
    // glyphlist is a list of [glyphname, alternatives] tuples
    const glyphlist = parseGlyphlist(glyphlist_data.toString('ascii'));
    // glyphs is a mapping from glyphnames to alternatives
    const glyphs = new Map(glyphlist);

    readToEnd(inputStream, (err, buffer) => {
      buffer.toString('ascii').split(/\n/).forEach(glyphname => {
        const replacement = glyphs.get(glyphname) || '';
        outputStream.write(`${replacement}\n`);
      });
    });
  },
  readCharset(inputStream, outputStream) {
    readToEnd(inputStream, (err, buffer) => {
      const StandardEncoding = [];
      const MacRomanEncoding = [];
      const WinAnsiEncoding = [];
      const PDFDocEncoding = [];
      buffer.toString('utf8').split(/\n/).forEach(line => {
        const cells = line.split(/\t/); // CHAR GLYPH STD MAC WIN PDF
        if (cells.length !== 6) {
          throw new Error(`Incorrect formatting on line: ${line}`);
        }
        const glyphname = cells[1];
        const Standard = parseOctal(cells[2]);
        const MacRoman = parseOctal(cells[3]);
        const WinAnsi = parseOctal(cells[4]);
        const PDFDoc = parseOctal(cells[5]);
        if (Standard !== null) {
          StandardEncoding[Standard] = glyphname;
        }
        if (MacRoman !== null) {
          MacRomanEncoding[MacRoman] = glyphname;
        }
        if (WinAnsi !== null) {
          WinAnsiEncoding[WinAnsi] = glyphname;
        }
        if (PDFDoc !== null) {
          PDFDocEncoding[PDFDoc] = glyphname;
        }
      });
      [
        {name: 'StandardEncoding', value: StandardEncoding},
        {name: 'MacRomanEncoding', value: MacRomanEncoding},
        {name: 'WinAnsiEncoding', value: WinAnsiEncoding},
        {name: 'PDFDocEncoding', value: PDFDocEncoding},
      ].forEach(character_set => {
        outputStream.write(`export const ${character_set.name} = `);
        outputStream.write(JSON.stringify(character_set.value).replace(/null/g, ''));
        outputStream.write(';\n');
      });
    });
  },
  /**
  Usage: `node index readGlyphlist <glyphlist.txt >glyphlist.ts

  Where `glyphlist.txt` comes from
  http://partners.adobe.com/public/developer/en/opentype/glyphlist.txt or similar,
  and has ;-separated lines like:

  nine;0039

  Where the first value is the glyphname, and the second value is the unicode
  character code.
  */
  readGlyphlist(inputStream, outputStream) {
    readToEnd(inputStream, (err, buffer) => {
      const glyphs = {};
      const glyphlist_data = buffer.toString('ascii');
      parseGlyphlist(glyphlist_data).map((pair) => {
        const glyphname = pair[0];
        const alternatives = pair[1].split(',');
        glyphs[glyphname] = parseUnicodeCharCodes(alternatives[0]);
      });
      outputStream.write('export default ');
      outputStream.write(JSON.stringify(glyphs, null, ' '));
      outputStream.write(';\n');
    });
  },
};

if (require.main === module) {
  const [, , commandName] = process.argv;
  const command = commands[commandName];
  if (command) {
    command(process.stdin, process.stdout);
  }
  else {
    console.error(`Unrecognized command: ${commandName}`);
    process.exit(1);
  }
}
