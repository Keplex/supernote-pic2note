// The official template's bundle -> config/assets/native app.npk -> ZIP flow.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {zipSync, unzipSync} = require('fflate');
const {createHash} = require('node:crypto');
const {buildNative} = require('./native-build.cjs');

const root = path.resolve(__dirname, '..');
process.chdir(root);
const config = JSON.parse(fs.readFileSync('PluginConfig.json', 'utf8'));
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (config.pluginKey !== app.name || app.name !== pkg.name) {throw Error('Plugin key mismatch');}
if (!/^[a-z0-9]{16}$/.test(config.pluginID)) {throw Error('Expected a stable 16-character pluginID');}
if (require('react-native/package.json').version !== '0.79.2') {throw Error('React Native must be 0.79.2');}
if (require('sn-plugin-lib/package.json').version !== '0.2.3') {throw Error('SDK version must be 0.2.3');}

const buildRoot = path.join(root, 'build');
const generated = path.join(buildRoot, 'generated');
if (path.dirname(generated) !== buildRoot || !generated.startsWith(root + path.sep)) {
  throw Error('Build directory must remain in this project');
}
fs.rmSync(generated, {recursive: true, force: true});
fs.mkdirSync(generated, {recursive: true});
fs.mkdirSync(path.join(root, '..', 'metro-temp'), {recursive: true});
execFileSync(process.execPath, [require.resolve('react-native/cli.js'), 'bundle',
  '--entry-file', 'index.js', '--bundle-output', path.join(generated, pkg.name + '.bundle'),
  '--sourcemap-output', path.join(buildRoot, pkg.name + '.bundle.map'),
  '--platform', 'android', '--assets-dest', generated, '--dev', 'false', '--max-workers', '2'],
{stdio: 'inherit', env: {...process.env, CI: '1', TEMP: path.join(root, '..', 'metro-temp'), TMP: path.join(root, '..', 'metro-temp')}});

const icon = path.basename(config.iconPath);
fs.copyFileSync(path.join(root, config.iconPath), path.join(generated, icon));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(generated, 'LICENSE'));
const npk = buildNative();
fs.copyFileSync(npk, path.join(generated, 'app.npk'));
fs.writeFileSync(path.join(generated, 'PluginConfig.json'), JSON.stringify({...config, iconPath: '/' + icon,
  nativeCodePackage: '/app.npk', reactPackages: ['com.localimage.editor.LocalImagePackage']}, null, 2) + '\n');

// Retain licenses for the actual packages that Metro included in the bundle.
const sourceMap = JSON.parse(fs.readFileSync(path.join(buildRoot, pkg.name + '.bundle.map'), 'utf8'));
const notices = new Map();
for (const source of sourceMap.sources) {
  let dir = path.dirname(path.resolve(root, source));
  while (dir !== path.dirname(dir) && dir !== root) {
    const packageFile = path.join(dir, 'package.json');
    if (fs.existsSync(packageFile)) {
      const dep = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
      if (!dep.name) {dir = path.dirname(dir); continue;}
      if (!notices.has(dep.name)) {
        const licenseFiles = fs.readdirSync(dir).filter(name => /^(LICENSE|LICENCE|COPYING|NOTICE)(\..*)?$/i.test(name)
          && fs.statSync(path.join(dir, name)).isFile());
        const text = licenseFiles.map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('\n');
        notices.set(dep.name, `${dep.name} ${dep.version}\nLicense: ${typeof dep.license === 'string' ? dep.license : JSON.stringify(dep.license)}\n${text || '(See the upstream package for license terms.)'}`);
      }
      break;
    }
    dir = path.dirname(dir);
  }
}
if (!notices.has('sn-plugin-lib') || !notices.has('react-native')) {throw Error('License discovery failed');}
fs.writeFileSync(path.join(generated, 'THIRD-PARTY-NOTICES.txt'), [...notices].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).join('\n\n' + '-'.repeat(72) + '\n\n'));

const files = {};
function collect(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const local = path.join(dir, entry.name);
    const name = prefix + entry.name;
    if (entry.isDirectory()) {collect(local, name + '/');}
    else {files[name] = [new Uint8Array(fs.readFileSync(local)), {mtime: new Date('2026-10-12T00:00:00Z')}];}
  }
}
collect(generated);
const buffer = zipSync(files, {level: 9});
const verified = unzipSync(buffer);
const requiredMembers=new Set(['PluginConfig.json','LocalImage.bundle','icon.png','THIRD-PARTY-NOTICES.txt','app.npk','LICENSE']);
// Validate resources referenced by current code; removed UI must not leave a stale icon checklist.
const sourceFiles=['App.tsx',...fs.readdirSync(path.join(root,'src')).filter(name=>/\.tsx?$/.test(name)).map(name=>'src/'+name)];
for(const file of sourceFiles)for(const match of fs.readFileSync(path.join(root,file),'utf8').matchAll(/require\(['"](?:\.\.\/|\.\/)assets\/([^'"]+\.png)['"]\)/g)){
  requiredMembers.add('drawable-mdpi/assets_'+path.basename(match[1],'.png').toLowerCase().replace(/[^a-z0-9]/g,'')+'.png');
}
for(const required of requiredMembers)if(!verified[required]?.length)throw Error('Missing package member: '+required);
const output = path.join(buildRoot, 'outputs');
fs.mkdirSync(output, {recursive: true});
const name = `LocalImage-${pkg.version}.snplg`;
fs.writeFileSync(path.join(output, name), buffer);
fs.writeFileSync(path.join(output, name + '.sha256'), `${createHash('sha256').update(buffer).digest('hex')}  ${name}\n`);
console.log(`Verified ${name}: ${buffer.length} bytes; ${Object.keys(verified).length} package members.`);
