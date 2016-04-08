const dev = require('./index');

dev.readToEnd(process.stdin, (err, buffer) => {
  const StandardEncoding = [];
  const MacRomanEncoding = [];
  const WinAnsiEncoding = [];
  const PDFDocEncoding = [];
  buffer.toString('utf8').split(/\n/).forEach(line => {
    const cells = line.split(/\t/); // CHAR GLYPH STD MAC WIN PDF
    if (cells.length !== 6) {
      throw new Error('Incorrect formatting on line: ' + line);
    }
    const glyphname = cells[1];
    const Standard = dev.parseOctal(cells[2]);
    const MacRoman = dev.parseOctal(cells[3]);
    const WinAnsi = dev.parseOctal(cells[4]);
    const PDFDoc = dev.parseOctal(cells[5]);
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
    process.stdout.write('export const ' + character_set.name + ' = ');
    process.stdout.write(JSON.stringify(character_set.value).replace(/null/g, ''));
    process.stdout.write(';\n');
  });
});
