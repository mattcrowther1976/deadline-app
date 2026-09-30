/* DEADLINE prototype runtime: renders the .dc.html screens as a normal web app. */
(function () {
  'use strict';
  var h = React.createElement;

  var SCREENS = ['Splash', 'Main', 'Spot', 'SpotShot', 'Create', 'SpotResult', 'Collection', 'Library', 'Editor',
    'Search', 'FunFacts', 'FunFactsBrand', 'Leaderboard', 'Profile', 'ProfileTop', 'Game', 'TabBar', 'Credits', 'Brand'];
  var START = 'Splash';

  var BLOBS = {
    d0ed9a1124b4be55c66020506d0952f5: 'revuelto.jpg', '4c34a39ed7fc32822ce83f9e01f8d264': 'sf90.jpg',
    '7a1f38e951343777cdb82e6e2ecdffc1': 'mclaren750s.jpg', '009516d94a7dcf61f3cbf171fac4271c': 'gt3rs.jpg',
    '70522fdf14052f038999461a17d193a4': 'vanquish.jpg', '5eba6dd7905427a06a5aaf5e5596baa3': 'chiron.jpg',
    '2b515c1c0ccd806f36f7a565eebcd2f1': 'f-enzo.jpg', f0cdd6aa81e90891d57b9f34356998b9: 'f-ferruccio.jpg',
    b0851d7e4a5f981ab7197b46f3fbbf07: 'f-bruce.jpg', '3ed3859dfe21811492b52af8932e94ae': 'f-porsche.jpg',
    '1b49ab55cc399a57e410ea09add677a1': 'f-ettore.jpg', '92908434f675466f9e68de61fbb6548a': 'f-lionel.jpg',
    b7da6155bc525d2a1dc6454f200288cf: 'f-pagani.jpg', '856517ec16a0e2eecb8b7410a5ed391a': 'f-koenigsegg.jpg',
    c06ba32373c6de36ce83b03a0b5cc11d: 'l-factory.jpg', f9107fc93b9c02d328fb8f209d7a4ce5: 'l-350gt.jpg',
    '947a2eb1bb66469c204907dc0bb98cb4': 'l-temerario.jpg', '9dbbeba5d81149470d9676e83aa30a71': 'l-lm002.jpg',
    '0d3e7734322ba4baf3dcac565aa12567': 'l-urraco.jpg', dd8cb464fcf0c515982517d0659302ad: 'l-urus.jpg'
  };
  function fixUrl(v) {
    if (typeof v !== 'string') return v;
    var m = v.match(/^\/_blob\/([0-9a-f]{32})/);
    return m && BLOBS[m[1]] ? 'assets/' + BLOBS[m[1]] : v;
  }

  /* ---------- attribute and event name mapping ---------- */
  var EVENTS = ['onClick', 'onChange', 'onInput', 'onKeyDown', 'onKeyUp', 'onPointerDown', 'onPointerUp', 'onPointerLeave',
    'onPointerCancel', 'onPointerMove', 'onContextMenu', 'onFocus', 'onBlur', 'onMouseEnter', 'onMouseLeave', 'onSubmit'];
  var ATTRS = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', maxlength: 'maxLength', autoplay: 'autoPlay',
    playsinline: 'playsInline', readonly: 'readOnly', autofocus: 'autoFocus', colspan: 'colSpan', rowspan: 'rowSpan',
    crossorigin: 'crossOrigin', srcset: 'srcSet', 'xlink:href': 'xlinkHref' };
  EVENTS.forEach(function (e) { ATTRS[e.toLowerCase()] = e; });
  function propName(name) {
    if (ATTRS[name]) return ATTRS[name];
    if (/^(aria|data)-/.test(name)) return name;
    if (name.indexOf('-') > 0) return name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    return name;
  }
  function styleObj(str) {
    var o = {};
    String(str).split(';').forEach(function (decl) {
      var i = decl.indexOf(':');
      if (i < 0) return;
      var k = decl.slice(0, i).trim(), v = decl.slice(i + 1).trim();
      if (!k || v === '') return;
      if (k.indexOf('--') !== 0) k = k.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      o[k] = v;
    });
    return o;
  }

  /* ---------- holes ---------- */
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var ANY = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(path, vals, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (path === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var cur, found = false;
    for (var i = scope.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(scope[i], parts[0])) { cur = scope[i][parts[0]]; found = true; break; }
    }
    if (!found) cur = vals ? vals[parts[0]] : undefined;
    for (var j = 1; j < parts.length; j++) { if (cur == null) return undefined; cur = cur[parts[j]]; }
    return cur;
  }
  function value(raw, vals, scope) {
    var m = raw.match(WHOLE);
    if (m) return lookup(m[1], vals, scope);
    if (raw.indexOf('{{') < 0) return raw;
    return raw.replace(ANY, function (_, p) { var v = lookup(p, vals, scope); return v == null ? '' : String(v); });
  }

  /* ---------- template compile ---------- */
  function compile(node) {
    if (node.nodeType === 3) return { t: 'text', v: node.nodeValue };
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    var attrs = [];
    for (var i = 0; i < node.attributes.length; i++) attrs.push([node.attributes[i].name, node.attributes[i].value]);
    var kids = [];
    for (var c = node.firstChild; c; c = c.nextSibling) { var k = compile(c); if (k) kids.push(k); }
    return { t: 'el', tag: tag, attrs: attrs, kids: kids };
  }
  function attrMap(n) { var o = {}; n.attrs.forEach(function (a) { o[a[0]] = a[1]; }); return o; }

  /* ---------- render ---------- */
  function renderKids(kids, vals, scope, app, keyBase) {
    var out = [];
    kids.forEach(function (k, i) {
      var r = renderNode(k, vals, scope, app, keyBase + '.' + i);
      if (Array.isArray(r)) out.push.apply(out, r); else if (r != null) out.push(r);
    });
    return out;
  }
  function renderNode(n, vals, scope, app, key) {
    if (n.t === 'text') {
      if (n.v.indexOf('{{') < 0) return n.v;
      return value(n.v, vals, scope);
    }
    var tag = n.tag;
    if (tag === 'helmet' || tag === 'script') return null;
    if (tag === 'x-dc') return renderKids(n.kids, vals, scope, app, key);
    if (tag === 'sc-if') {
      var a = attrMap(n);
      return value(a.value || '', vals, scope) ? h(React.Fragment, { key: key }, renderKids(n.kids, vals, scope, app, key)) : null;
    }
    if (tag === 'sc-for') {
      var fa = attrMap(n);
      var list = value(fa.list || '', vals, scope) || [];
      var as = fa.as || 'item';
      return h(React.Fragment, { key: key }, list.map(function (item, idx) {
        var s = {}; s[as] = item; s.$index = idx;
        return h(React.Fragment, { key: idx }, renderKids(n.kids, vals, scope.concat([s]), app, key + '_' + idx));
      }));
    }
    if (tag === 'dc-import') {
      var props = { key: key };
      var name;
      n.attrs.forEach(function (at) {
        if (at[0] === 'name') { name = at[1]; return; }
        if (at[0].indexOf('hint-') === 0) return;
        props[at[0].replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = value(at[1], vals, scope);
      });
      var Child = app.component(name);
      return Child ? h(Child, props) : null;
    }
    var p = { key: key };
    var isTextarea = tag === 'textarea';
    n.attrs.forEach(function (at) {
      var nm = at[0], raw = at[1];
      if (nm.indexOf('hint-') === 0 || nm === 'data-dc-script' || nm === 'data-props') return;
      var v = value(raw, vals, scope);
      if (nm === 'style') { p.style = styleObj(v); return; }
      if (nm === 'src' || nm === 'poster') v = fixUrl(v);
      var pn = propName(nm);
      if (v === undefined) return;
      p[pn] = v;
    });
    if (tag === 'a' && typeof p.href === 'string') {
      var href = p.href;
      var target = href.match(/^\/?([A-Za-z0-9_-]+)\.dc\.html$/);
      var userClick = p.onClick;
      if (target) {
        p.href = '#/' + target[1];
        p.onClick = function (e) { if (userClick) userClick(e); e.preventDefault(); app.go(target[1]); };
      } else if (href === '#') {
        p.onClick = function (e) { if (userClick) userClick(e); e.preventDefault(); };
      } else if (/^https?:/.test(href)) {
        p.target = '_blank'; p.rel = 'noopener noreferrer';
      }
    }
    var kids = renderKids(n.kids, vals, scope, app, key);
    if (isTextarea) {
      if (p.value === undefined) p.defaultValue = kids.join('');
      kids = [];
    }
    if (tag === 'input' || tag === 'img' || tag === 'br' || tag === 'hr') return h(tag, p);
    return h.apply(null, [tag, p].concat(kids));
  }

  /* ---------- screens ---------- */
  var loadedCss = {};
  function injectHelmet(helmet) {
    if (!helmet) return;
    Array.prototype.forEach.call(helmet.children, function (el) {
      var sig = el.outerHTML;
      if (loadedCss[sig]) return;
      loadedCss[sig] = true;
      var clone = document.createElement(el.localName);
      Array.prototype.forEach.call(el.attributes, function (a) { clone.setAttribute(a.name, a.value); });
      clone.textContent = el.textContent;
      document.head.appendChild(clone);
    });
  }
  function buildScreen(name, html, app) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var xdc = doc.querySelector('x-dc');
    injectHelmet(xdc && xdc.querySelector('helmet'));
    var tree = compile(xdc);
    var scriptEl = doc.querySelector('script[data-dc-script]');
    var code = scriptEl ? scriptEl.textContent : 'class Component extends DCLogic { renderVals() { return {}; } }';
    var DCLogic = function (props) { React.Component.call(this, props); };
    DCLogic.prototype = Object.create(React.Component.prototype);
    DCLogic.prototype.constructor = DCLogic;
    DCLogic.prototype.render = function () {
      var vals = this.renderVals ? this.renderVals() : {};
      var out = renderNode(tree, vals, [], app, name);
      return h(React.Fragment, null, out);
    };
    var Comp = new Function('DCLogic', 'React', code + '\n;return Component;')(DCLogic, React);
    Comp.displayName = name;
    return Comp;
  }

  /* ---------- app shell ---------- */
  function App() {
    var initial = (location.hash.match(/^#\/([A-Za-z0-9_-]+)$/) || [])[1];
    var st = React.useState(SCREENS.indexOf(initial) >= 0 ? initial : START);
    var screen = st[0], setScreen = st[1];
    var nonce = React.useState(0);
    React.useEffect(function () {
      function onHash() {
        var m = (location.hash.match(/^#\/([A-Za-z0-9_-]+)$/) || [])[1];
        if (m && m !== screen && SCREENS.indexOf(m) >= 0) setScreen(m);
      }
      window.addEventListener('hashchange', onHash);
      return function () { window.removeEventListener('hashchange', onHash); };
    }, [screen]);
    window.__deadlineGo = function (name) {
      if (SCREENS.indexOf(name) < 0) return;
      if (location.hash !== '#/' + name) history.pushState(null, '', '#/' + name);
      setScreen(name);
      nonce[1](function (x) { return x + 1; });
    };
    var Comp = app.component(screen);
    return h(Comp, { key: screen + ':' + nonce[0] });
  }

  var app = {
    comps: {},
    component: function (name) { return this.comps[name]; },
    go: function (name) { window.__deadlineGo(name); }
  };

  function fit() {
    var stage = document.getElementById('stage');
    var frame = document.getElementById('frame');
    var small = window.innerWidth < 520;
    document.body.classList.toggle('mobile', small);
    var pad = small ? 0 : 48;
    var availW = window.innerWidth - pad, availH = window.innerHeight - pad - (small ? 0 : 40);
    var s = Math.min(availW / 390, availH / 844);
    if (!small) s = Math.min(s, 1.05);
    frame.style.transform = 'scale(' + s + ')';
    stage.style.width = Math.round(390 * s) + 'px';
    stage.style.height = Math.round(844 * s) + 'px';
  }

  Promise.all(SCREENS.map(function (n) {
    return fetch('screens/' + n + '.dc.html').then(function (r) { return r.text(); }).then(function (t) { return [n, t]; });
  })).then(function (list) {
    list.forEach(function (pair) { app.comps[pair[0]] = buildScreen(pair[0], pair[1], app); });
    fit();
    window.addEventListener('resize', fit);
    ReactDOM.createRoot(document.getElementById('frame')).render(h(App));
    var l = document.getElementById('loading'); if (l) l.remove();
  }).catch(function (err) {
    var l = document.getElementById('loading');
    if (l) l.textContent = 'Could not load the prototype: ' + err.message;
  });
})();
