/* 岛屿 · 桌面（主屏幕）：时钟、图标、Dock、壁纸、主题、桌面点击分发
 * 拆分自原 app.js；所有 js 文件以经典脚本方式共享全局作用域，需按 index.html 中的顺序加载。 */
'use strict';

function tick(){
  var d = new Date();
  var hm = d.getHours() + ':' + pad(d.getMinutes());
  renderCalendarWidget();
}


/* 主屏幕 4×6 网格：行高 = 一个应用图标格（图标 + 名称）的实际高度。
 * 日历（4×2）、音乐（2×2）按网格跨行，高度因此自动跟随图标大小 / 名称开关 / 字号。 */
function syncHomeGridRows(){
  var home = $('home');
  var grid = $('homeGrid');
  var app = grid && grid.querySelector('.app');
  if (!home || !app) return;
  var rowH = app.offsetHeight;
  if (!rowH) return;
  /* 主屏幕不再上下滚动：先按默认行距量，若 6 行放不进可用高度（小屏手机），就把行距收紧到刚好放下。 */
  home.style.removeProperty('--home-gap-y');
  var gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  var body = grid.parentElement;
  if (body) {
    var cs = getComputedStyle(body);
    var avail = body.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (avail > 0 && rowH * 6 + gap * 5 > avail) {
      gap = Math.max(4, Math.floor((avail - rowH * 6) / 5));
      home.style.setProperty('--home-gap-y', gap + 'px');
    }
  }
  home.style.setProperty('--home-row-h', rowH + 'px');
  home.style.setProperty('--cal-widget-h', (rowH * 2 + gap) + 'px');
  /* 2 行高度不足 150px（例如关闭图标名称）时，音乐组件进入紧凑模式，给封面多留空间。 */
  home.setAttribute('data-grid-compact', (rowH * 2 + gap) < 150 ? 'on' : 'off');
}


function bindHomeGridEvents(){
  syncHomeGridRows();
  var firstApp = document.querySelector('#homeGrid .app');
  if (firstApp && window.ResizeObserver) new ResizeObserver(syncHomeGridRows).observe(firstApp);
  window.addEventListener('resize', syncHomeGridRows);
}


function getSystemTheme(){
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}


/* ---------- 液态玻璃图标主题（glass）----------
 * 与“文字”主题完全分开：不显示文字首字，而是用一套专属的实心 SVG 符号，
 * 配合 css-apps-home.css 里 .app-icon.is-liquid 的折射、边缘高光与内发光。 */
