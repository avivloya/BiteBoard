// Android app shortcuts: long-press the Snapspoon icon (or ask Google Assistant to open them)
// to jump straight to snapping a meal, logging by voice or the tracker.
// Each shortcut opens a snapspoon:// link, which Expo Router turns into a screen.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');

const SHORTCUTS = [
  { id: 'snap', short: 'Snap a meal', long: 'Snap a meal', url: 'snapspoon://snap' },
  { id: 'voice', short: 'Log by voice', long: 'Log a meal by voice', url: 'snapspoon://voice-log' },
  { id: 'today', short: 'Calories left', long: 'See calories left today', url: 'snapspoon://today' },
  { id: 'coach', short: 'What to eat', long: 'Ask what to eat next', url: 'snapspoon://coach' },
];

const xml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${SHORTCUTS.map((s) => `  <shortcut android:shortcutId="${s.id}" android:enabled="true" android:icon="@mipmap/ic_launcher" android:shortcutShortLabel="@string/shortcut_${s.id}_short" android:shortcutLongLabel="@string/shortcut_${s.id}_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="${pkg}" android:data="${s.url}" />
  </shortcut>`).join('\n')}
</shortcuts>
`;

module.exports = function withAppShortcuts(config) {
  config = withAndroidManifest(config, (c) => {
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(c.modResults);
    main['meta-data'] = (main['meta-data'] ?? []).filter((m) => m.$['android:name'] !== 'android.app.shortcuts');
    main['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } });
    return c;
  });
  config = withDangerousMod(config, ['android', async (c) => {
    const res = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res');
    fs.mkdirSync(path.join(res, 'xml'), { recursive: true });
    fs.writeFileSync(path.join(res, 'xml/shortcuts.xml'), xml(c.android?.package ?? 'com.avivloya.snapspoon'));
    fs.mkdirSync(path.join(res, 'values'), { recursive: true });
    const strings = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${SHORTCUTS.map((s) => `  <string name="shortcut_${s.id}_short">${s.short}</string>\n  <string name="shortcut_${s.id}_long">${s.long}</string>`).join('\n')}\n</resources>\n`;
    fs.writeFileSync(path.join(res, 'values/shortcut_strings.xml'), strings);
    return c;
  }]);
  return config;
};
