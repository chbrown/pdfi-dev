SHELL := bash
# the order of GLYPHLISTS matters, so we can't just use $(wildcard encoding/*glyphlist.txt)
GLYPHLISTS := encoding/cmr-glyphlist.txt encoding/additional_glyphlist.txt \
              encoding/texglyphlist.txt encoding/truetype_glyphlist.txt encoding/glyphlist.txt

all: build/glyphmaps.ts build/glyphlist.ts

encoding/glyphlist.txt:
	# glyphlist.txt is pure ASCII
	curl -s https://raw.githubusercontent.com/adobe-type-tools/agl-aglfn/master/glyphlist.txt >$@

encoding/additional_glyphlist.txt:
	curl -s https://raw.githubusercontent.com/apache/pdfbox/trunk/pdfbox/src/main/resources/org/apache/pdfbox/resources/glyphlist/additional.txt > $@

encoding/texglyphlist.txt:
	curl -s https://www.tug.org/texlive/Contents/live/texmf-dist/fonts/map/glyphlist/texglyphlist.txt > $@

encoding/truetype_glyphlist.txt: encoding/truetype_post_format1-mapping.tsv
	paste -d ';' <(<$< cut -f 1 | xargs -n 1 printf 'G%02X\n') <(<$< cut -f 2 | node encode_glyphs.js) |\
    grep -v ';$$' >$@

# texglyphlist uses some unconventional characters, so we read the standard glyphlist last
build/glyphlist.ts: $(GLYPHLISTS)
	mkdir -p $(@D)
	cat $(GLYPHLISTS) | node read_glyphlist.js >$@

build/glyphmaps.ts: encoding/latin_charset.tsv
	# encoding/latin_charset.tsv comes from PDF32000_2008.pdf: Appendix D.2
	mkdir -p $(@D)
	node read_charset.js <$< >$@