var LIQUID_GLYPHS = {
  '聊天': '<path d="M12 3.2c-5 0-9 3.4-9 7.6 0 2.3 1.2 4.3 3.1 5.7-.1 1.3-.7 2.5-1.6 3.4-.3.3-.1.9.4.9 2-.2 3.7-1 4.7-1.7.8.2 1.6.2 2.4.2 5 0 9-3.4 9-7.6S17 3.2 12 3.2z"/>',
  '通讯录': '<circle cx="12" cy="7.6" r="4.2"/><path d="M3.8 19.6c0-3.9 3.6-6.6 8.2-6.6s8.2 2.7 8.2 6.6c0 .7-.5 1.2-1.2 1.2H5c-.7 0-1.2-.5-1.2-1.2z"/>',
  '相册': '<path fill-rule="evenodd" d="M5.6 3.6h12.8A2.6 2.6 0 0 1 21 6.2v11.6a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.8V6.2a2.6 2.6 0 0 1 2.6-2.6zM9 7.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM5.2 18l4.1-4.7 3 3 2.5-2.8L19 18z"/>',
  '日历': '<path fill-rule="evenodd" d="M7.2 2.6c.6 0 1 .4 1 1V5h7.6V3.6c0-.6.4-1 1-1s1 .4 1 1V5h.2A2.8 2.8 0 0 1 21 7.8v10.4a2.8 2.8 0 0 1-2.8 2.8H5.8A2.8 2.8 0 0 1 3 18.2V7.8A2.8 2.8 0 0 1 5.8 5H6.2V3.6c0-.6.4-1 1-1zM6.8 10.8h2.4v2.4H6.8zm4 0h2.4v2.4h-2.4zm4 0h2.4v2.4h-2.4zM6.8 15.2h2.4v2.4H6.8zm4 0h2.4v2.4h-2.4z"/>',
  '备忘录': '<path fill-rule="evenodd" d="M7.4 3h9.2A3.4 3.4 0 0 1 20 6.4v11.2a3.4 3.4 0 0 1-3.4 3.4H7.4A3.4 3.4 0 0 1 4 17.6V6.4A3.4 3.4 0 0 1 7.4 3zM8 7.6h8v1.7H8zm0 3.6h8v1.7H8zm0 3.6h5v1.7H8z"/>',
  '天气': '<circle cx="8.2" cy="8.4" r="3.7" opacity=".7"/><path d="M7.6 20a4.3 4.3 0 0 1-.4-8.6 5.6 5.6 0 0 1 10.6 1.4A3.6 3.6 0 0 1 17.4 20z"/>',
  '时钟': '<path fill-rule="evenodd" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2zM11 6.4h2v5.4l3.5 2.1-1 1.7-4.5-2.7z"/>',
  '设置': '<g id="lqTeeth"><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(45 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(90 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(135 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(180 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(225 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(270 12 12)"/><rect x="10.1" y="2.4" width="3.8" height="4.6" rx="1.2" transform="rotate(315 12 12)"/></g><path fill-rule="evenodd" d="M12 4.6a7.4 7.4 0 1 0 0 14.8 7.4 7.4 0 0 0 0-14.8zM12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z"/>',
  '电话': '<path transform="rotate(-135 12 12)" d="M3.2 9.4c0-1.2.6-2 1.7-2.5 4.2-1.7 10.7-1.7 14.2 0 1.1.5 1.7 1.3 1.7 2.5v1.3c0 .9-.6 1.5-1.5 1.6l-2.6.3c-.8.1-1.4-.4-1.5-1.2l-.2-1.7c-.1-.5-.4-.8-.9-.9-1.3-.2-2.6-.2-3.9 0-.5.1-.8.4-.9.9l-.2 1.7c-.1.8-.7 1.3-1.5 1.2l-2.6-.3c-.9-.1-1.5-.7-1.5-1.6z"/>',
  '浏览器': '<path fill-rule="evenodd" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2zM16.4 7.6l-2.2 6.6-6.6 2.2 2.2-6.6z"/>',
  '世界书': '<path d="M2.8 5.8c3.1-.9 6.2-.6 8.4 1v13c-2.3-1.5-5.4-1.8-8.4-.9z"/><path d="M21.2 5.8c-3.1-.9-6.2-.6-8.4 1v13c2.3-1.5 5.4-1.8 8.4-.9z"/>',
  '音乐': '<ellipse cx="7" cy="17.8" rx="3.1" ry="2.7"/><ellipse cx="17" cy="15.8" rx="3.1" ry="2.7"/><rect x="8.9" y="5.6" width="2" height="12.2"/><rect x="18.9" y="3.6" width="2" height="12.2"/><path d="M8.9 5.2l12-2.6v4l-12 2.6z"/>'
};

function ensureLiquidDefs(){
  if (document.getElementById('lqDefs')) return;
  var holder = document.createElement('div');
  holder.id = 'lqDefs';
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  holder.innerHTML = '<svg width="0" height="0" focusable="false"><defs><linearGradient id="lqGlyphGrad" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f6f7fb"/><stop offset="1" stop-color="#dde1ea"/></linearGradient></defs></svg>';
  document.body.appendChild(holder);
}

function getHomeIconTheme(){
  var t = State.settings && State.settings.homeAppearance && State.settings.homeAppearance.iconTheme;
  return ['mono','glass','borderless'].indexOf(t) >= 0 ? t : 'mono';
}

