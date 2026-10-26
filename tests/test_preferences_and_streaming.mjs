import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting test_preferences_and_streaming verification...');

// 1. Verify AccountView.tsx
const accountViewPath = path.resolve('src/components/AccountView.tsx');
assert(fs.existsSync(accountViewPath), 'AccountView.tsx must exist');
const accountViewCode = fs.readFileSync(accountViewPath, 'utf8');

// Check Preferences Section elements
assert(accountViewCode.includes('التفضيلات وإعدادات الاستخدام'), 'AccountView must include preferences section title');
assert(accountViewCode.includes('handleThemeSelect'), 'AccountView must have theme selection handler');
assert(accountViewCode.includes('handleSavePreferences'), 'AccountView must have preferences save handler');
assert(accountViewCode.includes('ps_user_preferences'), 'AccountView must use ps_user_preferences storage key');
assert(accountViewCode.includes('INTEREST_OPTIONS'), 'AccountView must have interest options');
assert(accountViewCode.includes('notificationsEnabled'), 'AccountView must have notifications toggle');
assert(accountViewCode.includes('soundEffectsEnabled'), 'AccountView must have sound effects toggle');
assert(accountViewCode.includes('transportMode'), 'AccountView must have transport mode selection');
assert(accountViewCode.includes('mapStyle'), 'AccountView must have map style selection');

// Check Light Mode text visibility
assert(accountViewCode.includes('text-ocean-950 dark:text-white') || accountViewCode.includes('text-ocean-900 dark:text-white'), 'AccountView must have clear contrast text classes');

// Check Mobile / small screen responsiveness
assert(accountViewCode.includes('overflow-x-hidden'), 'AccountView must prevent horizontal scroll');
assert(accountViewCode.includes('flex flex-col sm:flex-row'), 'AccountView hero must adapt on mobile');

console.log('✅ AccountView preferences and light mode text checks passed.');

// 2. Verify AssistantChat.tsx Typewriter streaming effect
const assistantPath = path.resolve('src/components/AssistantChat.tsx');
assert(fs.existsSync(assistantPath), 'AssistantChat.tsx must exist');
const assistantCode = fs.readFileSync(assistantPath, 'utf8');

assert(assistantCode.includes('TypewriterMessageText'), 'AssistantChat must include TypewriterMessageText component');
assert(assistantCode.includes('isStreaming'), 'AssistantChat must have isStreaming state flag');
assert(assistantCode.includes('handleSkip'), 'TypewriterMessageText must support skip on click');
assert(assistantCode.includes('animate-pulse'), 'TypewriterMessageText must include blinking typing indicator');

console.log('✅ AssistantChat progressive typewriter checks passed.');

// 3. Verify UnifiedAiStudio.tsx Typewriter streaming effect
const unifiedAiPath = path.resolve('src/components/SmartPlanner/UnifiedAiStudio.tsx');
assert(fs.existsSync(unifiedAiPath), 'UnifiedAiStudio.tsx must exist');
const unifiedAiCode = fs.readFileSync(unifiedAiPath, 'utf8');

assert(unifiedAiCode.includes('TypewriterMarkdownMessage'), 'UnifiedAiStudio must include TypewriterMarkdownMessage component');
assert(unifiedAiCode.includes('isStreaming'), 'UnifiedAiStudio must have isStreaming flag');
assert(unifiedAiCode.includes('المساعد يكتب الآن'), 'UnifiedAiStudio must show progressive typing status');
assert(unifiedAiCode.includes('⚡ اضغط للتخطي'), 'UnifiedAiStudio must support instant skip');

console.log('✅ UnifiedAiStudio progressive typewriter checks passed.');

// 4. Verify TOLZY Team Attribution
const footerPath = path.resolve('src/components/Footer.tsx');
const footerCode = fs.readFileSync(footerPath, 'utf8');
assert(footerCode.includes('الموقع مصمم من قبل') && footerCode.includes('TOLZY Team'), 'Footer must credit TOLZY Team');

const welcomeModalPath = path.resolve('src/components/WelcomeModal.tsx');
const welcomeModalCode = fs.readFileSync(welcomeModalPath, 'utf8');
assert(welcomeModalCode.includes('TOLZY Team'), 'WelcomeModal must credit TOLZY Team');

console.log('✅ TOLZY Team branding and attribution checks passed.');

// 5. Verify Live Dev Server
const resHome = await fetch('http://localhost:3000/');
assert.strictEqual(resHome.status, 200, 'Home page must return HTTP 200');

const resAi = await fetch('http://localhost:3000/ai');
assert.strictEqual(resAi.status, 200, 'AI page must return HTTP 200');

console.log('✅ Live server HTTP checks passed.');
console.log('🎉 All preferences, light mode, mobile, and typewriter tests passed successfully!');
