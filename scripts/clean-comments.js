const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ts = require('typescript');

const PRESERVE_PATTERNS = [
  /^@ts-(ignore|expect-error|nocheck|check)/i,
  /^eslint-(disable|enable)/i,
  /^istanbul\s+ignore/i,
  /^@vite-ignore/i,
  /^@jsx/i,
  /^license/i,
  /^!/i, // Banner / license preservation
];

function shouldPreserve(commentText) {
  const trimmed = commentText.trim();
  return PRESERVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function cleanCommentsInCode(code, filePath) {
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  const plugins = ['jsx', 'typescript'];

  let ast;
  try {
    ast = babel.parse(code, {
      sourceType: 'module',
      plugins,
      errorRecovery: true,
    });
  } catch (err) {
    console.warn(`[SKIP PARSE ERROR] ${filePath}: ${err.message}`);
    return null;
  }

  const toRemove = [];

  // 1. Identify JSX comments: {/* comment */}
  traverse(ast, {
    JSXExpressionContainer(p) {
      if (p.node.expression && p.node.expression.type === 'JSXEmptyExpression') {
        const commentList =
          p.node.expression.innerComments ||
          p.node.innerComments ||
          p.node.leadingComments ||
          [];
        const hasPreserved = commentList.some((c) => shouldPreserve(c.value));
        if (!hasPreserved) {
          toRemove.push({ start: p.node.start, end: p.node.end, type: 'jsx' });
        }
      }
    },
  });

  // 2. Identify standard comments (line and block)
  if (ast.comments) {
    for (const c of ast.comments) {
      if (shouldPreserve(c.value)) continue;

      // Avoid double-processing comments already inside a JSX expression container
      const alreadyCovered = toRemove.some(
        (r) => c.start >= r.start && c.end <= r.end
      );
      if (alreadyCovered) continue;

      toRemove.push({ start: c.start, end: c.end, type: c.type });
    }
  }

  if (toRemove.length === 0) {
    return { cleanedCode: code, removedCount: 0 };
  }

  // Sort descending by start position to edit string from end to beginning
  toRemove.sort((a, b) => b.start - a.start);

  let result = code;
  for (const r of toRemove) {
    const beforeText = result.slice(0, r.start);
    const lastNewlineBefore = beforeText.lastIndexOf('\n');
    const indent = beforeText.slice(lastNewlineBefore + 1);

    const afterText = result.slice(r.end);
    const nextNewline = afterText.indexOf('\n');
    const lineRemainder =
      nextNewline === -1 ? afterText : afterText.slice(0, nextNewline);

    const isOnlyItemOnLine =
      /^\s*$/.test(indent) && /^\s*(\r)?$/.test(lineRemainder);

    if (isOnlyItemOnLine) {
      const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
      const lineEnd =
        nextNewline === -1 ? result.length : r.end + nextNewline + 1;
      result = result.slice(0, lineStart) + result.slice(lineEnd);
    } else {
      let startTrim = r.start;
      while (startTrim > 0 && result[startTrim - 1] === ' ') {
        startTrim--;
      }
      result = result.slice(0, startTrim) + result.slice(r.end);
    }
  }

  // Normalize excessive blank lines (max 1 empty line between blocks)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Verify that the resulting code has no syntax errors using TypeScript
  const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(
    filePath,
    result,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) {
    console.warn(
      `[SYNTAX WARNING] Cleaning produced syntax error in ${filePath}. Skipping to prevent breakage.`
    );
    return null;
  }

  return { cleanedCode: result, removedCount: toRemove.length };
}

function getFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.git' ||
        entry.name === '.turbo'
      ) {
        continue;
      }
      files = files.concat(getFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const targetDirs = args.filter((a) => !a.startsWith('--'));

  const dirsToScan =
    targetDirs.length > 0
      ? targetDirs
      : [
          'apps/admin/src',
          'apps/superadmin/src',
          'apps/tracking/src',
          'packages/api-client/src',
          'packages/map/src',
          'packages/ui/src',
        ];

  console.log(`=== Code Comment Cleaner ===`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no files will be modified)' : 'APPLY (modifying files in-place)'}`);
  console.log(`Directories to scan:`, dirsToScan);

  let totalFiles = 0;
  let filesCleaned = 0;
  let totalCommentsRemoved = 0;

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) {
      console.log(`[DIR NOT FOUND] ${dir}`);
      continue;
    }

    const files = getFiles(dir);
    totalFiles += files.length;

    for (const file of files) {
      const code = fs.readFileSync(file, 'utf8');
      const cleanResult = cleanCommentsInCode(code, file);

      if (cleanResult && cleanResult.removedCount > 0) {
        filesCleaned++;
        totalCommentsRemoved += cleanResult.removedCount;

        if (!isDryRun) {
          fs.writeFileSync(file, cleanResult.cleanedCode, 'utf8');
          console.log(`✓ Cleaned (${cleanResult.removedCount} comments): ${file}`);
        } else {
          console.log(`[DRY-RUN] Would clean (${cleanResult.removedCount} comments): ${file}`);
        }
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files cleaned: ${filesCleaned}`);
  console.log(`Total comments removed: ${totalCommentsRemoved}`);
}

main();