function setAppIconVisual(iconEl, appName, imageData){
  if (!iconEl) return;
  var liquid = getHomeIconTheme() === 'glass';
  iconEl.classList.toggle('has-custom-image', !!imageData);
  iconEl.classList.toggle('is-liquid', liquid);
  iconEl.innerHTML = '';
  if (imageData) {
    var img = document.createElement('img');
    img.src = imageData;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    iconEl.appendChild(img);
  } else if (liquid && LIQUID_GLYPHS[appName]) {
    ensureLiquidDefs();
    /* 底板模糊层：Dock/桌面图标自己不再用 backdrop-filter，这样里面的符号才能折射到壁纸 */
    var glass = document.createElement('span');
    glass.className = 'lq-glass';
    glass.setAttribute('aria-hidden', 'true');
    iconEl.appendChild(glass);
    var holder = document.createElement('span');
    holder.className = 'lq-glyph';
    holder.setAttribute('aria-hidden', 'true');
    /* 符号本身也是一片液态玻璃：用符号轮廓做遮罩，叠一层模糊壁纸 + 极细边缘 */
    var maskSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000">' + LIQUID_GLYPHS[appName] + '</svg>';
    holder.style.setProperty('--lq-mask', 'url("data:image/svg+xml,' + encodeURIComponent(maskSvg) + '")');
    holder.innerHTML = '<i class="lq-gblur"></i><svg viewBox="0 0 24 24" fill="url(#lqGlyphGrad)">' + LIQUID_GLYPHS[appName] + '</svg>';
    iconEl.appendChild(holder);
  } else {
    var glyph = document.createElement('span');
    glyph.className = 'app-glyph';
    glyph.textContent = appName.charAt(0);
    glyph.setAttribute('aria-hidden', 'true');
    iconEl.appendChild(glyph);
  }
}


function renderHomeAppIcons(){
  var a = normalizeHomeAppearance();
  $$('.home .app').forEach(function(app){
    var icon = app.querySelector('.app-icon');
    var name = app.getAttribute('data-app') || '';
    if (icon && HOME_APP_NAMES.indexOf(name) >= 0) setAppIconVisual(icon, name, a.iconData[name] || '');
  });
}


function renderHomeIconLibrary(){
  var host = $('iconLibrary');
  if (!host) return;
  var a = normalizeHomeAppearance();
  host.innerHTML = '';
  HOME_APP_NAMES.forEach(function(name){
    var item = document.createElement('div');
    item.className = 'icon-library-item';
    item.setAttribute('data-icon-editor', name);
    var preview = document.createElement('div');
    preview.className = 'app-icon icon-library-preview';
    setAppIconVisual(preview, name, a.iconData[name] || '');
    var label = document.createElement('div');
    label.className = 'icon-library-name';
    label.textContent = name;
    var actions = document.createElement('div');
    actions.className = 'icon-library-actions';
    var upload = document.createElement('button');
    upload.className = 'icon-library-btn';
    upload.type = 'button';
    upload.setAttribute('data-icon-upload', name);
    upload.textContent = '选择';
    var clear = document.createElement('button');
    clear.className = 'icon-library-btn';
    clear.type = 'button';
    clear.setAttribute('data-icon-clear', name);
    clear.textContent = '移除';
    clear.hidden = !a.iconData[name];
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.setAttribute('data-icon-input', name);
    actions.appendChild(upload);
    actions.appendChild(clear);
    item.appendChild(preview);
    item.appendChild(label);
    item.appendChild(actions);
    item.appendChild(input);
    host.appendChild(item);
  });
}


function handleHomeAppIconFile(appName, file){
  if (HOME_APP_NAMES.indexOf(appName) < 0 || !file) return;
  if (!/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('图片不能超过 8MB'); return; }
  var reader = new FileReader();
  reader.onload = function(){
    var data = String(reader.result || '');
    if (!data) return;
    var a = normalizeHomeAppearance();
    a.iconData[appName] = data;
    applyHomeAppearance();
    saveSettings();
    toast('已更换' + appName + '图标');
  };
  reader.onerror = function(){ toast('读取图片失败'); };
  reader.readAsDataURL(file);
}


function clearHomeAppIcon(appName){
  var a = normalizeHomeAppearance();
  if (!a.iconData[appName]) return;
  delete a.iconData[appName];
  applyHomeAppearance();
  saveSettings();
  toast('已恢复' + appName + '默认图标');
}


