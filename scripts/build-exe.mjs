import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('[1/4] Preparing SEA config...');
fs.writeFileSync(
  'sea-config.json',
  JSON.stringify(
    {
      main: 'dist/bundle.cjs',
      output: 'sea-prep.blob',
      disableExperimentalSEAWarning: true
    },
    null,
    2
  )
);

console.log('[2/4] Generating preparation blob...');
execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });

console.log('[3/4] Copying Node runtime binary to awms.0.1.1.exe...');
const nodePath = process.execPath;
fs.copyFileSync(nodePath, 'awms.0.1.1.exe');

console.log('[4/4] Injecting SEA blob with postject...');
execSync(
  'npx --yes postject awms.0.1.1.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  { stdio: 'inherit' }
);

if (fs.existsSync('sea-prep.blob')) fs.unlinkSync('sea-prep.blob');
if (fs.existsSync('sea-config.json')) fs.unlinkSync('sea-config.json');

const stats = fs.statSync('awms.0.1.1.exe');
console.log(`\nSuccessfully built awms.0.1.1.exe (${(stats.size / (1024 * 1024)).toFixed(1)} MB)`);
