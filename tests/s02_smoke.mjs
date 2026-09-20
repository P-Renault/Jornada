import fs from 'node:fs';
import assert from 'node:assert/strict';
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for (const token of ['b20s2_','validateSettings','exportSettings','importSettingsFile','resetSettings']) assert.ok(app.includes(token),`missing ${token}`);
for (const token of ['resetSettings','exportSettings','importSettings','settingsSummary']) assert.ok(html.includes(token),`missing ${token}`);
console.log('S02 smoke tests: OK');
