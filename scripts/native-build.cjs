const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {zipSync, unzipSync} = require('fflate');
const root = path.resolve(__dirname, '..');
const toolRoot = path.resolve(root, '../toolchain');
function firstDirectory(folder, contains) {
  if (!fs.existsSync(folder)) {return '';}
  return fs.readdirSync(folder, {withFileTypes: true}).filter(d => d.isDirectory())
    .map(d => path.join(folder, d.name)).find(d => fs.existsSync(path.join(d, contains))) || '';
}
function tools() {
  const jdk = process.env.LOCALIMAGE_JDK || firstDirectory(path.join(toolRoot, 'jdk'), 'bin/java.exe');
  const sdk = process.env.ANDROID_HOME;
  const platform = sdk ? path.join(sdk, 'platforms/android-35') : firstDirectory(path.join(toolRoot, 'platform'), 'android.jar');
  const buildTools = sdk ? path.join(sdk, 'build-tools/35.0.0') : firstDirectory(path.join(toolRoot, 'build-tools'), 'lib/d8.jar');
  const reactJar = process.env.LOCALIMAGE_REACT_JAR || path.join(toolRoot, 'react-android.jar');
  const exe = process.platform === 'win32' ? '.exe' : '';
  const result = {java: path.join(jdk, 'bin/java' + exe), javac: path.join(jdk, 'bin/javac' + exe),
    androidJar: path.join(platform, 'android.jar'), reactJar,
    aapt: path.join(buildTools, 'aapt2' + exe), d8: path.join(buildTools, 'lib/d8.jar')};
  for (const [name, file] of Object.entries(result)) {
    if (!fs.existsSync(file)) {throw Error(`Missing ${name}: ${file}. See native/BUILD.md.`);}
  }
  return result;
}
function run(binary, args) {execFileSync(binary, args, {stdio: 'inherit', cwd: root});}
function javaSources(folder) {
  return fs.readdirSync(folder, {withFileTypes: true}).flatMap(e => e.isDirectory()
    ? javaSources(path.join(folder, e.name)) : e.name.endsWith('.java') ? [path.join(folder, e.name)] : []);
}
function archiveDirectory(folder) {
  const files = {};
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {scan(file);} else {files[path.relative(folder, file).replaceAll('\\', '/')] = fs.readFileSync(file);}
    }
  }
  scan(folder); return zipSync(files);
}
function buildNative() {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'PluginConfig.json'), 'utf8'));
  const manifest = fs.readFileSync(path.join(root, 'native/AndroidManifest.xml'), 'utf8');
  if (!manifest.includes(`android:versionCode="${config.versionCode}"`) || !manifest.includes(`android:versionName="${config.versionName}"`)) {
    throw Error('Native manifest and plugin versions must match');
  }
  const t = tools();
  const out = path.join(root, 'build/native');
  if (path.dirname(out) !== path.join(root, 'build')) {throw Error('Invalid native build output');}
  fs.rmSync(out, {recursive: true, force: true}); fs.mkdirSync(out, {recursive: true});
  const classes = path.join(out, 'classes'); fs.mkdirSync(classes);
  run(t.javac, ['--release', '8', '-encoding', 'UTF-8', '-cp', [t.androidJar, t.reactJar].join(path.delimiter),
    '-d', classes, ...javaSources(path.join(root, 'native/src'))]);
  const jar = path.join(out, 'editor.jar'); fs.writeFileSync(jar, archiveDirectory(classes));
  const dex = path.join(out, 'dex.zip');
  run(t.java, ['-cp', t.d8, 'com.android.tools.r8.D8', '--release', '--min-api', '27',
    '--lib', t.androidJar, '--classpath', t.reactJar, '--output', dex, jar]);
  const resources = path.join(out, 'resources.apk');
  run(t.aapt, ['link', '--manifest', path.join(root, 'native/AndroidManifest.xml'),
    '-I', t.androidJar, '--min-sdk-version', '27', '--target-sdk-version', '35', '-o', resources]);
  const content = {...unzipSync(fs.readFileSync(resources)), ...unzipSync(fs.readFileSync(dex))};
  if (!content['classes.dex'] || !content['AndroidManifest.xml']) {throw Error('Missing native package content');}
  const npk = path.join(out, 'app.npk'); fs.writeFileSync(npk, zipSync(content, {level: 9}));
  run(t.aapt, ['dump', 'badging', npk]);
  console.log(`Native module compiled: ${fs.statSync(npk).size} bytes (host supplies React Native)`);
  return npk;
}
function testNative() {
  const t = tools(), out = path.join(root, 'build/native-tests'); fs.mkdirSync(out, {recursive: true});
  run(t.javac, ['--release', '8', '-encoding', 'UTF-8', '-d', out,
    path.join(root, 'native/src/com/localimage/editor/ToneMath.java'), path.join(root, 'native/src/com/localimage/editor/LatestImage.java'), path.join(root, 'native/src/com/localimage/editor/PreviewPixels.java'), ...javaSources(path.join(root, 'native/tests'))]);
  run(t.java, ['-Djava.awt.headless=true', '-cp', out, 'com.localimage.editor.ToneMathTest', out]);
}
module.exports = {buildNative, testNative};
if (require.main === module) {if (process.argv.includes('--test')) {testNative();} else {buildNative();}}
