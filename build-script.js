import { build } from 'vite';
import { copyFileSync, existsSync } from 'fs';

async function run() {
  await build();
  const extraFiles = ['dashboard-init.js', 'dashboard-test.js', 'dashboard-fixes.js'];
  for (const file of extraFiles) {
    if (existsSync(file)) {
      copyFileSync(file, `dist/${file}`);
    }
  }
  console.log('Build finished');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
