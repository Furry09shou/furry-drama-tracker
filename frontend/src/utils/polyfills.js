// 轻量级 polyfill：仅补齐目标浏览器可能缺失的 ES2019-ES2020 API
// 目标：Safari 13+, Chrome 80+, Firefox 80+

// Object.fromEntries (ES2019, Safari 12.1+)
if (!Object.fromEntries) {
  Object.fromEntries = function (iterable) {
    const obj = {};
    for (const [key, value] of iterable) {
      obj[key] = value;
    }
    return obj;
  };
}

// Promise.allSettled (ES2020, Safari 13+)
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      Array.from(promises).map(function (p) {
        return Promise.resolve(p).then(
          function (value) { return { status: 'fulfilled', value: value }; },
          function (reason) { return { status: 'rejected', reason: reason }; }
        );
      })
    );
  };
}

// Array.prototype.flat (ES2019, Safari 12+)
if (!Array.prototype.flat) {
  Array.prototype.flat = function (depth) {
    depth = depth === undefined ? 1 : Math.floor(depth);
    if (depth < 1) return Array.prototype.slice.call(this);
    return (function flat(arr, depth) {
      const result = [];
      for (const el of arr) {
        if (Array.isArray(el) && depth > 0) {
          result.push.apply(result, flat(el, depth - 1));
        } else {
          result.push(el);
        }
      }
      return result;
    })(this, depth);
  };
}

// Array.prototype.flatMap (ES2019, Safari 12+)
if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function (callback, thisArg) {
    return Array.prototype.map.call(this, callback, thisArg).flat(1);
  };
}

// String.prototype.matchAll (ES2020, Safari 13+)
if (!String.prototype.matchAll) {
  String.prototype.matchAll = function (regexp) {
    const matches = [];
    const str = String(this);
    if (regexp.flags.indexOf('g') === -1) {
      regexp = new RegExp(regexp.source, regexp.flags + 'g');
    }
    let match;
    while ((match = regexp.exec(str)) !== null) {
      matches.push(match);
    }
    return matches;
  };
}

// globalThis (ES2020, Safari 12.1+)
if (typeof globalThis === 'undefined') {
  (function () {
    if (typeof self !== 'undefined') { self.globalThis = self; }
    else if (typeof window !== 'undefined') { window.globalThis = window; }
    else if (typeof global !== 'undefined') { global.globalThis = global; }
  })();
}