function applyHomeAppearance(){
  var a = normalizeHomeAppearance();
  var home = $('home');
  var wallpaper = document.querySelector('.wallpaper');
  if (home) {
    home.setAttribute('data-icon-theme', a.iconTheme);
    home.setAttribute('data-icon-size', a.iconSize);
    home.setAttribute('data-icon-labels', a.iconLabels ? 'on' : 'off');
    home.style.setProperty('--dark-icon-brightness', String(1 - a.dimDarkIconAmount / 100));
    home.setAttribute('data-dim-dark-wallpaper', a.dimDarkWallpaper ? 'on' : 'off');
    home.setAttribute('data-widget-calendar', a.widgets.calendar && a.widgets.calendar.enabled ? 'on' : 'off');
    home.setAttribute('data-widget-music', a.widgets.music && a.widgets.music.enabled ? 'on' : 'off');
    home.setAttribute('data-widget-polaroid', a.widgets.polaroid && a.widgets.polaroid.enabled ? 'on' : 'off');
  }
  var dock = document.querySelector('.dock');
  if (dock) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var baseAlpha = dark ? 0.045 : 0.66;
    var effectiveAlpha = baseAlpha * (1 - a.dockTransparency / 100);
    dock.style.setProperty('--dock-radius', a.dockRadius + 'px');
    dock.style.setProperty('--dock-effective-alpha', String(Math.max(0, Math.min(1, effectiveAlpha))));
  }
  applyHomeGlassVars(a);
  renderHomeAppIcons();
  renderCalendarPhoto();
  renderMusicCover();
  renderPolaroidPhoto();
  syncHomeGridRows();
  if (wallpaper) {
    wallpaper.setAttribute('data-wallpaper', a.wallpaper);
    wallpaper.setAttribute('data-dim-dark', a.dimDarkWallpaper ? 'on' : 'off');
    wallpaper.style.setProperty('--dark-wallpaper-brightness', String(1 - a.dimDarkWallpaperAmount / 100));
    wallpaper.classList.toggle('is-custom', !!a.wallpaperData);
    if (a.wallpaperData) wallpaper.style.backgroundImage = 'url(\"' + a.wallpaperData + '\")';
    else wallpaper.style.backgroundImage = '';
  }
  renderHomeAppearanceOptions();
}


