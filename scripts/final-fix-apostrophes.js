const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'app/customer-portal/[token]/page.tsx',
    replacements: [
      { from: "'bg-gray-100 text-gray-700 hover:bg-gray-200&apos;", to: "'bg-gray-100 text-gray-700 hover:bg-gray-200'" },
      { from: "|| 'POA&apos;}", to: "|| 'POA'}" }
    ]
  },
  {
    file: 'app/tools/[productCode]/page.tsx',
    replacements: [
      { from: "|| 'POA&apos;}", to: "|| 'POA'}" }
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      console.log(`Fixed in ${file}: ${from} -> ${to}`);
    }
  });
  
  fs.writeFileSync(filePath, content);
});

console.log('All apostrophe fixes applied!');