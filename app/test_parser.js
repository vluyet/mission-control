const fs = require('fs');
const content = fs.readFileSync('node_modules/overtype/dist/overtype.cjs', 'utf8');

// The bundle seems to wrap things in a way that doesn't export MarkdownParser directly to module.exports
// but it is defined in the top-level scope of the file if we eval it carefully, 
// or we can try to find where it is assigned.
// Actually, let's just use a simple regex to extract it or try to include it.

// Let's try to monkey-patch or just use the fact that it is in the same file.
// Since it is CJS, let's see if we can just require it and if it is exported.
// We saw earlier that it only exported OverType and a few others.

// Alternative: read the file, append a line to export MarkdownParser, and then require it.
const patchedContent = content + "\nmodule.exports.MarkdownParser = MarkdownParser;";
const path = './overtype_patched.cjs';
fs.writeFileSync(path, patchedContent);

const { MarkdownParser } = require(path);

const inputs = [
  '# Heading\n\nParagraph with **bold** and [link](https://example.com)',
  '```js\nconst value = 1;\n```',
  '- [x] done\n- [ ] todo'
];

inputs.forEach((input, index) => {
  console.log(`Input ${index + 1}:`);
  // Try to find the parse method. We saw MarkdownParser class earlier.
  // Let's check its static or instance methods.
  const parser = new MarkdownParser();
  // Based on common patterns, it might be .parse(text)
  if (typeof parser.parse === 'function') {
      console.log(parser.parse(input));
  } else if (typeof MarkdownParser.parse === 'function') {
      console.log(MarkdownParser.parse(input));
  } else {
      console.log('Parse method not found. Methods:', Object.getOwnPropertyNames(MarkdownParser.prototype));
  }
  console.log('---');
});