function renderHomeAppearanceOptions(){
  var a = normalizeHomeAppearance();
  $$('[data-home-icon-theme]').forEach(function(btn){
    var on = btn.dataset.homeIconTheme === a.iconTheme;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  renderHomeSliders(a);
  var dimWallpaper = $('dimDarkWallpaperToggle');
  if (dimWallpaper) { dimWallpaper.classList.toggle('is-on', a.dimDarkWallpaper); dimWallpaper.setAttribute('aria-checked', a.dimDarkWallpaper ? 'true' : 'false'); }
  $$('[data-home-icon-size]').forEach(function(btn){
    var on = btn.dataset.homeIconSize === a.iconSize;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  var labels = $('homeIconLabelsToggle');
  if (labels) {
    labels.classList.toggle('is-on', a.iconLabels);
    labels.setAttribute('aria-checked', a.iconLabels ? 'true' : 'false');
  }
  var dimWallpaperAmount = $('dimDarkWallpaperAmount');
  var dimIconAmount = $('dimDarkIconAmount');
  if (dimWallpaperAmount) { dimWallpaperAmount.value = String(a.dimDarkWallpaperAmount); dimWallpaperAmount.disabled = a.dimDarkWallpaperLocked; dimWallpaperAmount.style.setProperty('--range-pct', a.dimDarkWallpaperAmount + '%'); }
  if (dimIconAmount) { dimIconAmount.value = String(a.dimDarkIconAmount); dimIconAmount.disabled = a.dimDarkIconLocked; dimIconAmount.style.setProperty('--range-pct', a.dimDarkIconAmount + '%'); }
  var dockRadiusRange = $('dockRadiusRange');
  var dockTransparencyRange = $('dockTransparencyRange');
  var dockRadiusValue = $('dockRadiusValue');
  var dockTransparencyValue = $('dockTransparencyValue');
  if (dockRadiusRange) { dockRadiusRange.value = String(a.dockRadius); dockRadiusRange.disabled = a.dockRadiusLocked; dockRadiusRange.style.setProperty('--dock-range-pct', (a.dockRadius / 40 * 100) + '%'); }
  if (dockTransparencyRange) { dockTransparencyRange.value = String(a.dockTransparency); dockTransparencyRange.disabled = a.dockTransparencyLocked; dockTransparencyRange.style.setProperty('--dock-range-pct', a.dockTransparency + '%'); }
  if (dockRadiusValue) dockRadiusValue.textContent = String(a.dockRadius) + 'px';
  if (dockTransparencyValue) dockTransparencyValue.textContent = String(a.dockTransparency) + '%';
  var dockRadiusLock = $('dockRadiusLock');
  var dockTransparencyLock = $('dockTransparencyLock');
  if (dockRadiusLock) { dockRadiusLock.classList.toggle('is-on', a.dockRadiusLocked); dockRadiusLock.setAttribute('aria-pressed', a.dockRadiusLocked ? 'true' : 'false'); dockRadiusLock.textContent = a.dockRadiusLocked ? '已锁定' : '锁定'; }
  if (dockTransparencyLock) { dockTransparencyLock.classList.toggle('is-on', a.dockTransparencyLocked); dockTransparencyLock.setAttribute('aria-pressed', a.dockTransparencyLocked ? 'true' : 'false'); dockTransparencyLock.textContent = a.dockTransparencyLocked ? '已锁定' : '锁定'; }
  var dimWallpaperAmountValue = $('dimDarkWallpaperAmountValue');
  var dimIconAmountValue = $('dimDarkIconAmountValue');
  if (dimWallpaperAmountValue) dimWallpaperAmountValue.textContent = String(a.dimDarkWallpaperAmount) + '%';
  if (dimIconAmountValue) dimIconAmountValue.textContent = String(a.dimDarkIconAmount) + '%';
  var dimWallpaperLock = $('dimDarkWallpaperLock');
  var dimIconLock = $('dimDarkIconLock');
  if (dimWallpaperLock) { dimWallpaperLock.classList.toggle('is-on', a.dimDarkWallpaperLocked); dimWallpaperLock.setAttribute('aria-pressed', a.dimDarkWallpaperLocked ? 'true' : 'false'); dimWallpaperLock.textContent = a.dimDarkWallpaperLocked ? '已锁定' : '锁定'; }
  if (dimIconLock) { dimIconLock.classList.toggle('is-on', a.dimDarkIconLocked); dimIconLock.setAttribute('aria-pressed', a.dimDarkIconLocked ? 'true' : 'false'); dimIconLock.textContent = a.dimDarkIconLocked ? '已锁定' : '锁定'; }
  var wallpaperState = $('wallpaperState');
  if (wallpaperState) wallpaperState.textContent = a.wallpaperData ? '已使用本地图片' : '未选择本地图片';
  $$('.widget-card').forEach(function(card){
    var key = card.dataset.widgetCard;
    var cfg = a.widgets[key] || {enabled:false,size:'medium'};
    card.classList.toggle('is-on', cfg.enabled);
    card.querySelectorAll('[data-widget-size]').forEach(function(btn){
      var on = btn.dataset.widgetSize === cfg.size;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  });
  renderHomeIconLibrary();
}


function setHomeIconOption(kind, value){
  var a = normalizeHomeAppearance();
  if (kind === 'theme' && ['mono','glass','borderless'].indexOf(value) >= 0) { a.iconTheme = value; if (value === 'borderless') a.iconBorder = 'none'; }
  if (kind === 'size' && ['small','medium','large'].indexOf(value) >= 0) a.iconSize = value;
  applyHomeAppearance();
  saveSettings();
}


function setDockSetting(kind, value){
  var a = State.settings && State.settings.homeAppearance;
  if (!a) return;
  var n = Number(value);
  if (!Number.isFinite(n)) return;
  if (kind === 'radius') { if (a.dockRadiusLocked) return; a.dockRadius = Math.max(0, Math.min(40, Math.round(n))); }
  if (kind === 'transparency') { if (a.dockTransparencyLocked) return; a.dockTransparency = Math.max(0, Math.min(100, Math.round(n))); }
  var dock = document.querySelector('.dock');
  var range = kind === 'radius' ? $('dockRadiusRange') : $('dockTransparencyRange');
  var valueEl = kind === 'radius' ? $('dockRadiusValue') : $('dockTransparencyValue');
  if (range) range.style.setProperty('--dock-range-pct', kind === 'radius' ? (a.dockRadius / 40 * 100) + '%' : a.dockTransparency + '%');
  if (valueEl) valueEl.textContent = kind === 'radius' ? String(a.dockRadius) + 'px' : String(a.dockTransparency) + '%';
  if (dock) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var baseAlpha = dark ? 0.045 : 0.66;
    var effectiveAlpha = baseAlpha * (1 - a.dockTransparency / 100);
    dock.style.setProperty('--dock-radius', a.dockRadius + 'px');
    dock.style.setProperty('--dock-effective-alpha', String(Math.max(0, Math.min(1, effectiveAlpha))));
  }
  scheduleSettingsSave(120);
}


function setDockLock(kind, on){
  var a = normalizeHomeAppearance();
  if (kind === 'radius') a.dockRadiusLocked = !!on;
  if (kind === 'transparency') a.dockTransparencyLocked = !!on;
  applyHomeAppearance();
  saveSettings();
}


/* ---------- 拉条自定义调节（图标圆角 / 液态玻璃磨砂与清透 / Dock 模糊度）----------
 * 每条拉条都带「锁定」：锁定后拉条置灰、数值不可再改，设置会随外观一起保存。 */
var HOME_SLIDERS = {
  iconRadius:  { lockKey: 'iconRadiusLocked',  min: 0, max: 50,  unit: '%' },
  iconBlur:    { lockKey: 'iconBlurLocked',    min: 0, max: 30,  unit: 'px' },
  iconClarity: { lockKey: 'iconClarityLocked', min: 0, max: 100, unit: '%' },
  glyphBlur:   { lockKey: 'glyphBlurLocked',   min: 0, max: 20,  unit: 'px' },
  glyphClarity:{ lockKey: 'glyphClarityLocked',min: 0, max: 100, unit: '%' },
  dockBlur:    { lockKey: 'dockBlurLocked',    min: 0, max: 60,  unit: 'px' }
};

/* 写入全局 CSS 变量：桌面、Dock 与设置里的图标预览共用同一组参数。
 * 清透度 0→100：底板填充从 2 倍（偏奶白）渐变到 0（完全通透），50 为原有观感。 */
function applyHomeGlassVars(a){
  var st = document.documentElement.style;
  st.setProperty('--icon-radius', a.iconRadius + '%');
  st.setProperty('--lq-blur', a.iconBlur + 'px');
  st.setProperty('--lq-fill', String(Math.max(0, 2 * (1 - a.iconClarity / 100))));
  st.setProperty('--lq-gblur', a.glyphBlur + 'px');
  /* 符号清晰度 0→100：符号本体填充 .12→.92，越高越实、越清楚；越低越像透明玻璃 */
  st.setProperty('--lq-gfill', String(.12 + .8 * a.glyphClarity / 100));
  st.setProperty('--lq-gedge', String(.30 + .45 * a.glyphClarity / 100));
  st.setProperty('--dock-blur', a.dockBlur + 'px');
}

function paintHomeSlider(name, a){
  var d = HOME_SLIDERS[name];
  var range = $(name + 'Range'), valueEl = $(name + 'Value'), lock = $(name + 'Lock');
  var v = a[name], locked = a[d.lockKey] === true;
  if (range) {
    range.value = String(v);
    range.disabled = locked;
    range.style.setProperty('--dock-range-pct', ((v - d.min) / (d.max - d.min) * 100) + '%');
  }
  if (valueEl) valueEl.textContent = String(v) + d.unit;
  if (lock) {
    lock.classList.toggle('is-on', locked);
    lock.setAttribute('aria-pressed', locked ? 'true' : 'false');
    lock.textContent = locked ? '已锁定' : '锁定';
  }
}

function renderHomeSliders(a){
  Object.keys(HOME_SLIDERS).forEach(function(name){ paintHomeSlider(name, a); });
}

function setHomeSlider(name, value){
  var d = HOME_SLIDERS[name];
  var a = State.settings && State.settings.homeAppearance;
  if (!d || !a || a[d.lockKey] === true) return;
  var n = Number(value);
  if (!Number.isFinite(n)) return;
  a[name] = Math.max(d.min, Math.min(d.max, Math.round(n)));
  paintHomeSlider(name, a);
  applyHomeGlassVars(a);
  scheduleSettingsSave(120);
}

function setHomeSliderLock(name, on){
  var d = HOME_SLIDERS[name];
  if (!d) return;
  var a = normalizeHomeAppearance();
  a[d.lockKey] = !!on;
  paintHomeSlider(name, a);
  saveSettings();
}

function bindHomeSliders(){
  Object.keys(HOME_SLIDERS).forEach(function(name){
    var range = $(name + 'Range');
    if (range) {
      range.addEventListener('input', function(){ setHomeSlider(name, range.value); });
      range.addEventListener('change', function(){ saveSettings(); });
    }
    var lock = $(name + 'Lock');
    if (lock) lock.addEventListener('click', function(){
      setHomeSliderLock(name, !normalizeHomeAppearance()[HOME_SLIDERS[name].lockKey]);
    });
  });
}


function setDimDarkAmount(kind, value){
  var a = State.settings && State.settings.homeAppearance;
  if (!a) return;
  var n = Math.max(0, Math.min(100, Number(value) || 0));
  var home = $('home');
  var wallpaper = document.querySelector('.wallpaper');
  var range = kind === 'wallpaper' ? $('dimDarkWallpaperAmount') : $('dimDarkIconAmount');
  var valueEl = kind === 'wallpaper' ? $('dimDarkWallpaperAmountValue') : $('dimDarkIconAmountValue');
  if (kind === 'wallpaper') {
    if (a.dimDarkWallpaperLocked) return;
    a.dimDarkWallpaperAmount = n;
    if (wallpaper) wallpaper.style.setProperty('--dark-wallpaper-brightness', String(1 - n / 100));
  }
  if (kind === 'icon') {
    if (a.dimDarkIconLocked) return;
    a.dimDarkIconAmount = n;
    if (home) home.style.setProperty('--dark-icon-brightness', String(1 - n / 100));
  }
  if (range) range.style.setProperty('--range-pct', n + '%');
  if (valueEl) valueEl.textContent = String(n) + '%';
  scheduleSettingsSave(120);
}


function setDimDarkLock(kind, on){
  var a = normalizeHomeAppearance();
  if (kind === 'wallpaper') a.dimDarkWallpaperLocked = !!on;
  if (kind === 'icon') a.dimDarkIconLocked = !!on;
  applyHomeAppearance();
  saveSettings();
}


function setDimDarkWallpaper(on){
  var a = normalizeHomeAppearance();
  a.dimDarkWallpaper = !!on;
  applyHomeAppearance();
  saveSettings();
}


function setHomeIconLabels(on){
  var a = normalizeHomeAppearance();
  a.iconLabels = !!on;
  applyHomeAppearance();
  saveSettings();
}


function setWidgetEnabled(key, on){
  var a = normalizeHomeAppearance();
  if (!a.widgets[key]) return;
  a.widgets[key].enabled = !!on;
  applyHomeAppearance();
  saveSettings();
}


function setWidgetSize(key, size){
  var a = normalizeHomeAppearance();
  if (!a.widgets[key] || ['small','medium','large'].indexOf(size) < 0) return;
  a.widgets[key].size = size;
  applyHomeAppearance();
  saveSettings();
}


function handleWallpaperFile(file){
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
  if (file.size > 8 * 1024 * 1024) { toast('图片不能超过 8MB'); return; }
  var reader = new FileReader();
  reader.onload = function(){
    var a = normalizeHomeAppearance();
    a.wallpaperData = String(reader.result || '');
    if (!a.wallpaperData) return;
    applyHomeAppearance();
    saveSettings();
    toast('已应用自定义壁纸');
  };
  reader.onerror = function(){ toast('读取图片失败'); };
  reader.readAsDataURL(file);
}


function applyChatAppearance(){
  var pref = (State.settings && State.settings.chatAppearance) || 'mono';
  if (pref !== 'mono' && pref !== 'soft') pref = 'mono';
  if (State.settings) State.settings.chatAppearance = pref;
  if (chatApp) chatApp.setAttribute('data-chat-appearance', pref);
  renderChatAppearanceOptions();
}


function renderChatAppearanceOptions(){
  var pref = (State.settings && State.settings.chatAppearance) || 'mono';
  $$('.chat-theme-option').forEach(function(el){ var on = el.dataset.chatAppearanceChoice === pref; el.classList.toggle('is-on', on); el.setAttribute('aria-checked', on ? 'true' : 'false'); });
  var state = $('chatAppearanceState');
  if (state) state.textContent = pref === 'soft' ? '柔和' : 'Mono';
}


function setChatAppearance(pref){
  if (pref !== 'mono' && pref !== 'soft') pref = 'mono';
  State.settings.chatAppearance = pref;
  applyChatAppearance();
  saveSettings();
  toast(pref === 'soft' ? '聊天外观：柔和' : '聊天外观：Mono');
}


function openChatAppearance(){
  var view = $('chatAppearanceView');
  if (!view) return;
  applyChatAppearance();
  view.classList.add('is-open');
  view.setAttribute('aria-hidden', 'false');
}


function closeChatAppearance(){
  var view = $('chatAppearanceView');
  if (!view) return;
  view.classList.remove('is-open');
  view.setAttribute('aria-hidden', 'true');
}


function applyThemePreference(){
  var pref = (State.settings && State.settings.theme) || 'system';
  var actual = pref === 'system' ? getSystemTheme() : (pref === 'dark' ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', actual);
  document.documentElement.style.colorScheme = actual;
  var meta = $('themeColorMeta');
  if (meta) meta.setAttribute('content', actual === 'dark' ? '#000000' : '#f3f3f3');
  var appleStyle = actual === 'dark' ? 'black-translucent' : 'default';
  var appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (appleMeta) appleMeta.setAttribute('content', appleStyle);
  renderThemeOptions();
  applyHomeAppearance();
  if (document.documentElement.classList.contains('pm-open')) requestAnimationFrame(syncPMChrome);
}


function renderThemeOptions(){
  var pref = (State.settings && State.settings.theme) || 'system';
  $$('#themeMenu .theme-option').forEach(function(el){ var on = el.dataset.themeChoice === pref; el.classList.toggle('is-on', on); el.setAttribute('aria-checked', on ? 'true' : 'false'); });
  var stateText = pref === 'system' ? '跟随系统' : (pref === 'dark' ? '夜间' : '日间');
  $$('.theme-state').forEach(function(state){ state.textContent = stateText; });
}


function setThemePreference(pref){
  if (pref !== 'system' && pref !== 'light' && pref !== 'dark') pref = 'system';
  State.settings.theme = pref;
  applyThemePreference();
  saveSettings();
  toast(pref === 'system' ? '已跟随系统' : (pref === 'dark' ? '已切换到夜间' : '已切换到日间'));
}

function bindHomeThemeEvents(){
  tick();
  applyThemePreference();
  setInterval(tick, 1000);
  var mediaTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (mediaTheme) {
    var handleSystemTheme = function(){ if ((State.settings && State.settings.theme) === 'system') applyThemePreference(); };
    if (mediaTheme.addEventListener) mediaTheme.addEventListener('change', handleSystemTheme);
    else if (mediaTheme.addListener) mediaTheme.addListener(handleSystemTheme);
  }
}

function bindHomeVisibilityEvents(){
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) { tick(); handleNotificationDeepLink(); } else { runProactiveMessage(false); } });
}

function bindHomeAppClickEvents(){

  $$('.home .app').forEach(function(btn){
    btn.addEventListener('click', function(){
      var name = btn.getAttribute('data-app');
      var openApp = APP_REGISTRY[name];
      if (typeof openApp === 'function') { openApp(); return; }
      toast(name + ' · 开发中');
    });
  });
}
