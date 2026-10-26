# Native editor build

The plugin contains a small Java module, registered as
`com.localimage.editor.LocalImagePackage`. PluginHost provides React Native and
the Supernote SDK. Their Java classes are compile-only and are not copied into
the native package.

## Prerequisites

- Node.js >= 22.18, pnpm 11.25.0 and the locked project dependencies.
- JDK 17 or newer. This build used Temurin 21.0.12.1; emitted Java bytecode targets Java 8.
- Android SDK Platform 35 and Build Tools **35.0.0** (aapt2 and D8).
- `classes.jar` extracted from the official React Android **0.79.2 release AAR**:
  [Maven Central artifact](https://repo.maven.apache.org/maven2/com/facebook/react/react-android/0.79.2/react-android-0.79.2-release.aar).
  Compare its SHA-1 with the artifact's `.sha1` file before extracting it.

Install the Android packages using Android Studio's SDK Manager or the official
`sdkmanager` (`platforms;android-35` and `build-tools;35.0.0`). The AAR is a ZIP;
extract the entry `classes.jar` to a local file named `react-android.jar`.
Do not rename the entire AAR to JAR.

Set these environment variables to your actual paths before building:

```powershell
$env:LOCALIMAGE_JDK = 'C:\path\to\jdk-21'
$env:ANDROID_HOME = 'C:\path\to\Android\Sdk'
$env:LOCALIMAGE_REACT_JAR = 'C:\path\to\react-android.jar'
```

For this workspace the script also discovers the verified, locally extracted
toolchain in `../toolchain/` (Windows): `jdk/<jdk>/`, `platform/android-35/`,
`build-tools/<build-tools>/`, and `react-android.jar`. The source archive does not
include the large third-party toolchain downloads. On other platforms use the
environment variables above and the matching platform's SDK executables.

## Commands

From the project root:

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck
pnpm run test
pnpm run test:native
pnpm run build
```

If a pnpm wrapper attempts to access the network when running an already
installed project, the equivalent local commands are:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/*.test.mts tests/*.test.cjs
node scripts/native-build.cjs --test
node scripts/build.cjs
```

The Java tests create `build/native-tests/tone-comparison.png` from the same
pixel engine used by Android. They do not exercise Android Bitmap decoding,
PluginHost class loading, React Native touch input or the physical display.

## Packaging

`scripts/native-build.cjs` runs javac, then D8 (minimum API 27), and aapt2.
The resulting `build/native/app.npk` is an APK-format ZIP containing the binary
Android manifest and the editor's own DEX. It has no launcher activity and is
loaded by PluginHost; it is not a separately installable application.

`scripts/build.cjs` adds the following generated config fields and includes
the native package alongside the JavaScript bundle, icon and notices:

```json
{
  "nativeCodePackage": "/app.npk",
  "reactPackages": ["com.localimage.editor.LocalImagePackage"]
}
```

The outer archive is `build/outputs/LocalImage-0.9.0.snplg`. Install that complete
file through Supernote's plugin manager. The source config's stable plugin ID
must be retained for updates; increase `versionCode` for a new release.

The package contains no Android SDK, JDK, third-party native library or signing
key. Version 0.9.0 adds native clockwise rotation, inversion, full-canvas crop
previews and a bounded latest-image scanner. Java tests cover the pure engine
and file scanner; Android decoding, host picture replacement, storage permissions
and physical e-ink refresh still require device testing. The outer package keeps
the internal LocalImage name for compatibility; delivery may name the same bytes
Pic2Note-0.9.0.snplg. It includes MIT LICENSE and third-party notices.

Optional layout checks use the actual component tree and a CSS approximation of
React Native styles. Set `LOCALIMAGE_LAYOUT_QA=1`, `LOCALIMAGE_PLAYWRIGHT` to the
installed Playwright module, and `LOCALIMAGE_BROWSER` to a Chromium executable,
then run `node --test --test-name-pattern="desktop layout snapshots" tests/app.test.cjs`.
Snapshots are written to `build/layout-qa/`. These are desktop layout previews,
not device screenshots; they cannot confirm Android font metrics or e-ink refresh.
