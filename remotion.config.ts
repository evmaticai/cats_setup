import { Config } from '@remotion/cli/config';

Config.setChromiumOpenGlRenderer('angle');
// macOS: the default headless-shell's GPU process aborts (icudtl.dat); full Chrome for Testing works.
// Windows: full Chrome for Testing never connects (25 s timeout); headless-shell renders fine.
Config.setChromeMode(process.platform === 'darwin' ? 'chrome-for-testing' : 'headless-shell');
