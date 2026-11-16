import { THEME_IDS } from '@life-room/shared';
import { THEMES, themeAttributes } from '../../themes/registry';
import { APPEARANCE_STORAGE_KEY, DEV_THEME_KEY } from './appearance';

/*
  Runs in <head> before the first paint: applies the locally cached appearance so a returning user never
  sees Paper flash before their theme. The shell then re-applies the server's copy once /auth/me loads.
*/
export function AppearanceBootScript() {
  const dev = process.env.NODE_ENV !== 'production';
  const themes = dev ? THEMES : THEMES.filter((theme) => (THEME_IDS as readonly string[]).includes(theme.id));
  const map = Object.fromEntries(themes.map((theme) => [theme.id, themeAttributes(theme)]));
  const script = `(function(){try{
var h=document.documentElement,a=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)})||'null');
var id=${dev ? `localStorage.getItem(${JSON.stringify(DEV_THEME_KEY)})||` : ''}(a&&a.theme);var m=${JSON.stringify(map)}[id];
if(m){for(var k in m)h.setAttribute(k,m[k]);}
if(a&&typeof a.strength==='number')h.style.setProperty('--texture-strength',String(a.strength));
if(a&&a.focus)h.setAttribute('data-focus','on');
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
