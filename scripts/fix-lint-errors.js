const fs = require('fs');
const path = require('path');

// Fix 1: Replace <a> tags with Next.js Link components
const files = [
  'app/admin/compatibility/page.tsx',
  'app/customer-portal/[token]/page.tsx',
  'app/customer-portal/page.tsx',
  'app/machines/[manufacturer]/[detail]/page.tsx',
  'app/page.tsx',
  'app/tools/[productCode]/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Add Link import if not present
  if (!content.includes("import Link from 'next/link'") && !content.includes('import Link from "next/link"')) {
    // Find the last import statement
    const importMatch = content.match(/^import .* from .*/gm);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      content = content.slice(0, lastImportIndex + lastImport.length) + 
                "\nimport Link from 'next/link';" +
                content.slice(lastImportIndex + lastImport.length);
    }
  }
  
  // Replace <a href="/..."> with <Link href="/...">
  content = content.replace(/<a\s+href="\/([^"]*)"([^>]*)>/g, '<Link href="/$1"$2>');
  content = content.replace(/<\/a>/g, '</Link>');
  
  // Fix unescaped apostrophes
  // Replace apostrophes in text content (not in code)
  content = content.replace(/([>])([^<]*)'([^<]*[<])/g, '$1$2&apos;$3');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${file}`);
});

// Fix 2: Remove unused imports
const fixUnusedImports = [
  { file: 'app/admin/compatibility/page.tsx', remove: 'Save' },
  { file: 'app/customer-portal/[token]/page.tsx', remove: 'RefreshCw' },
  { file: 'app/tools/[productCode]/page.tsx', remove: 'Play' }
];

fixUnusedImports.forEach(({ file, remove }) => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove the specific import
  content = content.replace(new RegExp(`,\\s*${remove}`, 'g'), '');
  content = content.replace(new RegExp(`${remove}\\s*,`, 'g'), '');
  
  fs.writeFileSync(filePath, content);
  console.log(`Removed unused import ${remove} from: ${file}`);
});

console.log('\nLint fixes applied!');