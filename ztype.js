// Built with IMPACT - impactjs.org
(function (window) {
    "use strict";
    Number.prototype.map = function (istart, istop, ostart, ostop) {
        return ostart + (ostop - ostart) * ((this - istart) / (istop - istart));
    };
    Number.prototype.limit = function (min, max) {
        return Math.min(max, Math.max(min, this));
    };
    Number.prototype.round = function (precision) {
        precision = Math.pow(10, precision || 0);
        return Math.round(this * precision) / precision;
    };
    Number.prototype.floor = function () {
        return Math.floor(this);
    };
    Number.prototype.ceil = function () {
        return Math.ceil(this);
    };
    Number.prototype.toInt = function () {
        return (this | 0);
    };
    Number.prototype.toRad = function () {
        return (this / 180) * Math.PI;
    };
    Number.prototype.toDeg = function () {
        return (this * 180) / Math.PI;
    };
    Array.prototype.erase = function (item) {
        for (var i = this.length; i--;) {
            if (this[i] === item) {
                this.splice(i, 1);
            }
        }
        return this;
    };
    Array.prototype.random = function () {
        return this[Math.floor(Math.random() * this.length)];
    };
    Function.prototype.bind = Function.prototype.bind || function (oThis) {
        if (typeof this !== "function") {
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }
        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
                return fToBind.apply((this instanceof fNOP && oThis ? this : oThis), aArgs.concat(Array.prototype.slice.call(arguments)));
            };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
    window.ig = {
        game: null,
        debug: null,
        version: '1.23',
        global: window,
        modules: {},
        resources: [],
        ready: false,
        baked: false,
        nocache: '',
        ua: {},
        prefix: (window.ImpactPrefix || ''),
        lib: 'lib/',
        _current: null,
        _loadQueue: [],
        _waitForOnload: 0,
        $: function (selector) {
            return selector.charAt(0) == '#' ? document.getElementById(selector.substr(1)) : document.getElementsByTagName(selector);
        },
        $new: function (name) {
            return document.createElement(name);
        },
        copy: function (object) {
            if (!object || typeof (object) != 'object' || object instanceof HTMLElement || object instanceof ig.Class) {
                return object;
            } else if (object instanceof Array) {
                var c = [];
                for (var i = 0, l = object.length; i < l; i++) {
                    c[i] = ig.copy(object[i]);
                }
                return c;
            } else {
                var c = {};
                for (var i in object) {
                    c[i] = ig.copy(object[i]);
                }
                return c;
            }
        },
        merge: function (original, extended) {
            for (var key in extended) {
                var ext = extended[key];
                if (typeof (ext) != 'object' || ext instanceof HTMLElement || ext instanceof ig.Class || ext === null) {
                    original[key] = ext;
                } else {
                    if (!original[key] || typeof (original[key]) != 'object') {
                        original[key] = (ext instanceof Array) ? [] : {};
                    }
                    ig.merge(original[key], ext);
                }
            }
            return original;
        },
        ksort: function (obj) {
            if (!obj || typeof (obj) != 'object') {
                return [];
            }
            var keys = [],
                values = [];
            for (var i in obj) {
                keys.push(i);
            }
            keys.sort();
            for (var i = 0; i < keys.length; i++) {
                values.push(obj[keys[i]]);
            }
            return values;
        },
        setVendorAttribute: function (el, attr, val) {
            var uc = attr.charAt(0).toUpperCase() + attr.substr(1);
            el[attr] = el['ms' + uc] = el['moz' + uc] = el['webkit' + uc] = el['o' + uc] = val;
        },
        getVendorAttribute: function (el, attr) {
            var uc = attr.charAt(0).toUpperCase() + attr.substr(1);
            return el[attr] || el['ms' + uc] || el['moz' + uc] || el['webkit' + uc] || el['o' + uc];
        },
        normalizeVendorAttribute: function (el, attr) {
            var prefixedVal = ig.getVendorAttribute(el, attr);
            if (!el[attr] && prefixedVal) {
                el[attr] = prefixedVal;
            }
        },
        getImagePixels: function (image, x, y, width, height) {
            var canvas = ig.$new('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            var ctx = canvas.getContext('2d');
            ig.System.SCALE.CRISP(canvas, ctx);
            var ratio = ig.getVendorAttribute(ctx, 'backingStorePixelRatio') || 1;
            ig.normalizeVendorAttribute(ctx, 'getImageDataHD');
            var realWidth = image.width / ratio,
                realHeight = image.height / ratio;
            canvas.width = Math.ceil(realWidth);
            canvas.height = Math.ceil(realHeight);
            ctx.drawImage(image, 0, 0, realWidth, realHeight);
            return (ratio === 1) ? ctx.getImageData(x, y, width, height) : ctx.getImageDataHD(x, y, width, height);
        },
        module: function (name) {
            if (ig._current) {
                throw ("Module '" + ig._current.name + "' defines nothing");
            }
            if (ig.modules[name] && ig.modules[name].body) {
                throw ("Module '" + name + "' is already defined");
            }
            ig._current = {
                name: name,
                requires: [],
                loaded: false,
                body: null
            };
            ig.modules[name] = ig._current;
            ig._loadQueue.push(ig._current);
            return ig;
        },
        requires: function () {
            ig._current.requires = Array.prototype.slice.call(arguments);
            return ig;
        },
        defines: function (body) {
            ig._current.body = body;
            ig._current = null;
            ig._initDOMReady();
        },
        addResource: function (resource) {
            ig.resources.push(resource);
        },
        setNocache: function (set) {
            ig.nocache = set ? '?' + Date.now() : '';
        },
        log: function () {},
        assert: function (condition, msg) {},
        show: function (name, number) {},
        mark: function (msg, color) {},
        _loadScript: function (name, requiredFrom) {
            ig.modules[name] = {
                name: name,
                requires: [],
                loaded: false,
                body: null
            };
            ig._waitForOnload++;
            var path = ig.prefix + ig.lib + name.replace(/\./g, '/') + '.js' + ig.nocache;
            var script = ig.$new('script');
            script.type = 'text/javascript';
            script.src = path;
            script.onload = function () {
                ig._waitForOnload--;
                ig._execModules();
            };
            script.onerror = function () {
                throw ('Failed to load module ' + name + ' at ' + path + ' ' + 'required from ' + requiredFrom);
            };
            ig.$('head')[0].appendChild(script);
        },
        _execModules: function () {
            var modulesLoaded = false;
            for (var i = 0; i < ig._loadQueue.length; i++) {
                var m = ig._loadQueue[i];
                var dependenciesLoaded = true;
                for (var j = 0; j < m.requires.length; j++) {
                    var name = m.requires[j];
                    if (!ig.modules[name]) {
                        dependenciesLoaded = false;
                        ig._loadScript(name, m.name);
                    } else if (!ig.modules[name].loaded) {
                        dependenciesLoaded = false;
                    }
                }
                if (dependenciesLoaded && m.body) {
                    ig._loadQueue.splice(i, 1);
                    m.loaded = true;
                    m.body();
                    modulesLoaded = true;
                    i--;
                }
            }
            if (modulesLoaded) {
                ig._execModules();
            } else if (!ig.baked && ig._waitForOnload == 0 && ig._loadQueue.length != 0) {
                var unresolved = [];
                for (var i = 0; i < ig._loadQueue.length; i++) {
                    var unloaded = [];
                    var requires = ig._loadQueue[i].requires;
                    for (var j = 0; j < requires.length; j++) {
                        var m = ig.modules[requires[j]];
                        if (!m || !m.loaded) {
                            unloaded.push(requires[j]);
                        }
                    }
                    unresolved.push(ig._loadQueue[i].name + ' (requires: ' + unloaded.join(', ') + ')');
                }
                throw ("Unresolved (or circular?) dependencies. " + "Most likely there's a name/path mismatch for one of the listed modules " + "or a previous syntax error prevents a module from loading:\n" +
                    unresolved.join('\n'));
            }
        },
        _DOMReady: function () {
            if (!ig.modules['dom.ready'].loaded) {
                if (!document.body) {
                    return setTimeout(ig._DOMReady, 13);
                }
                ig.modules['dom.ready'].loaded = true;
                ig._waitForOnload--;
                ig._execModules();
            }
            return 0;
        },
        _boot: function () {
            if (document.location.href.match(/\?nocache/)) {
                ig.setNocache(true);
            }
            ig.ua.pixelRatio = window.devicePixelRatio || 1;
            ig.ua.viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            ig.ua.screen = {
                width: window.screen.availWidth * ig.ua.pixelRatio,
                height: window.screen.availHeight * ig.ua.pixelRatio
            };
            ig.ua.iPhone = /iPhone/i.test(navigator.userAgent);
            ig.ua.iPhone4 = (ig.ua.iPhone && ig.ua.pixelRatio == 2);
            ig.ua.iPad = /iPad/i.test(navigator.userAgent);
            ig.ua.android = /android/i.test(navigator.userAgent);
            ig.ua.winPhone = /Windows Phone/i.test(navigator.userAgent);
            ig.ua.iOS = ig.ua.iPhone || ig.ua.iPad;
            ig.ua.mobile = ig.ua.iOS || ig.ua.android || ig.ua.winPhone || /mobile/i.test(navigator.userAgent);
            ig.ua.touchDevice = (('ontouchstart' in window) || (window.navigator.msMaxTouchPoints));
        },
        _initDOMReady: function () {
            if (ig.modules['dom.ready']) {
                ig._execModules();
                return;
            }
            ig._boot();
            ig.modules['dom.ready'] = {
                requires: [],
                loaded: false,
                body: null
            };
            ig._waitForOnload++;
            if (document.readyState === 'complete') {
                ig._DOMReady();
            } else {
                document.addEventListener('DOMContentLoaded', ig._DOMReady, false);
                window.addEventListener('load', ig._DOMReady, false);
            }
        }
    };
    ig.normalizeVendorAttribute(window, 'requestAnimationFrame');
    if (window.requestAnimationFrame) {
        var next = 1,
            anims = {};
        window.ig.setAnimation = function (callback, element) {
            var current = next++;
            anims[current] = true;
            var animate = function () {
                if (!anims[current]) {
                    return;
                }
                window.requestAnimationFrame(animate, element);
                callback();
            };
            window.requestAnimationFrame(animate, element);
            return current;
        };
        window.ig.clearAnimation = function (id) {
            delete anims[id];
        };
    } else {
        window.ig.setAnimation = function (callback, element) {
            return window.setInterval(callback, 1000 / 60);
        };
        window.ig.clearAnimation = function (id) {
            window.clearInterval(id);
        };
    }
    var initializing = false,
        fnTest = /xyz/.test(function () {
            xyz;
        }) ? /\bparent\b/ : /.*/;
    var lastClassId = 0;
    window.ig.Class = function () {};
    var inject = function (prop) {
        var proto = this.prototype;
        var parent = {};
        for (var name in prop) {
            if (typeof (prop[name]) == "function" && typeof (proto[name]) == "function" && fnTest.test(prop[name])) {
                parent[name] = proto[name];
                proto[name] = (function (name, fn) {
                    return function () {
                        var tmp = this.parent;
                        this.parent = parent[name];
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            } else {
                proto[name] = prop[name];
            }
        }
    };
    window.ig.Class.extend = function (prop) {
        var parent = this.prototype;
        initializing = true;
        var prototype = new this();
        initializing = false;
        for (var name in prop) {
            if (typeof (prop[name]) == "function" && typeof (parent[name]) == "function" && fnTest.test(prop[name])) {
                prototype[name] = (function (name, fn) {
                    return function () {
                        var tmp = this.parent;
                        this.parent = parent[name];
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;
                        return ret;
                    };
                })(name, prop[name]);
            } else {
                prototype[name] = prop[name];
            }
        }

        function Class() {
            if (!initializing) {
                if (this.staticInstantiate) {
                    var obj = this.staticInstantiate.apply(this, arguments);
                    if (obj) {
                        return obj;
                    }
                }
                for (var p in this) {
                    if (typeof (this[p]) == 'object') {
                        this[p] = ig.copy(this[p]);
                    }
                }
                if (this.init) {
                    this.init.apply(this, arguments);
                }
            }
            return this;
        }
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = window.ig.Class.extend;
        Class.inject = inject;
        Class.classId = prototype.classId = ++lastClassId;
        return Class;
    };
    if (window.ImpactMixin) {
        ig.merge(ig, window.ImpactMixin);
    }
})(window);

// lib/impact/image.js
ig.baked = true;
ig.module('impact.image').defines(function () {
    "use strict";
    ig.Image = ig.Class.extend({
        data: null,
        width: 0,
        height: 0,
        loaded: false,
        failed: false,
        loadCallback: null,
        path: '',
        staticInstantiate: function (path) {
            return ig.Image.cache[path] || null;
        },
        init: function (path) {
            this.path = path;
            this.load();
        },
        load: function (loadCallback) {
            if (this.loaded) {
                if (loadCallback) {
                    loadCallback(this.path, true);
                }
                return;
            } else if (!this.loaded && ig.ready) {
                this.loadCallback = loadCallback || null;
                this.data = new Image();
                this.data.onload = this.onload.bind(this);
                this.data.onerror = this.onerror.bind(this);
                this.data.src = ig.prefix + this.path + ig.nocache;
            } else {
                ig.addResource(this);
            }
            ig.Image.cache[this.path] = this;
        },
        reload: function () {
            this.loaded = false;
            this.data = new Image();
            this.data.onload = this.onload.bind(this);
            this.data.src = this.path + '?' + Date.now();
        },
        onload: function (event) {
            this.width = this.data.width;
            this.height = this.data.height;
            this.loaded = true;
            if (ig.system.scale != 1) {
                this.resize(ig.system.scale);
            }
            if (this.loadCallback) {
                this.loadCallback(this.path, true);
            }
        },
        onerror: function (event) {
            this.failed = true;
            if (this.loadCallback) {
                this.loadCallback(this.path, false);
            }
        },
        resize: function (scale) {
            var origPixels = ig.getImagePixels(this.data, 0, 0, this.width, this.height);
            var widthScaled = this.width * scale;
            var heightScaled = this.height * scale;
            var scaled = ig.$new('canvas');
            scaled.width = widthScaled;
            scaled.height = heightScaled;
            var scaledCtx = scaled.getContext('2d');
            var scaledPixels = scaledCtx.getImageData(0, 0, widthScaled, heightScaled);
            for (var y = 0; y < heightScaled; y++) {
                for (var x = 0; x < widthScaled; x++) {
                    var index = (Math.floor(y / scale) * this.width + Math.floor(x / scale)) * 4;
                    var indexScaled = (y * widthScaled + x) * 4;
                    scaledPixels.data[indexScaled] = origPixels.data[index];
                    scaledPixels.data[indexScaled + 1] = origPixels.data[index + 1];
                    scaledPixels.data[indexScaled + 2] = origPixels.data[index + 2];
                    scaledPixels.data[indexScaled + 3] = origPixels.data[index + 3];
                }
            }
            scaledCtx.putImageData(scaledPixels, 0, 0);
            this.data = scaled;
        },
        draw: function (targetX, targetY, sourceX, sourceY, width, height) {
            if (!this.loaded) {
                return;
            }
            var scale = ig.system.scale;
            sourceX = sourceX ? sourceX * scale : 0;
            sourceY = sourceY ? sourceY * scale : 0;
            width = (width ? width : this.width) * scale;
            height = (height ? height : this.height) * scale;
            ig.system.context.drawImage(this.data, sourceX, sourceY, width, height, ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY), width, height);
            ig.Image.drawCount++;
        },
        drawTile: function (targetX, targetY, tile, tileWidth, tileHeight, flipX, flipY) {
            tileHeight = tileHeight ? tileHeight : tileWidth;
            if (!this.loaded || tileWidth > this.width || tileHeight > this.height) {
                return;
            }
            var scale = ig.system.scale;
            var tileWidthScaled = Math.floor(tileWidth * scale);
            var tileHeightScaled = Math.floor(tileHeight * scale);
            var scaleX = flipX ? -1 : 1;
            var scaleY = flipY ? -1 : 1;
            if (flipX || flipY) {
                ig.system.context.save();
                ig.system.context.scale(scaleX, scaleY);
            }
            ig.system.context.drawImage(this.data, (Math.floor(tile * tileWidth) % this.width) * scale, (Math.floor(tile * tileWidth / this.width) * tileHeight) * scale, tileWidthScaled, tileHeightScaled, ig.system.getDrawPos(targetX) * scaleX - (flipX ? tileWidthScaled : 0), ig.system.getDrawPos(targetY) * scaleY - (flipY ? tileHeightScaled : 0), tileWidthScaled, tileHeightScaled);
            if (flipX || flipY) {
                ig.system.context.restore();
            }
            ig.Image.drawCount++;
        }
    });
    ig.Image.drawCount = 0;
    ig.Image.cache = {};
    ig.Image.reloadCache = function () {
        for (var path in ig.Image.cache) {
            ig.Image.cache[path].reload();
        }
    };
});

// lib/impact/font.js
ig.baked = true;
ig.module('impact.font').requires('impact.image').defines(function () {
    "use strict";
    ig.Font = ig.Image.extend({
        widthMap: [],
        indices: [],
        firstChar: 32,
        alpha: 1,
        letterSpacing: 1,
        lineSpacing: 0,
        onload: function (ev) {
            this._loadMetrics(this.data);
            this.parent(ev);
        },
        widthForString: function (text) {
            if (text.indexOf('\n') !== -1) {
                var lines = text.split('\n');
                var width = 0;
                for (var i = 0; i < lines.length; i++) {
                    width = Math.max(width, this._widthForLine(lines[i]));
                }
                return width;
            } else {
                return this._widthForLine(text);
            }
        },
        _widthForLine: function (text) {
            var width = 0;
            for (var i = 0; i < text.length; i++) {
                width += this.widthMap[text.charCodeAt(i) - this.firstChar] + this.letterSpacing;
            }
            return width;
        },
        heightForString: function (text) {
            return text.split('\n').length * (this.height + this.lineSpacing);
        },
        draw: function (text, x, y, align) {
            if (typeof (text) != 'string') {
                text = text.toString();
            }
            if (text.indexOf('\n') !== -1) {
                var lines = text.split('\n');
                var lineHeight = this.height + this.lineSpacing;
                for (var i = 0; i < lines.length; i++) {
                    this.draw(lines[i], x, y + i * lineHeight, align);
                }
                return;
            }
            if (align == ig.Font.ALIGN.RIGHT || align == ig.Font.ALIGN.CENTER) {
                var width = this._widthForLine(text);
                x -= align == ig.Font.ALIGN.CENTER ? width / 2 : width;
            }
            if (this.alpha !== 1) {
                ig.system.context.globalAlpha = this.alpha;
            }
            for (var i = 0; i < text.length; i++) {
                var c = text.charCodeAt(i);
                x += this._drawChar(c - this.firstChar, x, y);
            }
            if (this.alpha !== 1) {
                ig.system.context.globalAlpha = 1;
            }
            ig.Image.drawCount += text.length;
        },
        _drawChar: function (c, targetX, targetY) {
            if (!this.loaded || c < 0 || c >= this.indices.length) {
                return 0;
            }
            var scale = ig.system.scale;
            var charX = this.indices[c] * scale;
            var charY = 0;
            var charWidth = this.widthMap[c] * scale;
            var charHeight = (this.height - 2) * scale;
            ig.system.context.drawImage(this.data, charX, charY, charWidth, charHeight, ig.system.getDrawPos(targetX), ig.system.getDrawPos(targetY), charWidth, charHeight);
            return this.widthMap[c] + this.letterSpacing;
        },
        _loadMetrics: function (image) {
            this.height = image.height - 1;
            this.widthMap = [];
            this.indices = [];
            var px = ig.getImagePixels(image, 0, image.height - 1, image.width, 1);
            var currentChar = 0;
            var currentWidth = 0;
            for (var x = 0; x < image.width; x++) {
                var index = x * 4 + 3;
                if (px.data[index] > 127) {
                    currentWidth++;
                } else if (px.data[index] < 128 && currentWidth) {
                    this.widthMap.push(currentWidth);
                    this.indices.push(x - currentWidth);
                    currentChar++;
                    currentWidth = 0;
                }
            }
            this.widthMap.push(currentWidth);
            this.indices.push(x - currentWidth);
        }
    });
    ig.Font.ALIGN = {
        LEFT: 0,
        RIGHT: 1,
        CENTER: 2
    };
});

// lib/impact/sound.js
ig.baked = true;
ig.module('impact.sound').defines(function () {
    "use strict";
    ig.SoundManager = ig.Class.extend({
        clips: {},
        volume: 1,
        format: null,
        init: function () {
            if (!ig.Sound.enabled || !window.Audio) {
                ig.Sound.enabled = false;
                return;
            }
            var probe = new Audio();
            for (var i = 0; i < ig.Sound.use.length; i++) {
                var format = ig.Sound.use[i];
                if (probe.canPlayType(format.mime)) {
                    this.format = format;
                    break;
                }
            }
            if (!this.format) {
                ig.Sound.enabled = false;
            }
            if (ig.Sound.enabled && ig.Sound.useWebAudio) {
                this.audioContext = new AudioContext();
            }
        },
        load: function (path, multiChannel, loadCallback) {
            if (multiChannel && ig.Sound.useWebAudio) {
                return this.loadWebAudio(path, multiChannel, loadCallback);
            } else {
                return this.loadHTML5Audio(path, multiChannel, loadCallback);
            }
        },
        loadWebAudio: function (path, multiChannel, loadCallback) {
            var realPath = ig.prefix + path.replace(/[^\.]+$/, this.format.ext) + ig.nocache;
            if (this.clips[path]) {
                return this.clips[path];
            }
            var audioSource = new ig.Sound.WebAudioSource()
            this.clips[path] = audioSource;
            var request = new XMLHttpRequest();
            request.open('GET', realPath, true);
            request.responseType = 'arraybuffer';
            var that = this;
            request.onload = function (ev) {
                that.audioContext.decodeAudioData(request.response, function (buffer) {
                    audioSource.buffer = buffer;
                    loadCallback(path, true, ev);
                }, function (ev) {
                    loadCallback(path, false, ev);
                });
            };
            request.onerror = function (ev) {
                loadCallback(path, false, ev);
            };
            request.send();
            return audioSource;
        },
        loadHTML5Audio: function (path, multiChannel, loadCallback) {
            var realPath = ig.prefix + path.replace(/[^\.]+$/, this.format.ext) + ig.nocache;
            if (this.clips[path]) {
                if (this.clips[path] instanceof ig.Sound.WebAudioSource) {
                    return this.clips[path];
                }
                if (multiChannel && this.clips[path].length < ig.Sound.channels) {
                    for (var i = this.clips[path].length; i < ig.Sound.channels; i++) {
                        var a = new Audio(realPath);
                        a.load();
                        this.clips[path].push(a);
                    }
                }
                return this.clips[path][0];
            }
            var clip = new Audio(realPath);
            if (loadCallback) {
                clip.addEventListener('canplaythrough', function cb(ev) {
                    clip.removeEventListener('canplaythrough', cb, false);
                    loadCallback(path, true, ev);
                }, false);
                clip.addEventListener('error', function (ev) {
                    loadCallback(path, false, ev);
                }, false);
            }
            clip.preload = 'auto';
            clip.load();
            this.clips[path] = [clip];
            if (multiChannel) {
                for (var i = 1; i < ig.Sound.channels; i++) {
                    var a = new Audio(realPath);
                    a.load();
                    this.clips[path].push(a);
                }
            }
            return clip;
        },
        get: function (path) {
            var channels = this.clips[path];
            if (channels && channels instanceof ig.Sound.WebAudioSource) {
                return channels;
            }
            for (var i = 0, clip; clip = channels[i++];) {
                if (clip.paused || clip.ended) {
                    if (clip.ended) {
                        clip.currentTime = 0;
                    }
                    return clip;
                }
            }
            channels[0].pause();
            channels[0].currentTime = 0;
            return channels[0];
        }
    });
    ig.Music = ig.Class.extend({
        tracks: [],
        namedTracks: {},
        currentTrack: null,
        currentIndex: 0,
        random: false,
        _volume: 1,
        _loop: false,
        _fadeInterval: 0,
        _fadeTimer: null,
        _endedCallbackBound: null,
        init: function () {
            this._endedCallbackBound = this._endedCallback.bind(this);
            Object.defineProperty(this, "volume", {
                get: this.getVolume.bind(this),
                set: this.setVolume.bind(this)
            });
            Object.defineProperty(this, "loop", {
                get: this.getLooping.bind(this),
                set: this.setLooping.bind(this)
            });
        },
        add: function (music, name) {
            if (!ig.Sound.enabled) {
                return;
            }
            var path = music instanceof ig.Sound ? music.path : music;
            var track = ig.soundManager.load(path, false);
            if (track instanceof ig.Sound.WebAudioSource) {
                ig.system.stopRunLoop();
                throw ("Sound '" + path + "' loaded as Multichannel but used for Music. " + "Set the multiChannel param to false when loading, e.g.: new ig.Sound(path, false)");
            }
            track.loop = this._loop;
            track.volume = this._volume;
            track.addEventListener('ended', this._endedCallbackBound, false);
            this.tracks.push(track);
            if (name) {
                this.namedTracks[name] = track;
            }
            if (!this.currentTrack) {
                this.currentTrack = track;
            }
        },
        next: function () {
            if (!this.tracks.length) {
                return;
            }
            this.stop();
            this.currentIndex = this.random ? Math.floor(Math.random() * this.tracks.length) : (this.currentIndex + 1) % this.tracks.length;
            this.currentTrack = this.tracks[this.currentIndex];
            this.play();
        },
        pause: function () {
            if (!this.currentTrack) {
                return;
            }
            this.currentTrack.pause();
        },
        stop: function () {
            if (!this.currentTrack) {
                return;
            }
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
        },
        play: function (name) {
            if (name && this.namedTracks[name]) {
                var newTrack = this.namedTracks[name];
                if (newTrack != this.currentTrack) {
                    this.stop();
                    this.currentTrack = newTrack;
                }
            } else if (!this.currentTrack) {
                return;
            }
            this.currentTrack.play();
        },
        getLooping: function () {
            return this._loop;
        },
        setLooping: function (l) {
            this._loop = l;
            for (var i in this.tracks) {
                this.tracks[i].loop = l;
            }
        },
        getVolume: function () {
            return this._volume;
        },
        setVolume: function (v) {
            this._volume = v.limit(0, 1);
            for (var i in this.tracks) {
                this.tracks[i].volume = this._volume;
            }
        },
        fadeOut: function (time) {
            if (!this.currentTrack) {
                return;
            }
            clearInterval(this._fadeInterval);
            this.fadeTimer = new ig.Timer(time);
            this._fadeInterval = setInterval(this._fadeStep.bind(this), 50);
        },
        _fadeStep: function () {
            var v = this.fadeTimer.delta().map(-this.fadeTimer.target, 0, 1, 0).limit(0, 1) * this._volume;
            if (v <= 0.01) {
                this.stop();
                this.currentTrack.volume = this._volume;
                clearInterval(this._fadeInterval);
            } else {
                this.currentTrack.volume = v;
            }
        },
        _endedCallback: function () {
            if (this._loop) {
                this.play();
            } else {
                this.next();
            }
        }
    });
    ig.Sound = ig.Class.extend({
        path: '',
        volume: 1,
        currentClip: null,
        multiChannel: true,
        _loop: false,
        init: function (path, multiChannel) {
            this.path = path;
            this.multiChannel = (multiChannel !== false);
            Object.defineProperty(this, "loop", {
                get: this.getLooping.bind(this),
                set: this.setLooping.bind(this)
            });
            this.load();
        },
        getLooping: function () {
            return this._loop;
        },
        setLooping: function (loop) {
            this._loop = loop;
            if (this.currentClip) {
                this.currentClip.loop = loop;
            }
        },
        load: function (loadCallback) {
            if (!ig.Sound.enabled) {
                if (loadCallback) {
                    loadCallback(this.path, true);
                }
                return;
            }
            if (ig.ready) {
                ig.soundManager.load(this.path, this.multiChannel, loadCallback);
            } else {
                ig.addResource(this);
            }
        },
        play: function () {
            if (!ig.Sound.enabled) {
                return;
            }
            this.currentClip = ig.soundManager.get(this.path);
            this.currentClip.loop = this._loop;
            this.currentClip.volume = ig.soundManager.volume * this.volume;
            this.currentClip.play();
        },
        stop: function () {
            if (this.currentClip) {
                this.currentClip.pause();
                this.currentClip.currentTime = 0;
            }
        }
    });
    ig.Sound.WebAudioSource = ig.Class.extend({
        sources: [],
        gain: null,
        buffer: null,
        _loop: false,
        init: function () {
            this.gain = ig.soundManager.audioContext.createGain();
            this.gain.connect(ig.soundManager.audioContext.destination);
            Object.defineProperty(this, "loop", {
                get: this.getLooping.bind(this),
                set: this.setLooping.bind(this)
            });
            Object.defineProperty(this, "volume", {
                get: this.getVolume.bind(this),
                set: this.setVolume.bind(this)
            });
        },
        play: function () {
            if (!this.buffer) {
                return;
            }
            var source = ig.soundManager.audioContext.createBufferSource();
            source.buffer = this.buffer;
            source.connect(this.gain);
            source.loop = this._loop;
            var that = this;
            this.sources.push(source);
            source.onended = function () {
                that.sources.erase(source);
            }
            source.start(0);
        },
        pause: function () {
            for (var i = 0; i < this.sources.length; i++) {
                try {
                    this.sources[i].stop();
                } catch (err) {}
            }
        },
        getLooping: function () {
            return this._loop;
        },
        setLooping: function (loop) {
            this._loop = loop;
            for (var i = 0; i < this.sources.length; i++) {
                this.sources[i].loop = loop;
            }
        },
        getVolume: function () {
            return this.gain.gain.value;
        },
        setVolume: function (volume) {
            this.gain.gain.value = volume;
        }
    });
    ig.Sound.FORMAT = {
        MP3: {
            ext: 'mp3',
            mime: 'audio/mpeg'
        },
        M4A: {
            ext: 'm4a',
            mime: 'audio/mp4; codecs=mp4a'
        },
        OGG: {
            ext: 'ogg',
            mime: 'audio/ogg; codecs=vorbis'
        },
        WEBM: {
            ext: 'webm',
            mime: 'audio/webm; codecs=vorbis'
        },
        CAF: {
            ext: 'caf',
            mime: 'audio/x-caf'
        }
    };
    ig.Sound.use = [ig.Sound.FORMAT.OGG, ig.Sound.FORMAT.MP3];
    ig.Sound.channels = 4;
    ig.Sound.enabled = true;
    ig.normalizeVendorAttribute(window, 'AudioContext');
    ig.Sound.useWebAudio = !!window.AudioContext;
});

// lib/impact/loader.js
ig.baked = true;
ig.module('impact.loader').requires('impact.image', 'impact.font', 'impact.sound').defines(function () {
    "use strict";
    ig.Loader = ig.Class.extend({
        resources: [],
        gameClass: null,
        status: 0,
        done: false,
        _unloaded: [],
        _drawStatus: 0,
        _intervalId: 0,
        _loadCallbackBound: null,
        init: function (gameClass, resources) {
            this.gameClass = gameClass;
            this.resources = resources;
            this._loadCallbackBound = this._loadCallback.bind(this);
            for (var i = 0; i < this.resources.length; i++) {
                this._unloaded.push(this.resources[i].path);
            }
        },
        load: function () {
            ig.system.clear('#000');
            if (!this.resources.length) {
                this.end();
                return;
            }
            for (var i = 0; i < this.resources.length; i++) {
                this.loadResource(this.resources[i]);
            }
            this._intervalId = setInterval(this.draw.bind(this), 16);
        },
        loadResource: function (res) {
            res.load(this._loadCallbackBound);
        },
        end: function () {
            if (this.done) {
                return;
            }
            this.done = true;
            clearInterval(this._intervalId);
            ig.system.setGame(this.gameClass);
        },
        draw: function () {
            this._drawStatus += (this.status - this._drawStatus) / 5;
            var s = ig.system.scale;
            var w = ig.system.width * 0.6;
            var h = ig.system.height * 0.1;
            var x = ig.system.width * 0.5 - w / 2;
            var y = ig.system.height * 0.5 - h / 2;
            ig.system.context.fillStyle = '#000';
            ig.system.context.fillRect(0, 0, 480, 320);
            ig.system.context.fillStyle = '#fff';
            ig.system.context.fillRect(x * s, y * s, w * s, h * s);
            ig.system.context.fillStyle = '#000';
            ig.system.context.fillRect(x * s + s, y * s + s, w * s - s - s, h * s - s - s);
            ig.system.context.fillStyle = '#fff';
            ig.system.context.fillRect(x * s, y * s, w * s * this._drawStatus, h * s);
        },
        _loadCallback: function (path, status) {
            if (status) {
                this._unloaded.erase(path);
            } else {
                throw ('Failed to load resource: ' + path);
            }
            this.status = 1 - (this._unloaded.length / this.resources.length);
            if (this._unloaded.length == 0) {
                setTimeout(this.end.bind(this), 250);
            }
        }
    });
});

// lib/impact/timer.js
ig.baked = true;
ig.module('impact.timer').defines(function () {
    "use strict";
    ig.Timer = ig.Class.extend({
        target: 0,
        base: 0,
        last: 0,
        pausedAt: 0,
        init: function (seconds) {
            this.base = ig.Timer.time;
            this.last = ig.Timer.time;
            this.target = seconds || 0;
        },
        set: function (seconds) {
            this.target = seconds || 0;
            this.base = ig.Timer.time;
            this.pausedAt = 0;
        },
        reset: function () {
            this.base = ig.Timer.time;
            this.pausedAt = 0;
        },
        tick: function () {
            var delta = ig.Timer.time - this.last;
            this.last = ig.Timer.time;
            return (this.pausedAt ? 0 : delta);
        },
        delta: function () {
            return (this.pausedAt || ig.Timer.time) - this.base - this.target;
        },
        pause: function () {
            if (!this.pausedAt) {
                this.pausedAt = ig.Timer.time;
            }
        },
        unpause: function () {
            if (this.pausedAt) {
                this.base += ig.Timer.time - this.pausedAt;
                this.pausedAt = 0;
            }
        }
    });
    ig.Timer._last = 0;
    ig.Timer.time = Number.MIN_VALUE;
    ig.Timer.timeScale = 1;
    ig.Timer.maxStep = 0.05;
    ig.Timer.step = function () {
        var current = Date.now();
        var delta = (current - ig.Timer._last) / 1000;
        ig.Timer.time += Math.min(delta, ig.Timer.maxStep) * ig.Timer.timeScale;
        ig.Timer._last = current;
    };
});

// lib/impact/system.js
ig.baked = true;
ig.module('impact.system').requires('impact.timer', 'impact.image').defines(function () {
    "use strict";
    ig.System = ig.Class.extend({
        fps: 30,
        width: 320,
        height: 240,
        realWidth: 320,
        realHeight: 240,
        scale: 1,
        tick: 0,
        animationId: 0,
        newGameClass: null,
        running: false,
        delegate: null,
        clock: null,
        canvas: null,
        context: null,
        init: function (canvasId, fps, width, height, scale) {
            this.fps = fps;
            this.clock = new ig.Timer();
            this.canvas = ig.$(canvasId);
            this.resize(width, height, scale);
            this.context = this.canvas.getContext('2d');
            this.getDrawPos = ig.System.drawMode;
            if (this.scale != 1) {
                ig.System.scaleMode = ig.System.SCALE.CRISP;
            }
            ig.System.scaleMode(this.canvas, this.context);
        },
        resize: function (width, height, scale) {
            this.width = width;
            this.height = height;
            this.scale = scale || this.scale;
            this.realWidth = this.width * this.scale;
            this.realHeight = this.height * this.scale;
            this.canvas.width = this.realWidth;
            this.canvas.height = this.realHeight;
        },
        setGame: function (gameClass) {
            if (this.running) {
                this.newGameClass = gameClass;
            } else {
                this.setGameNow(gameClass);
            }
        },
        setGameNow: function (gameClass) {
            ig.game = new(gameClass)();
            ig.system.setDelegate(ig.game);
        },
        setDelegate: function (object) {
            if (typeof (object.run) == 'function') {
                this.delegate = object;
                this.startRunLoop();
            } else {
                throw ('System.setDelegate: No run() function in object');
            }
        },
        stopRunLoop: function () {
            ig.clearAnimation(this.animationId);
            this.running = false;
        },
        startRunLoop: function () {
            this.stopRunLoop();
            this.animationId = ig.setAnimation(this.run.bind(this), this.canvas);
            this.running = true;
        },
        clear: function (color) {
            this.context.fillStyle = color;
            this.context.fillRect(0, 0, this.realWidth, this.realHeight);
        },
        run: function () {
            ig.Timer.step();
            this.tick = this.clock.tick();
            this.delegate.run();
            ig.input.clearPressed();
            if (this.newGameClass) {
                this.setGameNow(this.newGameClass);
                this.newGameClass = null;
            }
        },
        getDrawPos: null
    });
    ig.System.DRAW = {
        AUTHENTIC: function (p) {
            return Math.round(p) * this.scale;
        },
        SMOOTH: function (p) {
            return Math.round(p * this.scale);
        },
        SUBPIXEL: function (p) {
            return p * this.scale;
        }
    };
    ig.System.drawMode = ig.System.DRAW.SMOOTH;
    ig.System.SCALE = {
        CRISP: function (canvas, context) {
            ig.setVendorAttribute(context, 'imageSmoothingEnabled', false);
            canvas.style.imageRendering = '-moz-crisp-edges';
            canvas.style.imageRendering = '-o-crisp-edges';
            canvas.style.imageRendering = '-webkit-optimize-contrast';
            canvas.style.imageRendering = 'crisp-edges';
            canvas.style.msInterpolationMode = 'nearest-neighbor';
        },
        SMOOTH: function (canvas, context) {
            ig.setVendorAttribute(context, 'imageSmoothingEnabled', true);
            canvas.style.imageRendering = '';
            canvas.style.msInterpolationMode = '';
        }
    };
    ig.System.scaleMode = ig.System.SCALE.SMOOTH;
});

// lib/impact/input.js
ig.baked = true;
ig.module('impact.input').defines(function () {
    "use strict";
    ig.KEY = {
        'MOUSE1': -1,
        'MOUSE2': -3,
        'MWHEEL_UP': -4,
        'MWHEEL_DOWN': -5,
        'BACKSPACE': 8,
        'TAB': 9,
        'ENTER': 13,
        'PAUSE': 19,
        'CAPS': 20,
        'ESC': 27,
        'SPACE': 32,
        'PAGE_UP': 33,
        'PAGE_DOWN': 34,
        'END': 35,
        'HOME': 36,
        'LEFT_ARROW': 37,
        'UP_ARROW': 38,
        'RIGHT_ARROW': 39,
        'DOWN_ARROW': 40,
        'INSERT': 45,
        'DELETE': 46,
        '_0': 48,
        '_1': 49,
        '_2': 50,
        '_3': 51,
        '_4': 52,
        '_5': 53,
        '_6': 54,
        '_7': 55,
        '_8': 56,
        '_9': 57,
        'A': 65,
        'B': 66,
        'C': 67,
        'D': 68,
        'E': 69,
        'F': 70,
        'G': 71,
        'H': 72,
        'I': 73,
        'J': 74,
        'K': 75,
        'L': 76,
        'M': 77,
        'N': 78,
        'O': 79,
        'P': 80,
        'Q': 81,
        'R': 82,
        'S': 83,
        'T': 84,
        'U': 85,
        'V': 86,
        'W': 87,
        'X': 88,
        'Y': 89,
        'Z': 90,
        'NUMPAD_0': 96,
        'NUMPAD_1': 97,
        'NUMPAD_2': 98,
        'NUMPAD_3': 99,
        'NUMPAD_4': 100,
        'NUMPAD_5': 101,
        'NUMPAD_6': 102,
        'NUMPAD_7': 103,
        'NUMPAD_8': 104,
        'NUMPAD_9': 105,
        'MULTIPLY': 106,
        'ADD': 107,
        'SUBSTRACT': 109,
        'DECIMAL': 110,
        'DIVIDE': 111,
        'F1': 112,
        'F2': 113,
        'F3': 114,
        'F4': 115,
        'F5': 116,
        'F6': 117,
        'F7': 118,
        'F8': 119,
        'F9': 120,
        'F10': 121,
        'F11': 122,
        'F12': 123,
        'SHIFT': 16,
        'CTRL': 17,
        'ALT': 18,
        'PLUS': 187,
        'COMMA': 188,
        'MINUS': 189,
        'PERIOD': 190
    };
    ig.Input = ig.Class.extend({
        bindings: {},
        actions: {},
        presses: {},
        locks: {},
        delayedKeyup: {},
        isUsingMouse: false,
        isUsingKeyboard: false,
        isUsingAccelerometer: false,
        mouse: {
            x: 0,
            y: 0
        },
        accel: {
            x: 0,
            y: 0,
            z: 0
        },
        initMouse: function () {
            if (this.isUsingMouse) {
                return;
            }
            this.isUsingMouse = true;
            var mouseWheelBound = this.mousewheel.bind(this);
            ig.system.canvas.addEventListener('mousewheel', mouseWheelBound, false);
            ig.system.canvas.addEventListener('DOMMouseScroll', mouseWheelBound, false);
            ig.system.canvas.addEventListener('contextmenu', this.contextmenu.bind(this), false);
            ig.system.canvas.addEventListener('mousedown', this.keydown.bind(this), false);
            ig.system.canvas.addEventListener('mouseup', this.keyup.bind(this), false);
            ig.system.canvas.addEventListener('mousemove', this.mousemove.bind(this), false);
            if (ig.ua.touchDevice) {
                ig.system.canvas.addEventListener('touchstart', this.keydown.bind(this), false);
                ig.system.canvas.addEventListener('touchend', this.keyup.bind(this), false);
                ig.system.canvas.addEventListener('touchmove', this.mousemove.bind(this), false);
                ig.system.canvas.addEventListener('MSPointerDown', this.keydown.bind(this), false);
                ig.system.canvas.addEventListener('MSPointerUp', this.keyup.bind(this), false);
                ig.system.canvas.addEventListener('MSPointerMove', this.mousemove.bind(this), false);
                ig.system.canvas.style.msTouchAction = 'none';
            }
        },
        initKeyboard: function () {
            if (this.isUsingKeyboard) {
                return;
            }
            this.isUsingKeyboard = true;
            window.addEventListener('keydown', this.keydown.bind(this), false);
            window.addEventListener('keyup', this.keyup.bind(this), false);
        },
        initAccelerometer: function () {
            if (this.isUsingAccelerometer) {
                return;
            }
            window.addEventListener('devicemotion', this.devicemotion.bind(this), false);
        },
        mousewheel: function (event) {
            var delta = event.wheelDelta ? event.wheelDelta : (event.detail * -1);
            var code = delta > 0 ? ig.KEY.MWHEEL_UP : ig.KEY.MWHEEL_DOWN;
            var action = this.bindings[code];
            if (action) {
                this.actions[action] = true;
                this.presses[action] = true;
                this.delayedKeyup[action] = true;
                event.stopPropagation();
                event.preventDefault();
            }
        },
        mousemove: function (event) {
            var internalWidth = parseInt(ig.system.canvas.offsetWidth) || ig.system.realWidth;
            var scale = ig.system.scale * (internalWidth / ig.system.realWidth);
            var pos = {
                left: 0,
                top: 0
            };
            if (ig.system.canvas.getBoundingClientRect) {
                pos = ig.system.canvas.getBoundingClientRect();
            }
            var ev = event.touches ? event.touches[0] : event;
            this.mouse.x = (ev.clientX - pos.left) / scale;
            this.mouse.y = (ev.clientY - pos.top) / scale;
        },
        contextmenu: function (event) {
            if (this.bindings[ig.KEY.MOUSE2]) {
                event.stopPropagation();
                event.preventDefault();
            }
        },
        keydown: function (event) {
            var tag = event.target.tagName;
            if (tag == 'INPUT' || tag == 'TEXTAREA') {
                return;
            }
            var code = event.type == 'keydown' ? event.keyCode : (event.button == 2 ? ig.KEY.MOUSE2 : ig.KEY.MOUSE1);
            if (event.type == 'touchstart' || event.type == 'mousedown') {
                this.mousemove(event);
            }
            var action = this.bindings[code];
            if (action) {
                this.actions[action] = true;
                if (!this.locks[action]) {
                    this.presses[action] = true;
                    this.locks[action] = true;
                }
                event.stopPropagation();
                event.preventDefault();
            }
        },
        keyup: function (event) {
            var tag = event.target.tagName;
            if (tag == 'INPUT' || tag == 'TEXTAREA') {
                return;
            }
            var code = event.type == 'keyup' ? event.keyCode : (event.button == 2 ? ig.KEY.MOUSE2 : ig.KEY.MOUSE1);
            var action = this.bindings[code];
            if (action) {
                this.delayedKeyup[action] = true;
                event.stopPropagation();
                event.preventDefault();
            }
        },
        devicemotion: function (event) {
            this.accel = event.accelerationIncludingGravity;
        },
        bind: function (key, action) {
            if (key < 0) {
                this.initMouse();
            } else if (key > 0) {
                this.initKeyboard();
            }
            this.bindings[key] = action;
        },
        bindTouch: function (selector, action) {
            var element = ig.$(selector);
            var that = this;
            element.addEventListener('touchstart', function (ev) {
                that.touchStart(ev, action);
            }, false);
            element.addEventListener('touchend', function (ev) {
                that.touchEnd(ev, action);
            }, false);
            element.addEventListener('MSPointerDown', function (ev) {
                that.touchStart(ev, action);
            }, false);
            element.addEventListener('MSPointerUp', function (ev) {
                that.touchEnd(ev, action);
            }, false);
        },
        unbind: function (key) {
            var action = this.bindings[key];
            this.delayedKeyup[action] = true;
            this.bindings[key] = null;
        },
        unbindAll: function () {
            this.bindings = {};
            this.actions = {};
            this.presses = {};
            this.locks = {};
            this.delayedKeyup = {};
        },
        state: function (action) {
            return this.actions[action];
        },
        pressed: function (action) {
            return this.presses[action];
        },
        released: function (action) {
            return !!this.delayedKeyup[action];
        },
        clearPressed: function () {
            for (var action in this.delayedKeyup) {
                this.actions[action] = false;
                this.locks[action] = false;
            }
            this.delayedKeyup = {};
            this.presses = {};
        },
        touchStart: function (event, action) {
            this.actions[action] = true;
            this.presses[action] = true;
            event.stopPropagation();
            event.preventDefault();
            return false;
        },
        touchEnd: function (event, action) {
            this.delayedKeyup[action] = true;
            event.stopPropagation();
            event.preventDefault();
            return false;
        }
    });
});

// lib/impact/impact.js
ig.baked = true;
ig.module('impact.impact').requires('dom.ready', 'impact.loader', 'impact.system', 'impact.input', 'impact.sound').defines(function () {
    "use strict";
    ig.main = function (canvasId, gameClass, fps, width, height, scale, loaderClass) {
        ig.system = new ig.System(canvasId, fps, width, height, scale || 1);
        ig.input = new ig.Input();
        ig.soundManager = new ig.SoundManager();
        ig.music = new ig.Music();
        ig.ready = true;
        var loader = new(loaderClass || ig.Loader)(gameClass, ig.resources);
        loader.load();
    };
});

// lib/impact/animation.js
ig.baked = true;
ig.module('impact.animation').requires('impact.timer', 'impact.image').defines(function () {
    "use strict";
    ig.AnimationSheet = ig.Class.extend({
        width: 8,
        height: 8,
        image: null,
        init: function (path, width, height) {
            this.width = width;
            this.height = height;
            this.image = new ig.Image(path);
        }
    });
    ig.Animation = ig.Class.extend({
        sheet: null,
        timer: null,
        sequence: [],
        flip: {
            x: false,
            y: false
        },
        pivot: {
            x: 0,
            y: 0
        },
        frame: 0,
        tile: 0,
        loopCount: 0,
        alpha: 1,
        angle: 0,
        init: function (sheet, frameTime, sequence, stop) {
            this.sheet = sheet;
            this.pivot = {
                x: sheet.width / 2,
                y: sheet.height / 2
            };
            this.timer = new ig.Timer();
            this.frameTime = frameTime;
            this.sequence = sequence;
            this.stop = !!stop;
            this.tile = this.sequence[0];
        },
        rewind: function () {
            this.timer.set();
            this.loopCount = 0;
            this.frame = 0;
            this.tile = this.sequence[0];
            return this;
        },
        gotoFrame: function (f) {
            this.timer.set(this.frameTime * -f - 0.0001);
            this.update();
        },
        gotoRandomFrame: function () {
            this.gotoFrame(Math.floor(Math.random() * this.sequence.length))
        },
        update: function () {
            var frameTotal = Math.floor(this.timer.delta() / this.frameTime);
            this.loopCount = Math.floor(frameTotal / this.sequence.length);
            if (this.stop && this.loopCount > 0) {
                this.frame = this.sequence.length - 1;
            } else {
                this.frame = frameTotal % this.sequence.length;
            }
            this.tile = this.sequence[this.frame];
        },
        draw: function (targetX, targetY) {
            var bbsize = Math.max(this.sheet.width, this.sheet.height);
            if (targetX > ig.system.width || targetY > ig.system.height || targetX + bbsize < 0 || targetY + bbsize < 0) {
                return;
            }
            if (this.alpha != 1) {
                ig.system.context.globalAlpha = this.alpha;
            }
            if (this.angle == 0) {
                this.sheet.image.drawTile(targetX, targetY, this.tile, this.sheet.width, this.sheet.height, this.flip.x, this.flip.y);
            } else {
                ig.system.context.save();
                ig.system.context.translate(ig.system.getDrawPos(targetX + this.pivot.x), ig.system.getDrawPos(targetY + this.pivot.y));
                ig.system.context.rotate(this.angle);
                this.sheet.image.drawTile(-this.pivot.x, -this.pivot.y, this.tile, this.sheet.width, this.sheet.height, this.flip.x, this.flip.y);
                ig.system.context.restore();
            }
            if (this.alpha != 1) {
                ig.system.context.globalAlpha = 1;
            }
        }
    });
});

// lib/impact/entity.js
ig.baked = true;
ig.module('impact.entity').requires('impact.animation', 'impact.impact').defines(function () {
    "use strict";
    ig.Entity = ig.Class.extend({
        id: 0,
        settings: {},
        size: {
            x: 16,
            y: 16
        },
        offset: {
            x: 0,
            y: 0
        },
        pos: {
            x: 0,
            y: 0
        },
        last: {
            x: 0,
            y: 0
        },
        vel: {
            x: 0,
            y: 0
        },
        accel: {
            x: 0,
            y: 0
        },
        friction: {
            x: 0,
            y: 0
        },
        maxVel: {
            x: 100,
            y: 100
        },
        zIndex: 0,
        gravityFactor: 1,
        standing: false,
        bounciness: 0,
        minBounceVelocity: 40,
        anims: {},
        animSheet: null,
        currentAnim: null,
        health: 10,
        type: 0,
        checkAgainst: 0,
        collides: 0,
        _killed: false,
        slopeStanding: {
            min: (44).toRad(),
            max: (136).toRad()
        },
        init: function (x, y, settings) {
            this.id = ++ig.Entity._lastId;
            this.pos.x = this.last.x = x;
            this.pos.y = this.last.y = y;
            ig.merge(this, settings);
        },
        reset: function (x, y, settings) {
            var proto = this.constructor.prototype;
            this.pos.x = x;
            this.pos.y = y;
            this.last.x = x;
            this.last.y = y;
            this.vel.x = proto.vel.x;
            this.vel.y = proto.vel.y;
            this.accel.x = proto.accel.x;
            this.accel.y = proto.accel.y;
            this.health = proto.health;
            this._killed = proto._killed;
            this.standing = proto.standing;
            this.type = proto.type;
            this.checkAgainst = proto.checkAgainst;
            this.collides = proto.collides;
            ig.merge(this, settings);
        },
        addAnim: function (name, frameTime, sequence, stop) {
            if (!this.animSheet) {
                throw ('No animSheet to add the animation ' + name + ' to.');
            }
            var a = new ig.Animation(this.animSheet, frameTime, sequence, stop);
            this.anims[name] = a;
            if (!this.currentAnim) {
                this.currentAnim = a;
            }
            return a;
        },
        update: function () {
            this.last.x = this.pos.x;
            this.last.y = this.pos.y;
            this.vel.y += ig.game.gravity * ig.system.tick * this.gravityFactor;
            this.vel.x = this.getNewVelocity(this.vel.x, this.accel.x, this.friction.x, this.maxVel.x);
            this.vel.y = this.getNewVelocity(this.vel.y, this.accel.y, this.friction.y, this.maxVel.y);
            var mx = this.vel.x * ig.system.tick;
            var my = this.vel.y * ig.system.tick;
            var res = ig.game.collisionMap.trace(this.pos.x, this.pos.y, mx, my, this.size.x, this.size.y);
            this.handleMovementTrace(res);
            if (this.currentAnim) {
                this.currentAnim.update();
            }
        },
        getNewVelocity: function (vel, accel, friction, max) {
            if (accel) {
                return (vel + accel * ig.system.tick).limit(-max, max);
            } else if (friction) {
                var delta = friction * ig.system.tick;
                if (vel - delta > 0) {
                    return vel - delta;
                } else if (vel + delta < 0) {
                    return vel + delta;
                } else {
                    return 0;
                }
            }
            return vel.limit(-max, max);
        },
        handleMovementTrace: function (res) {
            this.standing = false;
            if (res.collision.y) {
                if (this.bounciness > 0 && Math.abs(this.vel.y) > this.minBounceVelocity) {
                    this.vel.y *= -this.bounciness;
                } else {
                    if (this.vel.y > 0) {
                        this.standing = true;
                    }
                    this.vel.y = 0;
                }
            }
            if (res.collision.x) {
                if (this.bounciness > 0 && Math.abs(this.vel.x) > this.minBounceVelocity) {
                    this.vel.x *= -this.bounciness;
                } else {
                    this.vel.x = 0;
                }
            }
            if (res.collision.slope) {
                var s = res.collision.slope;
                if (this.bounciness > 0) {
                    var proj = this.vel.x * s.nx + this.vel.y * s.ny;
                    this.vel.x = (this.vel.x - s.nx * proj * 2) * this.bounciness;
                    this.vel.y = (this.vel.y - s.ny * proj * 2) * this.bounciness;
                } else {
                    var lengthSquared = s.x * s.x + s.y * s.y;
                    var dot = (this.vel.x * s.x + this.vel.y * s.y) / lengthSquared;
                    this.vel.x = s.x * dot;
                    this.vel.y = s.y * dot;
                    var angle = Math.atan2(s.x, s.y);
                    if (angle > this.slopeStanding.min && angle < this.slopeStanding.max) {
                        this.standing = true;
                    }
                }
            }
            this.pos = res.pos;
        },
        draw: function () {
            if (this.currentAnim) {
                this.currentAnim.draw(this.pos.x - this.offset.x - ig.game._rscreen.x, this.pos.y - this.offset.y - ig.game._rscreen.y);
            }
        },
        kill: function () {
            ig.game.removeEntity(this);
        },
        receiveDamage: function (amount, from) {
            this.health -= amount;
            if (this.health <= 0) {
                this.kill();
            }
        },
        touches: function (other) {
            return !(this.pos.x >= other.pos.x + other.size.x || this.pos.x + this.size.x <= other.pos.x || this.pos.y >= other.pos.y + other.size.y || this.pos.y + this.size.y <= other.pos.y);
        },
        distanceTo: function (other) {
            var xd = (this.pos.x + this.size.x / 2) - (other.pos.x + other.size.x / 2);
            var yd = (this.pos.y + this.size.y / 2) - (other.pos.y + other.size.y / 2);
            return Math.sqrt(xd * xd + yd * yd);
        },
        angleTo: function (other) {
            return Math.atan2((other.pos.y + other.size.y / 2) - (this.pos.y + this.size.y / 2), (other.pos.x + other.size.x / 2) - (this.pos.x + this.size.x / 2));
        },
        check: function (other) {},
        collideWith: function (other, axis) {},
        ready: function () {},
        erase: function () {}
    });
    ig.Entity._lastId = 0;
    ig.Entity.COLLIDES = {
        NEVER: 0,
        LITE: 1,
        PASSIVE: 2,
        ACTIVE: 4,
        FIXED: 8
    };
    ig.Entity.TYPE = {
        NONE: 0,
        A: 1,
        B: 2,
        BOTH: 3
    };
    ig.Entity.checkPair = function (a, b) {
        if (a.checkAgainst & b.type) {
            a.check(b);
        }
        if (b.checkAgainst & a.type) {
            b.check(a);
        }
        if (a.collides && b.collides && a.collides + b.collides > ig.Entity.COLLIDES.ACTIVE) {
            ig.Entity.solveCollision(a, b);
        }
    };
    ig.Entity.solveCollision = function (a, b) {
        var weak = null;
        if (a.collides == ig.Entity.COLLIDES.LITE || b.collides == ig.Entity.COLLIDES.FIXED) {
            weak = a;
        } else if (b.collides == ig.Entity.COLLIDES.LITE || a.collides == ig.Entity.COLLIDES.FIXED) {
            weak = b;
        }
        if (a.last.x + a.size.x > b.last.x && a.last.x < b.last.x + b.size.x) {
            if (a.last.y < b.last.y) {
                ig.Entity.seperateOnYAxis(a, b, weak);
            } else {
                ig.Entity.seperateOnYAxis(b, a, weak);
            }
            a.collideWith(b, 'y');
            b.collideWith(a, 'y');
        } else if (a.last.y + a.size.y > b.last.y && a.last.y < b.last.y + b.size.y) {
            if (a.last.x < b.last.x) {
                ig.Entity.seperateOnXAxis(a, b, weak);
            } else {
                ig.Entity.seperateOnXAxis(b, a, weak);
            }
            a.collideWith(b, 'x');
            b.collideWith(a, 'x');
        }
    };
    ig.Entity.seperateOnXAxis = function (left, right, weak) {
        var nudge = (left.pos.x + left.size.x - right.pos.x);
        if (weak) {
            var strong = left === weak ? right : left;
            weak.vel.x = -weak.vel.x * weak.bounciness + strong.vel.x;
            var resWeak = ig.game.collisionMap.trace(weak.pos.x, weak.pos.y, weak == left ? -nudge : nudge, 0, weak.size.x, weak.size.y);
            weak.pos.x = resWeak.pos.x;
        } else {
            var v2 = (left.vel.x - right.vel.x) / 2;
            left.vel.x = -v2;
            right.vel.x = v2;
            var resLeft = ig.game.collisionMap.trace(left.pos.x, left.pos.y, -nudge / 2, 0, left.size.x, left.size.y);
            left.pos.x = Math.floor(resLeft.pos.x);
            var resRight = ig.game.collisionMap.trace(right.pos.x, right.pos.y, nudge / 2, 0, right.size.x, right.size.y);
            right.pos.x = Math.ceil(resRight.pos.x);
        }
    };
    ig.Entity.seperateOnYAxis = function (top, bottom, weak) {
        var nudge = (top.pos.y + top.size.y - bottom.pos.y);
        if (weak) {
            var strong = top === weak ? bottom : top;
            weak.vel.y = -weak.vel.y * weak.bounciness + strong.vel.y;
            var nudgeX = 0;
            if (weak == top && Math.abs(weak.vel.y - strong.vel.y) < weak.minBounceVelocity) {
                weak.standing = true;
                nudgeX = strong.vel.x * ig.system.tick;
            }
            var resWeak = ig.game.collisionMap.trace(weak.pos.x, weak.pos.y, nudgeX, weak == top ? -nudge : nudge, weak.size.x, weak.size.y);
            weak.pos.y = resWeak.pos.y;
            weak.pos.x = resWeak.pos.x;
        } else if (ig.game.gravity && (bottom.standing || top.vel.y > 0)) {
            var resTop = ig.game.collisionMap.trace(top.pos.x, top.pos.y, 0, -(top.pos.y + top.size.y - bottom.pos.y), top.size.x, top.size.y);
            top.pos.y = resTop.pos.y;
            if (top.bounciness > 0 && top.vel.y > top.minBounceVelocity) {
                top.vel.y *= -top.bounciness;
            } else {
                top.standing = true;
                top.vel.y = 0;
            }
        } else {
            var v2 = (top.vel.y - bottom.vel.y) / 2;
            top.vel.y = -v2;
            bottom.vel.y = v2;
            var nudgeX = bottom.vel.x * ig.system.tick;
            var resTop = ig.game.collisionMap.trace(top.pos.x, top.pos.y, nudgeX, -nudge / 2, top.size.x, top.size.y);
            top.pos.y = resTop.pos.y;
            var resBottom = ig.game.collisionMap.trace(bottom.pos.x, bottom.pos.y, 0, nudge / 2, bottom.size.x, bottom.size.y);
            bottom.pos.y = resBottom.pos.y;
        }
    };
});

// lib/impact/map.js
ig.baked = true;
ig.module('impact.map').defines(function () {
    "use strict";
    ig.Map = ig.Class.extend({
        tilesize: 8,
        width: 1,
        height: 1,
        data: [
            []
        ],
        name: null,
        init: function (tilesize, data) {
            this.tilesize = tilesize;
            this.data = data;
            this.height = data.length;
            this.width = data[0].length;
            this.pxWidth = this.width * this.tilesize;
            this.pxHeight = this.height * this.tilesize;
        },
        getTile: function (x, y) {
            var tx = Math.floor(x / this.tilesize);
            var ty = Math.floor(y / this.tilesize);
            if ((tx >= 0 && tx < this.width) && (ty >= 0 && ty < this.height)) {
                return this.data[ty][tx];
            } else {
                return 0;
            }
        },
        setTile: function (x, y, tile) {
            var tx = Math.floor(x / this.tilesize);
            var ty = Math.floor(y / this.tilesize);
            if ((tx >= 0 && tx < this.width) && (ty >= 0 && ty < this.height)) {
                this.data[ty][tx] = tile;
            }
        }
    });
});

// lib/impact/collision-map.js
ig.baked = true;
ig.module('impact.collision-map').requires('impact.map').defines(function () {
    "use strict";
    ig.CollisionMap = ig.Map.extend({
        lastSlope: 1,
        tiledef: null,
        init: function (tilesize, data, tiledef) {
            this.parent(tilesize, data);
            this.tiledef = tiledef || ig.CollisionMap.defaultTileDef;
            for (var t in this.tiledef) {
                if (t | 0 > this.lastSlope) {
                    this.lastSlope = t | 0;
                }
            }
        },
        trace: function (x, y, vx, vy, objectWidth, objectHeight) {
            var res = {
                collision: {
                    x: false,
                    y: false,
                    slope: false
                },
                pos: {
                    x: x,
                    y: y
                },
                tile: {
                    x: 0,
                    y: 0
                }
            };
            var steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vy)) / this.tilesize);
            if (steps > 1) {
                var sx = vx / steps;
                var sy = vy / steps;
                for (var i = 0; i < steps && (sx || sy); i++) {
                    this._traceStep(res, x, y, sx, sy, objectWidth, objectHeight, vx, vy, i);
                    x = res.pos.x;
                    y = res.pos.y;
                    if (res.collision.x) {
                        sx = 0;
                        vx = 0;
                    }
                    if (res.collision.y) {
                        sy = 0;
                        vy = 0;
                    }
                    if (res.collision.slope) {
                        break;
                    }
                }
            } else {
                this._traceStep(res, x, y, vx, vy, objectWidth, objectHeight, vx, vy, 0);
            }
            return res;
        },
        _traceStep: function (res, x, y, vx, vy, width, height, rvx, rvy, step) {
            res.pos.x += vx;
            res.pos.y += vy;
            var t = 0;
            if (vx) {
                var pxOffsetX = (vx > 0 ? width : 0);
                var tileOffsetX = (vx < 0 ? this.tilesize : 0);
                var firstTileY = Math.max(Math.floor(y / this.tilesize), 0);
                var lastTileY = Math.min(Math.ceil((y + height) / this.tilesize), this.height);
                var tileX = Math.floor((res.pos.x + pxOffsetX) / this.tilesize);
                var prevTileX = Math.floor((x + pxOffsetX) / this.tilesize);
                if (step > 0 || tileX == prevTileX || prevTileX < 0 || prevTileX >= this.width) {
                    prevTileX = -1;
                }
                if (tileX >= 0 && tileX < this.width) {
                    for (var tileY = firstTileY; tileY < lastTileY; tileY++) {
                        if (prevTileX != -1) {
                            t = this.data[tileY][prevTileX];
                            if (t > 1 && t <= this.lastSlope && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, prevTileX, tileY)) {
                                break;
                            }
                        }
                        t = this.data[tileY][tileX];
                        if (t == 1 || t > this.lastSlope || (t > 1 && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, tileY))) {
                            if (t > 1 && t <= this.lastSlope && res.collision.slope) {
                                break;
                            }
                            res.collision.x = true;
                            res.tile.x = t;
                            x = res.pos.x = tileX * this.tilesize - pxOffsetX + tileOffsetX;
                            rvx = 0;
                            break;
                        }
                    }
                }
            }
            if (vy) {
                var pxOffsetY = (vy > 0 ? height : 0);
                var tileOffsetY = (vy < 0 ? this.tilesize : 0);
                var firstTileX = Math.max(Math.floor(res.pos.x / this.tilesize), 0);
                var lastTileX = Math.min(Math.ceil((res.pos.x + width) / this.tilesize), this.width);
                var tileY = Math.floor((res.pos.y + pxOffsetY) / this.tilesize);
                var prevTileY = Math.floor((y + pxOffsetY) / this.tilesize);
                if (step > 0 || tileY == prevTileY || prevTileY < 0 || prevTileY >= this.height) {
                    prevTileY = -1;
                }
                if (tileY >= 0 && tileY < this.height) {
                    for (var tileX = firstTileX; tileX < lastTileX; tileX++) {
                        if (prevTileY != -1) {
                            t = this.data[prevTileY][tileX];
                            if (t > 1 && t <= this.lastSlope && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, prevTileY)) {
                                break;
                            }
                        }
                        t = this.data[tileY][tileX];
                        if (t == 1 || t > this.lastSlope || (t > 1 && this._checkTileDef(res, t, x, y, rvx, rvy, width, height, tileX, tileY))) {
                            if (t > 1 && t <= this.lastSlope && res.collision.slope) {
                                break;
                            }
                            res.collision.y = true;
                            res.tile.y = t;
                            res.pos.y = tileY * this.tilesize - pxOffsetY + tileOffsetY;
                            break;
                        }
                    }
                }
            }
        },
        _checkTileDef: function (res, t, x, y, vx, vy, width, height, tileX, tileY) {
            var def = this.tiledef[t];
            if (!def) {
                return false;
            }
            var lx = (tileX + def[0]) * this.tilesize,
                ly = (tileY + def[1]) * this.tilesize,
                lvx = (def[2] - def[0]) * this.tilesize,
                lvy = (def[3] - def[1]) * this.tilesize,
                solid = def[4];
            var tx = x + vx + (lvy < 0 ? width : 0) - lx,
                ty = y + vy + (lvx > 0 ? height : 0) - ly;
            if (lvx * ty - lvy * tx > 0) {
                if (vx * -lvy + vy * lvx < 0) {
                    return solid;
                }
                var length = Math.sqrt(lvx * lvx + lvy * lvy);
                var nx = lvy / length,
                    ny = -lvx / length;
                var proj = tx * nx + ty * ny;
                var px = nx * proj,
                    py = ny * proj;
                if (px * px + py * py >= vx * vx + vy * vy) {
                    return solid || (lvx * (ty - vy) - lvy * (tx - vx) < 0.5);
                }
                res.pos.x = x + vx - px;
                res.pos.y = y + vy - py;
                res.collision.slope = {
                    x: lvx,
                    y: lvy,
                    nx: nx,
                    ny: ny
                };
                return true;
            }
            return false;
        }
    });
    var H = 1 / 2,
        N = 1 / 3,
        M = 2 / 3,
        SOLID = true,
        NON_SOLID = false;
    ig.CollisionMap.defaultTileDef = {
        5: [0, 1, 1, M, SOLID],
        6: [0, M, 1, N, SOLID],
        7: [0, N, 1, 0, SOLID],
        3: [0, 1, 1, H, SOLID],
        4: [0, H, 1, 0, SOLID],
        2: [0, 1, 1, 0, SOLID],
        10: [H, 1, 1, 0, SOLID],
        21: [0, 1, H, 0, SOLID],
        32: [M, 1, 1, 0, SOLID],
        43: [N, 1, M, 0, SOLID],
        54: [0, 1, N, 0, SOLID],
        27: [0, 0, 1, N, SOLID],
        28: [0, N, 1, M, SOLID],
        29: [0, M, 1, 1, SOLID],
        25: [0, 0, 1, H, SOLID],
        26: [0, H, 1, 1, SOLID],
        24: [0, 0, 1, 1, SOLID],
        11: [0, 0, H, 1, SOLID],
        22: [H, 0, 1, 1, SOLID],
        33: [0, 0, N, 1, SOLID],
        44: [N, 0, M, 1, SOLID],
        55: [M, 0, 1, 1, SOLID],
        16: [1, N, 0, 0, SOLID],
        17: [1, M, 0, N, SOLID],
        18: [1, 1, 0, M, SOLID],
        14: [1, H, 0, 0, SOLID],
        15: [1, 1, 0, H, SOLID],
        13: [1, 1, 0, 0, SOLID],
        8: [H, 1, 0, 0, SOLID],
        19: [1, 1, H, 0, SOLID],
        30: [N, 1, 0, 0, SOLID],
        41: [M, 1, N, 0, SOLID],
        52: [1, 1, M, 0, SOLID],
        38: [1, M, 0, 1, SOLID],
        39: [1, N, 0, M, SOLID],
        40: [1, 0, 0, N, SOLID],
        36: [1, H, 0, 1, SOLID],
        37: [1, 0, 0, H, SOLID],
        35: [1, 0, 0, 1, SOLID],
        9: [1, 0, H, 1, SOLID],
        20: [H, 0, 0, 1, SOLID],
        31: [1, 0, M, 1, SOLID],
        42: [M, 0, N, 1, SOLID],
        53: [N, 0, 0, 1, SOLID],
        12: [0, 0, 1, 0, NON_SOLID],
        23: [1, 1, 0, 1, NON_SOLID],
        34: [1, 0, 1, 1, NON_SOLID],
        45: [0, 1, 0, 0, NON_SOLID]
    };
    ig.CollisionMap.staticNoCollision = {
        trace: function (x, y, vx, vy) {
            return {
                collision: {
                    x: false,
                    y: false,
                    slope: false
                },
                pos: {
                    x: x + vx,
                    y: y + vy
                },
                tile: {
                    x: 0,
                    y: 0
                }
            };
        }
    };
});

// lib/impact/background-map.js
ig.baked = true;
ig.module('impact.background-map').requires('impact.map', 'impact.image').defines(function () {
    "use strict";
    ig.BackgroundMap = ig.Map.extend({
        tiles: null,
        scroll: {
            x: 0,
            y: 0
        },
        distance: 1,
        repeat: false,
        tilesetName: '',
        foreground: false,
        enabled: true,
        preRender: false,
        preRenderedChunks: null,
        chunkSize: 512,
        debugChunks: false,
        anims: {},
        init: function (tilesize, data, tileset) {
            this.parent(tilesize, data);
            this.setTileset(tileset);
        },
        setTileset: function (tileset) {
            this.tilesetName = tileset instanceof ig.Image ? tileset.path : tileset;
            this.tiles = new ig.Image(this.tilesetName);
            this.preRenderedChunks = null;
        },
        setScreenPos: function (x, y) {
            this.scroll.x = x / this.distance;
            this.scroll.y = y / this.distance;
        },
        preRenderMapToChunks: function () {
            var totalWidth = this.width * this.tilesize * ig.system.scale,
                totalHeight = this.height * this.tilesize * ig.system.scale;
            this.chunkSize = Math.min(Math.max(totalWidth, totalHeight), this.chunkSize);
            var chunkCols = Math.ceil(totalWidth / this.chunkSize),
                chunkRows = Math.ceil(totalHeight / this.chunkSize);
            this.preRenderedChunks = [];
            for (var y = 0; y < chunkRows; y++) {
                this.preRenderedChunks[y] = [];
                for (var x = 0; x < chunkCols; x++) {
                    var chunkWidth = (x == chunkCols - 1) ? totalWidth - x * this.chunkSize : this.chunkSize;
                    var chunkHeight = (y == chunkRows - 1) ? totalHeight - y * this.chunkSize : this.chunkSize;
                    this.preRenderedChunks[y][x] = this.preRenderChunk(x, y, chunkWidth, chunkHeight);
                }
            }
        },
        preRenderChunk: function (cx, cy, w, h) {
            var tw = w / this.tilesize / ig.system.scale + 1,
                th = h / this.tilesize / ig.system.scale + 1;
            var nx = (cx * this.chunkSize / ig.system.scale) % this.tilesize,
                ny = (cy * this.chunkSize / ig.system.scale) % this.tilesize;
            var tx = Math.floor(cx * this.chunkSize / this.tilesize / ig.system.scale),
                ty = Math.floor(cy * this.chunkSize / this.tilesize / ig.system.scale);
            var chunk = ig.$new('canvas');
            chunk.width = w;
            chunk.height = h;
            chunk.retinaResolutionEnabled = false;
            var chunkContext = chunk.getContext('2d');
            ig.System.scaleMode(chunk, chunkContext);
            var screenContext = ig.system.context;
            ig.system.context = chunkContext;
            for (var x = 0; x < tw; x++) {
                for (var y = 0; y < th; y++) {
                    if (x + tx < this.width && y + ty < this.height) {
                        var tile = this.data[y + ty][x + tx];
                        if (tile) {
                            this.tiles.drawTile(x * this.tilesize - nx, y * this.tilesize - ny, tile - 1, this.tilesize);
                        }
                    }
                }
            }
            ig.system.context = screenContext;
            return chunk;
        },
        draw: function () {
            if (!this.tiles.loaded || !this.enabled) {
                return;
            }
            if (this.preRender) {
                this.drawPreRendered();
            } else {
                this.drawTiled();
            }
        },
        drawPreRendered: function () {
            if (!this.preRenderedChunks) {
                this.preRenderMapToChunks();
            }
            var dx = ig.system.getDrawPos(this.scroll.x),
                dy = ig.system.getDrawPos(this.scroll.y);
            if (this.repeat) {
                var w = this.width * this.tilesize * ig.system.scale;
                dx = (dx % w + w) % w;
                var h = this.height * this.tilesize * ig.system.scale;
                dy = (dy % h + h) % h;
            }
            var minChunkX = Math.max(Math.floor(dx / this.chunkSize), 0),
                minChunkY = Math.max(Math.floor(dy / this.chunkSize), 0),
                maxChunkX = Math.ceil((dx + ig.system.realWidth) / this.chunkSize),
                maxChunkY = Math.ceil((dy + ig.system.realHeight) / this.chunkSize),
                maxRealChunkX = this.preRenderedChunks[0].length,
                maxRealChunkY = this.preRenderedChunks.length;
            if (!this.repeat) {
                maxChunkX = Math.min(maxChunkX, maxRealChunkX);
                maxChunkY = Math.min(maxChunkY, maxRealChunkY);
            }
            var nudgeY = 0;
            for (var cy = minChunkY; cy < maxChunkY; cy++) {
                var nudgeX = 0;
                for (var cx = minChunkX; cx < maxChunkX; cx++) {
                    var chunk = this.preRenderedChunks[cy % maxRealChunkY][cx % maxRealChunkX];
                    var x = -dx + cx * this.chunkSize - nudgeX;
                    var y = -dy + cy * this.chunkSize - nudgeY;
                    ig.system.context.drawImage(chunk, x, y);
                    ig.Image.drawCount++;
                    if (this.debugChunks) {
                        ig.system.context.strokeStyle = '#f0f';
                        ig.system.context.strokeRect(x, y, this.chunkSize, this.chunkSize);
                    }
                    if (this.repeat && chunk.width < this.chunkSize && x + chunk.width < ig.system.realWidth) {
                        nudgeX += this.chunkSize - chunk.width;
                        maxChunkX++;
                    }
                }
                if (this.repeat && chunk.height < this.chunkSize && y + chunk.height < ig.system.realHeight) {
                    nudgeY += this.chunkSize - chunk.height;
                    maxChunkY++;
                }
            }
        },
        drawTiled: function () {
            var tile = 0,
                anim = null,
                tileOffsetX = (this.scroll.x / this.tilesize).toInt(),
                tileOffsetY = (this.scroll.y / this.tilesize).toInt(),
                pxOffsetX = this.scroll.x % this.tilesize,
                pxOffsetY = this.scroll.y % this.tilesize,
                pxMinX = -pxOffsetX - this.tilesize,
                pxMinY = -pxOffsetY - this.tilesize,
                pxMaxX = ig.system.width + this.tilesize - pxOffsetX,
                pxMaxY = ig.system.height + this.tilesize - pxOffsetY;
            for (var mapY = -1, pxY = pxMinY; pxY < pxMaxY; mapY++, pxY += this.tilesize) {
                var tileY = mapY + tileOffsetY;
                if (tileY >= this.height || tileY < 0) {
                    if (!this.repeat) {
                        continue;
                    }
                    tileY = (tileY % this.height + this.height) % this.height;
                }
                for (var mapX = -1, pxX = pxMinX; pxX < pxMaxX; mapX++, pxX += this.tilesize) {
                    var tileX = mapX + tileOffsetX;
                    if (tileX >= this.width || tileX < 0) {
                        if (!this.repeat) {
                            continue;
                        }
                        tileX = (tileX % this.width + this.width) % this.width;
                    }
                    if ((tile = this.data[tileY][tileX])) {
                        if ((anim = this.anims[tile - 1])) {
                            anim.draw(pxX, pxY);
                        } else {
                            this.tiles.drawTile(pxX, pxY, tile - 1, this.tilesize);
                        }
                    }
                }
            }
        }
    });
});

// lib/impact/game.js
ig.baked = true;
ig.module('impact.game').requires('impact.impact', 'impact.entity', 'impact.collision-map', 'impact.background-map').defines(function () {
    "use strict";
    ig.Game = ig.Class.extend({
        clearColor: '#000000',
        gravity: 0,
        screen: {
            x: 0,
            y: 0
        },
        _rscreen: {
            x: 0,
            y: 0
        },
        entities: [],
        namedEntities: {},
        collisionMap: ig.CollisionMap.staticNoCollision,
        backgroundMaps: [],
        backgroundAnims: {},
        autoSort: false,
        sortBy: null,
        cellSize: 64,
        _deferredKill: [],
        _levelToLoad: null,
        _doSortEntities: false,
        staticInstantiate: function () {
            this.sortBy = this.sortBy || ig.Game.SORT.Z_INDEX;
            ig.game = this;
            return null;
        },
        loadLevel: function (data) {
            this.screen = {
                x: 0,
                y: 0
            };
            this.entities = [];
            this.namedEntities = {};
            for (var i = 0; i < data.entities.length; i++) {
                var ent = data.entities[i];
                this.spawnEntity(ent.type, ent.x, ent.y, ent.settings);
            }
            this.sortEntities();
            this.collisionMap = ig.CollisionMap.staticNoCollision;
            this.backgroundMaps = [];
            for (var i = 0; i < data.layer.length; i++) {
                var ld = data.layer[i];
                if (ld.name == 'collision') {
                    this.collisionMap = new ig.CollisionMap(ld.tilesize, ld.data);
                } else {
                    var newMap = new ig.BackgroundMap(ld.tilesize, ld.data, ld.tilesetName);
                    newMap.anims = this.backgroundAnims[ld.tilesetName] || {};
                    newMap.repeat = ld.repeat;
                    newMap.distance = ld.distance;
                    newMap.foreground = !!ld.foreground;
                    newMap.preRender = !!ld.preRender;
                    newMap.name = ld.name;
                    this.backgroundMaps.push(newMap);
                }
            }
            for (var i = 0; i < this.entities.length; i++) {
                this.entities[i].ready();
            }
        },
        loadLevelDeferred: function (data) {
            this._levelToLoad = data;
        },
        getMapByName: function (name) {
            if (name == 'collision') {
                return this.collisionMap;
            }
            for (var i = 0; i < this.backgroundMaps.length; i++) {
                if (this.backgroundMaps[i].name == name) {
                    return this.backgroundMaps[i];
                }
            }
            return null;
        },
        getEntityByName: function (name) {
            return this.namedEntities[name];
        },
        getEntitiesByType: function (type) {
            var entityClass = typeof (type) === 'string' ? ig.global[type] : type;
            var a = [];
            for (var i = 0; i < this.entities.length; i++) {
                var ent = this.entities[i];
                if (ent instanceof entityClass && !ent._killed) {
                    a.push(ent);
                }
            }
            return a;
        },
        spawnEntity: function (type, x, y, settings) {
            var entityClass = typeof (type) === 'string' ? ig.global[type] : type;
            if (!entityClass) {
                throw ("Can't spawn entity of type " + type);
            }
            var ent = new(entityClass)(x, y, settings || {});
            this.entities.push(ent);
            if (ent.name) {
                this.namedEntities[ent.name] = ent;
            }
            return ent;
        },
        sortEntities: function () {
            this.entities.sort(this.sortBy);
        },
        sortEntitiesDeferred: function () {
            this._doSortEntities = true;
        },
        removeEntity: function (ent) {
            if (ent.name) {
                delete this.namedEntities[ent.name];
            }
            ent._killed = true;
            ent.type = ig.Entity.TYPE.NONE;
            ent.checkAgainst = ig.Entity.TYPE.NONE;
            ent.collides = ig.Entity.COLLIDES.NEVER;
            this._deferredKill.push(ent);
        },
        run: function () {
            this.update();
            this.draw();
        },
        update: function () {
            if (this._levelToLoad) {
                this.loadLevel(this._levelToLoad);
                this._levelToLoad = null;
            }
            this.updateEntities();
            this.checkEntities();
            for (var i = 0; i < this._deferredKill.length; i++) {
                this._deferredKill[i].erase();
                this.entities.erase(this._deferredKill[i]);
            }
            this._deferredKill = [];
            if (this._doSortEntities || this.autoSort) {
                this.sortEntities();
                this._doSortEntities = false;
            }
            for (var tileset in this.backgroundAnims) {
                var anims = this.backgroundAnims[tileset];
                for (var a in anims) {
                    anims[a].update();
                }
            }
        },
        updateEntities: function () {
            for (var i = 0; i < this.entities.length; i++) {
                var ent = this.entities[i];
                if (!ent._killed) {
                    ent.update();
                }
            }
        },
        draw: function () {
            if (this.clearColor) {
                ig.system.clear(this.clearColor);
            }
            this._rscreen.x = ig.system.getDrawPos(this.screen.x) / ig.system.scale;
            this._rscreen.y = ig.system.getDrawPos(this.screen.y) / ig.system.scale;
            var mapIndex;
            for (mapIndex = 0; mapIndex < this.backgroundMaps.length; mapIndex++) {
                var map = this.backgroundMaps[mapIndex];
                if (map.foreground) {
                    break;
                }
                map.setScreenPos(this.screen.x, this.screen.y);
                map.draw();
            }
            this.drawEntities();
            for (mapIndex; mapIndex < this.backgroundMaps.length; mapIndex++) {
                var map = this.backgroundMaps[mapIndex];
                map.setScreenPos(this.screen.x, this.screen.y);
                map.draw();
            }
        },
        drawEntities: function () {
            for (var i = 0; i < this.entities.length; i++) {
                this.entities[i].draw();
            }
        },
        checkEntities: function () {
            var hash = {};
            for (var e = 0; e < this.entities.length; e++) {
                var entity = this.entities[e];
                if (entity.type == ig.Entity.TYPE.NONE && entity.checkAgainst == ig.Entity.TYPE.NONE && entity.collides == ig.Entity.COLLIDES.NEVER) {
                    continue;
                }
                var checked = {},
                    xmin = Math.floor(entity.pos.x / this.cellSize),
                    ymin = Math.floor(entity.pos.y / this.cellSize),
                    xmax = Math.floor((entity.pos.x + entity.size.x) / this.cellSize) + 1,
                    ymax = Math.floor((entity.pos.y + entity.size.y) / this.cellSize) + 1;
                for (var x = xmin; x < xmax; x++) {
                    for (var y = ymin; y < ymax; y++) {
                        if (!hash[x]) {
                            hash[x] = {};
                            hash[x][y] = [entity];
                        } else if (!hash[x][y]) {
                            hash[x][y] = [entity];
                        } else {
                            var cell = hash[x][y];
                            for (var c = 0; c < cell.length; c++) {
                                if (entity.touches(cell[c]) && !checked[cell[c].id]) {
                                    checked[cell[c].id] = true;
                                    ig.Entity.checkPair(entity, cell[c]);
                                }
                            }
                            cell.push(entity);
                        }
                    }
                }
            }
        }
    });
    ig.Game.SORT = {
        Z_INDEX: function (a, b) {
            return a.zIndex - b.zIndex;
        },
        POS_X: function (a, b) {
            return (a.pos.x + a.size.x) - (b.pos.x + b.size.x);
        },
        POS_Y: function (a, b) {
            return (a.pos.y + a.size.y) - (b.pos.y + b.size.y);
        }
    };
});

// lib/game/menus.js
ig.baked = true;
ig.module('game.menus').requires('impact.font').defines(function () {
    MenuItem = ig.Class.extend({
        getText: function () {
            return 'none'
        },
        left: function () {},
        right: function () {},
        ok: function () {},
        click: function () {
            this.ok();
            ig.system.canvas.style.cursor = 'auto';
        }
    });
    Menu = ig.Class.extend({
        clearColor: null,
        name: null,
        font: new ig.Font('media/fonts/tungsten-18.png'),
        fontSelected: new ig.Font('media/fonts/tungsten-18-orange.png'),
        fontTitle: new ig.Font('media/fonts/tungsten-48.png'),
        current: 0,
        itemClasses: [],
        items: [],
        init: function () {
            this.y = ig.system.height / 4 + 160;
            for (var i = 0; i < this.itemClasses.length; i++) {
                this.items.push(new this.itemClasses[i]());
            }
        },
        update: function () {
            if (ig.input.pressed('up')) {
                this.current--;
            }
            if (ig.input.pressed('down')) {
                this.current++;
            }
            this.current = this.current.limit(0, this.items.length - 1);
            if (ig.input.pressed('left')) {
                this.items[this.current].left();
            }
            if (ig.input.pressed('right')) {
                this.items[this.current].right();
            }
            if (ig.input.pressed('ok')) {
                this.items[this.current].ok();
            }
            var ys = this.y;
            var xs = ig.system.width / 2;
            var hoverItem = null;
            for (var i = 0; i < this.items.length; i++) {
                var item = this.items[i];
                var w = this.font.widthForString(item.getText()) / 2;
                if (ig.input.mouse.x > xs - w && ig.input.mouse.x < xs + w && ig.input.mouse.y > ys && ig.input.mouse.y < ys + 24) {
                    hoverItem = item;
                    this.current = i;
                }
                ys += 30;
            }
            if (hoverItem) {
                ig.system.canvas.style.cursor = 'pointer';
                if (ig.input.pressed('click')) {
                    hoverItem.click();
                }
            } else {
                ig.system.canvas.style.cursor = 'auto';
            }
        },
        draw: function () {
            if (this.clearColor) {
                ig.system.context.fillStyle = this.clearColor;
                ig.system.context.fillRect(0, 0, ig.system.width, ig.system.height);
            }
            var xs = ig.system.width / 2;
            var ys = this.y;
            if (this.name) {
                this.fontTitle.draw(this.name, xs, ys - 160, ig.Font.ALIGN.CENTER);
            }
            for (var i = 0; i < this.items.length; i++) {
                var t = this.items[i].getText();
                if (i == this.current) {
                    this.fontSelected.draw(t, xs, ys, ig.Font.ALIGN.CENTER);
                } else {
                    this.font.draw(t, xs, ys, ig.Font.ALIGN.CENTER);
                }
                ys += 30;
            }
        }
    });
    MenuItemSoundVolume = MenuItem.extend({
        getText: function () {
            return 'Sound Volume: < ' + (ig.soundManager.volume * 100).round() + '% >';
        },
        left: function () {
            ig.soundManager.volume = (ig.soundManager.volume - 0.1).limit(0, 1);
        },
        right: function () {
            ig.soundManager.volume = (ig.soundManager.volume + 0.1).limit(0, 1);
        },
        click: function () {
            if (ig.input.mouse.x > 220) {
                this.right();
            } else {
                this.left();
            }
        }
    });
    MenuItemMusicVolume = MenuItem.extend({
        getText: function () {
            return 'Music Volume: < ' + (ig.music.volume * 100).round() + '% >';
        },
        left: function () {
            ig.music.volume = (ig.music.volume - 0.1).limit(0, 1);
        },
        right: function () {
            ig.music.volume = (ig.music.volume + 0.1).limit(0, 1);
        },
        click: function () {
            if (ig.input.mouse.x > 220) {
                this.right();
            } else {
                this.left();
            }
        }
    });
    MenuItemResume = MenuItem.extend({
        getText: function () {
            return 'Resume';
        },
        ok: function () {
            ig.game.toggleMenu();
        }
    });
    PauseMenu = Menu.extend({
        name: 'Menu',
        clearColor: 'rgba(0,0,0,0.9)',
        itemClasses: [MenuItemSoundVolume, MenuItemMusicVolume, MenuItemResume]
    });
    MenuItemNormalMode = MenuItem.extend({
        getText: function () {
            return 'Play Normal Mode';
        },
        ok: function () {
            ig.game.difficulty = 'NORMAL';
            ig.game.setGame();
        }
    });
    MenuItemExpertMode = MenuItem.extend({
        getText: function () {
            return 'Play Expert Mode';
        },
        ok: function () {
            ig.game.difficulty = 'EXPERT';
            ig.game.setGame();
        }
    });
    MenuItemSoundMenu = MenuItem.extend({
        getText: function () {
            return 'Sound Menu/Pause (ESC Key)';
        },
        ok: function () {
            ig.game.toggleMenu();
        }
    });
    TitleMenu = Menu.extend({
        itemClasses: [MenuItemNormalMode, MenuItemExpertMode, MenuItemSoundMenu]
    });
    MenuItemBack = MenuItem.extend({
        getText: function () {
            return 'Back to Title';
        },
        ok: function () {
            ig.game.setTitle();
        }
    });
    GameOverMenu = Menu.extend({
        init: function () {
            this.parent();
            this.y = ig.system.height / 4 + 240;
        },
        itemClasses: [MenuItemBack]
    });
});

// lib/game/words.js
ig.baked = true;
ig.module('game.words').defines(function () {
    WORDS = {
        2: ['am', 'an', 'as', 'at', 'be', 'by', 'cs', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'on', 'or', 'pi', 're', 'so', 'to', 'up', 'us', 'we'],
        3: ['act', 'add', 'age', 'ago', 'aid', 'aim', 'air', 'all', 'and', 'any', 'are', 'arm', 'art', 'ask', 'ate', 'bad', 'ban', 'bar', 'bed', 'bet', 'bid', 'big', 'bit', 'box', 'boy', 'bug', 'bus', 'but', 'buy', 'can', 'car', 'cat', 'cry', 'cup', 'cut', 'day', 'did', 'die', 'doe', 'dog', 'dry', 'due', 'eat', 'end', 'err', 'eye', 'fan', 'far', 'fed', 'few', 'fit', 'fix', 'fly', 'for', 'fry', 'fun', 'gap', 'gas', 'get', 'got', 'gun', 'guy', 'had', 'has', 'hat', 'her', 'hid', 'him', 'his', 'hit', 'hot', 'how', 'ice', 'ill', 'its', 'job', 'joy', 'key', 'kid', 'law', 'lay', 'led', 'leg', 'let', 'lie', 'log', 'lot', 'low', 'mad', 'man', 'map', 'may', 'men', 'met', 'mix', 'mod', 'net', 'new', 'nor', 'not', 'now', 'odd', 'off', 'oil', 'old', 'one', 'our', 'out', 'owe', 'own', 'pay', 'pen', 'per', 'pop', 'put', 'ran', 'raw', 'red', 'rid', 'row', 'run', 'sad', 'sat', 'saw', 'say', 'see', 'set', 'sex', 'she', 'sit', 'six', 'son', 'sum', 'sun', 'tax', 'tea', 'ten', 'the', 'tie', 'tin', 'too', 'top', 'try', 'two', 'use', 'van', 'via', 'war', 'was', 'way', 'who', 'why', 'win', 'won', 'yes', 'yet', 'you'],
        4: ['able', 'acts', 'adds', 'ages', 'aims', 'also', 'area', 'army', 'asks', 'away', 'back', 'ball', 'band', 'bank', 'bars', 'base', 'bear', 'been', 'best', 'bets', 'bids', 'bill', 'bind', 'bite', 'bits', 'blow', 'blue', 'boat', 'body', 'book', 'boot', 'bore', 'both', 'bugs', 'bulk', 'bury', 'busy', 'buys', 'byte', 'call', 'came', 'card', 'care', 'case', 'cell', 'cent', 'char', 'chip', 'city', 'club', 'clue', 'code', 'cold', 'come', 'cope', 'copy', 'core', 'cost', 'cure', 'cuts', 'dare', 'dark', 'data', 'date', 'days', 'dead', 'deal', 'dear', 'deem', 'deep', 'desk', 'died', 'dies', 'disc', 'disk', 'does', 'done', 'door', 'down', 'draw', 'drew', 'drop', 'dumb', 'dump', 'duty', 'each', 'ease', 'east', 'easy', 'eats', 'edge', 'edit', 'else', 'ends', 'even', 'ever', 'eyes', 'face', 'fact', 'fail', 'fair', 'fall', 'farm', 'fast', 'fate', 'fear', 'feed', 'feel', 'feet', 'fell', 'felt', 'file', 'fill', 'film', 'find', 'fine', 'fire', 'firm', 'fish', 'fits', 'five', 'flag', 'flat', 'flew', 'flow', 'folk', 'food', 'foot', 'form', 'four', 'free', 'from', 'full', 'fund', 'gain', 'game', 'gave', 'gets', 'girl', 'give', 'glad', 'goes', 'gone', 'good', 'grew', 'grow', 'hack', 'hair', 'half', 'hall', 'hand', 'hang', 'hard', 'harm', 'hate', 'have', 'head', 'hear', 'heat', 'held', 'hell', 'help', 'here', 'hide', 'high', 'hill', 'hint', 'hits', 'hold', 'hole', 'home', 'hope', 'host', 'hour', 'huge', 'hung', 'hunt', 'idea', 'inch', 'info', 'into', 'item', 'jobs', 'join', 'joke', 'jump', 'junk', 'just', 'keen', 'keep', 'kept', 'keys', 'kill', 'kind', 'king', 'knew', 'know', 'lack', 'lady', 'lain', 'land', 'last', 'late', 'laws', 'lazy', 'lead', 'leaf', 'left', 'legs', 'lend', 'less', 'lets', 'lied', 'lies', 'life', 'lift', 'like', 'line', 'link', 'list', 'live', 'load', 'loan', 'lock', 'logs', 'long', 'look', 'loop', 'lose', 'loss', 'lost', 'lots', 'love', 'luck', 'made', 'mail', 'main', 'make', 'many', 'mark', 'mass', 'mean', 'meet', 'mere', 'mess', 'mile', 'mind', 'mine', 'miss', 'mode', 'more', 'most', 'move', 'much', 'must', 'name', 'near', 'neck', 'need', 'news', 'next', 'nice', 'nine', 'none', 'note', 'numb', 'obey', 'odds', 'omit', 'once', 'ones', 'only', 'onto', 'open', 'ours', 'over', 'owed', 'owes', 'pack', 'page', 'paid', 'pain', 'pair', 'park', 'part', 'pass', 'past', 'path', 'pays', 'peak', 'pick', 'pile', 'pint', 'pipe', 'plan', 'play', 'plea', 'plot', 'plug', 'plus', 'poem', 'poet', 'poll', 'pool', 'poor', 'port', 'post', 'pull', 'pure', 'push', 'puts', 'putt', 'quit', 'race', 'rain', 'rare', 'rate', 'read', 'real', 'rely', 'rest', 'ride', 'rids', 'ring', 'rise', 'risk', 'road', 'role', 'roll', 'room', 'root', 'rule', 'runs', 'rush', 'safe', 'said', 'sake', 'sale', 'same', 'save', 'says', 'scan', 'seek', 'seem', 'seen', 'sees', 'self', 'sell', 'send', 'sent', 'sets', 'ship', 'shop', 'show', 'shut', 'side', 'sign', 'site', 'sits', 'size', 'slip', 'slow', 'soft', 'sold', 'some', 'soon', 'sort', 'spot', 'stay', 'step', 'stop', 'such', 'suit', 'sure', 'take', 'talk', 'tank', 'tape', 'task', 'team', 'tell', 'tend', 'term', 'test', 'text', 'than', 'that', 'them', 'then', 'they', 'thin', 'this', 'thus', 'tied', 'ties', 'till', 'time', 'told', 'took', 'town', 'trap', 'tree', 'trip', 'true', 'tune', 'turn', 'type', 'ugly', 'unit', 'upon', 'used', 'user', 'uses', 'vary', 'vast', 'very', 'vice', 'view', 'vote', 'wait', 'walk', 'wall', 'want', 'warm', 'warn', 'wash', 'ways', 'wear', 'week', 'well', 'went', 'were', 'west', 'what', 'when', 'whom', 'wide', 'wife', 'wild', 'will', 'wind', 'wine', 'wins', 'wire', 'wise', 'wish', 'with', 'word', 'wore', 'work', 'worn', 'year', 'your', 'zero'],
        5: ['about', 'above', 'abuse', 'acted', 'added', 'admit', 'adopt', 'after', 'again', 'agree', 'ahead', 'aimed', 'alarm', 'album', 'alias', 'alive', 'allow', 'alone', 'along', 'alter', 'among', 'amuse', 'angle', 'angry', 'annoy', 'apart', 'apple', 'apply', 'areas', 'argue', 'arise', 'aside', 'asked', 'avoid', 'awake', 'award', 'aware', 'awful', 'backs', 'badly', 'based', 'bases', 'basic', 'basis', 'bears', 'began', 'begin', 'begun', 'being', 'below', 'binds', 'bites', 'black', 'blame', 'blank', 'block', 'board', 'books', 'borne', 'bound', 'boxes', 'brand', 'break', 'brief', 'bring', 'broke', 'brown', 'build', 'built', 'bytes', 'calls', 'cards', 'cares', 'carry', 'cases', 'catch', 'cause', 'cease', 'chain', 'chair', 'chaos', 'chars', 'cheap', 'child', 'chips', 'chose', 'claim', 'class', 'clean', 'clear', 'clock', 'close', 'coded', 'codes', 'comes', 'costs', 'could', 'count', 'court', 'cover', 'crash', 'crazy', 'crisp', 'cross', 'cycle', 'daily', 'dated', 'dates', 'datum', 'deals', 'dealt', 'death', 'deems', 'delay', 'depth', 'digit', 'dirty', 'discs', 'ditto', 'doing', 'doors', 'doubt', 'dozen', 'drawn', 'draws', 'dream', 'drink', 'drive', 'drops', 'drove', 'dying', 'early', 'earth', 'eaten', 'edits', 'eight', 'elect', 'empty', 'ended', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'error', 'evens', 'event', 'every', 'exact', 'exist', 'extra', 'facts', 'fails', 'faith', 'falls', 'false', 'fancy', 'fatal', 'fault', 'feeds', 'feels', 'fewer', 'field', 'fight', 'filed', 'files', 'fills', 'final', 'finds', 'first', 'fixed', 'fixes', 'flash', 'flied', 'flies', 'float', 'floor', 'flown', 'folks', 'force', 'forms', 'forth', 'found', 'frame', 'fresh', 'fries', 'front', 'fully', 'funds', 'funny', 'gains', 'games', 'given', 'gives', 'glass', 'going', 'goods', 'grand', 'grant', 'graph', 'grave', 'great', 'green', 'grind', 'gross', 'group', 'grown', 'grows', 'guard', 'guess', 'guide', 'habit', 'hands', 'handy', 'hangs', 'happy', 'heads', 'heard', 'hears', 'heart', 'heavy', 'hello', 'helps', 'hence', 'hides', 'hints', 'holds', 'holes', 'hoped', 'hopes', 'horse', 'hotel', 'hours', 'house', 'human', 'hurry', 'ideal', 'ideas', 'image', 'imply', 'index', 'inner', 'input', 'issue', 'items', 'joins', 'joint', 'judge', 'jumps', 'keeps', 'kills', 'kinds', 'knock', 'known', 'knows', 'label', 'lacks', 'lands', 'large', 'lasts', 'later', 'leach', 'leads', 'learn', 'least', 'leave', 'legal', 'level', 'light', 'liked', 'likes', 'limit', 'lines', 'links', 'lists', 'lived', 'lives', 'loads', 'local', 'locks', 'logic', 'looks', 'loose', 'lorry', 'loses', 'lower', 'lucky', 'lunch', 'lying', 'magic', 'major', 'makes', 'march', 'marks', 'marry', 'match', 'maybe', 'means', 'meant', 'media', 'meets', 'merit', 'messy', 'metal', 'might', 'miles', 'minds', 'minor', 'mixed', 'mixes', 'model', 'money', 'month', 'moral', 'mouth', 'moved', 'moves', 'movie', 'music', 'naive', 'named', 'names', 'nasty', 'needs', 'never', 'nicer', 'night', 'noise', 'noisy', 'north', 'noted', 'notes', 'novel', 'occur', 'offer', 'often', 'older', 'omits', 'opens', 'order', 'other', 'ought', 'outer', 'owing', 'owner', 'pages', 'pairs', 'paper', 'parts', 'party', 'patch', 'pause', 'payed', 'peace', 'phase', 'phone', 'picks', 'piece', 'place', 'plain', 'plane', 'plans', 'plant', 'plays', 'plots', 'point', 'posts', 'pound', 'power', 'press', 'price', 'prime', 'print', 'prior', 'prone', 'proof', 'prove', 'pulls', 'putts', 'queue', 'quick', 'quiet', 'quite', 'quits', 'quote', 'radio', 'raise', 'range', 'rapid', 'rates', 'reach', 'react', 'reads', 'ready', 'refer', 'reply', 'right', 'river', 'rooms', 'rough', 'round', 'route', 'rules', 'sadly', 'safer', 'saint', 'sales', 'saved', 'saves', 'scale', 'scene', 'score', 'scrap', 'seeks', 'seems', 'sells', 'sends', 'sense', 'serve', 'seven', 'shall', 'shame', 'shape', 'share', 'sharp', 'sheet', 'shelf', 'shell', 'shift', 'shoot', 'shops', 'short', 'shown', 'shows', 'shuts', 'sides', 'sight', 'signs', 'silly', 'since', 'sites', 'sizes', 'skill', 'sleep', 'small', 'smile', 'solid', 'solve', 'sorry', 'sorts', 'sound', 'south', 'space', 'spare', 'speak', 'speed', 'spell', 'spend', 'spent', 'spite', 'split', 'spoke', 'spots', 'staff', 'stage', 'stand', 'start', 'state', 'stays', 'steal', 'stick', 'still', 'stock', 'stone', 'stood', 'stops', 'store', 'stuck', 'study', 'stuff', 'style', 'sugar', 'suits', 'table', 'taken', 'takes', 'talks', 'tanks', 'tapes', 'tasks', 'taste', 'teach', 'teeth', 'tells', 'tends', 'terms', 'tests', 'thank', 'their', 'there', 'these', 'thing', 'think', 'third', 'those', 'three', 'threw', 'throw', 'tight', 'timed', 'times', 'title', 'today', 'token', 'tooth', 'topic', 'total', 'touch', 'trace', 'track', 'train', 'traps', 'trash', 'treat', 'trees', 'trial', 'trick', 'tried', 'tries', 'truck', 'truly', 'trunk', 'trust', 'truth', 'turns', 'twice', 'tying', 'typed', 'types', 'under', 'unite', 'units', 'until', 'upper', 'upset', 'usage', 'users', 'using', 'usual', 'vague', 'valid', 'value', 'video', 'views', 'visit', 'vital', 'voice', 'votes', 'waits', 'walks', 'walls', 'wants', 'warns', 'waste', 'watch', 'water', 'wears', 'weeks', 'weird', 'wheel', 'where', 'which', 'while', 'white', 'whole', 'whose', 'wider', 'wills', 'woman', 'women', 'words', 'works', 'world', 'worry', 'worse', 'worst', 'worth', 'would', 'write', 'wrong', 'wrote', 'years', 'young', 'yours'],
        6: ['accept', 'access', 'accord', 'across', 'acting', 'action', 'active', 'actual', 'adding', 'adjust', 'admits', 'adopts', 'advice', 'advise', 'affair', 'affect', 'afford', 'afraid', 'agency', 'agreed', 'agrees', 'aiming', 'allows', 'almost', 'alters', 'always', 'amount', 'amused', 'amuses', 'animal', 'annoys', 'annual', 'answer', 'anyone', 'anyway', 'appeal', 'appear', 'argued', 'argues', 'arises', 'around', 'arrive', 'artist', 'asking', 'asleep', 'aspect', 'assume', 'assure', 'attach', 'attack', 'attend', 'author', 'autumn', 'avoids', 'backed', 'basing', 'became', 'become', 'before', 'begins', 'behalf', 'behave', 'behind', 'belong', 'better', 'beyond', 'bigger', 'binary', 'biting', 'bitten', 'boards', 'bodies', 'borrow', 'bother', 'bottle', 'bottom', 'bought', 'branch', 'breach', 'breaks', 'bridge', 'bright', 'brings', 'broken', 'bucket', 'budget', 'buffer', 'builds', 'buried', 'buries', 'button', 'buying', 'called', 'cannot', 'caught', 'caused', 'causes', 'chance', 'change', 'charge', 'choice', 'choose', 'chosen', 'church', 'circle', 'claims', 'clears', 'clever', 'closed', 'closer', 'closes', 'coding', 'coffee', 'column', 'coming', 'common', 'copied', 'copies', 'corner', 'counts', 'county', 'couple', 'course', 'covers', 'create', 'credit', 'crisis', 'crisps', 'cursor', 'cycles', 'damage', 'danger', 'dating', 'debate', 'decade', 'decent', 'decide', 'deduce', 'deemed', 'deeply', 'define', 'degree', 'delete', 'demand', 'depend', 'derive', 'design', 'desire', 'detail', 'detect', 'device', 'devote', 'differ', 'digits', 'dinner', 'direct', 'divide', 'dollar', 'domain', 'double', 'dozens', 'driven', 'driver', 'drives', 'during', 'easier', 'easily', 'eating', 'edited', 'editor', 'effect', 'effort', 'either', 'elects', 'enable', 'ending', 'enough', 'ensure', 'enters', 'entire', 'entity', 'eraser', 'errors', 'escape', 'evened', 'events', 'except', 'excess', 'excuse', 'exists', 'expand', 'expect', 'expert', 'extend', 'extent', 'factor', 'failed', 'fairly', 'fallen', 'family', 'famous', 'faster', 'father', 'faults', 'fewest', 'fields', 'figure', 'filing', 'filled', 'finger', 'finish', 'finite', 'firmly', 'fiscal', 'fishes', 'fitted', 'fixing', 'flight', 'floats', 'flying', 'follow', 'forced', 'forces', 'forget', 'forgot', 'formal', 'format', 'formed', 'former', 'fourth', 'freely', 'french', 'friend', 'future', 'gained', 'garden', 'gather', 'giving', 'global', 'gotten', 'grands', 'grants', 'grinds', 'ground', 'groups', 'growth', 'habits', 'handed', 'handle', 'hanged', 'happen', 'harder', 'hardly', 'having', 'headed', 'header', 'health', 'helped', 'hereby', 'hidden', 'hiding', 'higher', 'highly', 'honest', 'hoping', 'horses', 'ignore', 'images', 'impact', 'impose', 'inches', 'income', 'indeed', 'inform', 'inputs', 'insert', 'inside', 'insist', 'intend', 'invent', 'invite', 'issued', 'issues', 'itself', 'joined', 'killed', 'kindly', 'knocks', 'labels', 'lacked', 'ladies', 'landed', 'larger', 'latest', 'latter', 'layout', 'leaded', 'leader', 'learns', 'leaved', 'leaves', 'length', 'lesser', 'lesson', 'letter', 'levels', 'liable', 'lights', 'likely', 'liking', 'limits', 'linear', 'linked', 'listed', 'listen', 'little', 'living', 'loaded', 'locked', 'logged', 'longer', 'looked', 'losing', 'loudly', 'lowest', 'mainly', 'making', 'manage', 'manner', 'manual', 'marked', 'market', 'master', 'matter', 'medium', 'member', 'memory', 'merely', 'merits', 'method', 'middle', 'minded', 'minute', 'misled', 'missed', 'misses', 'misuse', 'mixing', 'models', 'modern', 'modify', 'moment', 'months', 'mostly', 'mother', 'motion', 'moving', 'myself', 'namely', 'naming', 'nation', 'nature', 'nearby', 'nearer', 'nearly', 'needed', 'nicest', 'nobody', 'normal', 'notice', 'notify', 'noting', 'number', 'object', 'obtain', 'occupy', 'occurs', 'offers', 'office', 'oldest', 'opened', 'oppose', 'option', 'orders', 'origin', 'others', 'output', 'owners', 'packet', 'papers', 'parent', 'partly', 'passed', 'passes', 'paying', 'people', 'period', 'permit', 'person', 'petrol', 'phrase', 'picked', 'pieces', 'placed', 'places', 'planet', 'played', 'please', 'plenty', 'pocket', 'points', 'police', 'policy', 'posted', 'pounds', 'powers', 'prefer', 'pretty', 'prices', 'prints', 'prompt', 'proper', 'proved', 'proves', 'public', 'pulled', 'purely', 'pushed', 'pushes', 'putted', 'quoted', 'quotes', 'raised', 'raises', 'random', 'rarely', 'rather', 'reader', 'really', 'reason', 'recall', 'recent', 'record', 'reduce', 'refers', 'refuse', 'regard', 'region', 'regret', 'reject', 'relate', 'remain', 'remark', 'remind', 'remote', 'remove', 'repair', 'repeat', 'report', 'resort', 'result', 'retain', 'return', 'reveal', 'review', 'rights', 'rubber', 'safely', 'safest', 'safety', 'sample', 'saving', 'saying', 'scheme', 'school', 'scores', 'screen', 'script', 'search', 'season', 'second', 'secret', 'secure', 'seeing', 'seemed', 'select', 'senior', 'serial', 'series', 'served', 'server', 'serves', 'settle', 'severe', 'shared', 'shares', 'should', 'showed', 'signal', 'signed', 'simple', 'simply', 'single', 'skills', 'slight', 'slower', 'slowly', 'smooth', 'social', 'solely', 'solved', 'solves', 'sooner', 'sorted', 'sought', 'sounds', 'source', 'spaces', 'speaks', 'speech', 'spells', 'spends', 'spirit', 'splits', 'spoken', 'spread', 'spring', 'square', 'stable', 'stages', 'stands', 'starts', 'stated', 'states', 'status', 'stayed', 'sticks', 'stones', 'stored', 'stores', 'stream', 'street', 'strict', 'strike', 'string', 'strong', 'struck', 'stupid', 'submit', 'subset', 'subtle', 'sudden', 'suffer', 'suited', 'summer', 'supply', 'surely', 'survey', 'switch', 'symbol', 'syntax', 'system', 'tables', 'taking', 'talked', 'target', 'taught', 'tested', 'thanks', 'theory', 'things', 'thinks', 'though', 'threat', 'thrown', 'throws', 'ticket', 'timing', 'titles', 'topics', 'toward', 'tracks', 'trains', 'travel', 'treats', 'trusts', 'trying', 'turned', 'twelve', 'twenty', 'typing', 'unable', 'unique', 'unless', 'unlike', 'update', 'upsets', 'useful', 'values', 'varied', 'varies', 'vastly', 'vector', 'virtue', 'vision', 'volume', 'waited', 'walked', 'wanted', 'warned', 'wasted', 'wastes', 'weapon', 'weight', 'wheels', 'whilst', 'widely', 'widest', 'willed', 'window', 'winter', 'wished', 'wishes', 'within', 'wonder', 'wooden', 'worded', 'worked', 'worker', 'worthy', 'writer', 'writes', 'yellow'],
        7: ['ability', 'absence', 'accepts', 'accords', 'account', 'achieve', 'acquire', 'actions', 'address', 'adopted', 'advance', 'advised', 'advises', 'affairs', 'affects', 'against', 'allowed', 'already', 'altered', 'amongst', 'amounts', 'amusing', 'ancient', 'annoyed', 'another', 'answers', 'anybody', 'apology', 'appears', 'applied', 'applies', 'approve', 'arguing', 'arrange', 'arrived', 'arrives', 'article', 'aspects', 'assumed', 'assumes', 'assured', 'assures', 'attempt', 'attends', 'attract', 'authors', 'average', 'avoided', 'awkward', 'backing', 'balance', 'battery', 'bearing', 'because', 'becomes', 'believe', 'belongs', 'benefit', 'besides', 'betting', 'between', 'bidding', 'biggest', 'binding', 'biology', 'bizarre', 'borrows', 'bothers', 'bracket', 'briefly', 'brother', 'brought', 'burying', 'calling', 'capable', 'capital', 'captain', 'careful', 'carried', 'carries', 'catches', 'causing', 'central', 'century', 'certain', 'chances', 'changed', 'changes', 'channel', 'chapter', 'charged', 'charges', 'cheaper', 'checked', 'chooses', 'circuit', 'citizen', 'claimed', 'clarify', 'classes', 'cleared', 'clearer', 'clearly', 'closely', 'closest', 'closing', 'collect', 'college', 'combine', 'command', 'comment', 'company', 'compare', 'complex', 'compose', 'compute', 'concept', 'concern', 'confirm', 'confuse', 'connect', 'consist', 'contact', 'contain', 'content', 'context', 'control', 'convert', 'copying', 'corners', 'correct', 'corrupt', 'costing', 'council', 'counted', 'counter', 'country', 'courses', 'covered', 'crashed', 'crashes', 'created', 'creates', 'culture', 'cumming', 'curious', 'current', 'cutting', 'damaged', 'damages', 'dealing', 'decided', 'decides', 'declare', 'deeming', 'default', 'defined', 'defines', 'degrees', 'deleted', 'deletes', 'deliver', 'demands', 'depends', 'derived', 'derives', 'designs', 'desired', 'desires', 'despite', 'destroy', 'details', 'detects', 'develop', 'devices', 'devoted', 'devotes', 'digital', 'directs', 'discuss', 'dislike', 'display', 'distant', 'disturb', 'divided', 'divides', 'drastic', 'drawing', 'drivers', 'driving', 'dropped', 'dubious', 'earlier', 'easiest', 'economy', 'editing', 'edition', 'editors', 'effects', 'efforts', 'elected', 'element', 'enables', 'ensured', 'ensures', 'entered', 'entitle', 'entries', 'equally', 'evening', 'exactly', 'examine', 'example', 'exclude', 'execute', 'existed', 'expands', 'expects', 'expense', 'experts', 'explain', 'express', 'extends', 'extract', 'extreme', 'factors', 'failing', 'failure', 'falling', 'farther', 'fashion', 'fastest', 'feature', 'federal', 'feeding', 'feeling', 'figures', 'filling', 'finally', 'finding', 'fingers', 'firstly', 'fitting', 'flashed', 'flashes', 'floated', 'follows', 'forcing', 'foreign', 'forever', 'forgets', 'forming', 'fortune', 'forward', 'freedom', 'friends', 'further', 'gaining', 'garbage', 'general', 'genuine', 'getting', 'granted', 'graphic', 'greater', 'greatly', 'grosses', 'grounds', 'growing', 'guessed', 'guesses', 'handing', 'handled', 'handles', 'hanging', 'happens', 'happily', 'hardest', 'harmful', 'heading', 'healthy', 'hearing', 'heavily', 'helpful', 'helping', 'herself', 'highest', 'himself', 'history', 'hitting', 'holding', 'holiday', 'however', 'hundred', 'husband', 'ignored', 'ignores', 'illegal', 'imagine', 'implied', 'implies', 'imposed', 'imposes', 'improve', 'incline', 'include', 'informs', 'initial', 'inserts', 'insists', 'install', 'instant', 'instead', 'integer', 'intends', 'invalid', 'invents', 'invited', 'invites', 'involve', 'isolate', 'issuing', 'joining', 'justify', 'keeping', 'killing', 'knocked', 'knowing', 'lacking', 'landing', 'largely', 'largest', 'leading', 'leaving', 'lecture', 'legally', 'lessons', 'letters', 'letting', 'library', 'limited', 'linking', 'listing', 'loading', 'locking', 'logging', 'logical', 'longest', 'looking', 'machine', 'managed', 'manager', 'manages', 'manuals', 'marking', 'massive', 'matches', 'matters', 'maximum', 'meaning', 'measure', 'medical', 'mediums', 'meeting', 'members', 'mention', 'message', 'methods', 'million', 'minding', 'minimal', 'minimum', 'minutes', 'mislead', 'missing', 'mistake', 'mistook', 'monitor', 'morning', 'natural', 'naughty', 'nearest', 'needing', 'neither', 'nervous', 'network', 'nothing', 'noticed', 'notices', 'nowhere', 'numbers', 'numbest', 'objects', 'obscure', 'observe', 'obtains', 'obvious', 'offered', 'officer', 'offices', 'omitted', 'opening', 'operate', 'opinion', 'opposed', 'opposes', 'options', 'ordered', 'outside', 'overall', 'package', 'painful', 'partial', 'parties', 'passing', 'patient', 'pattern', 'perfect', 'perform', 'perhaps', 'permits', 'persons', 'phrases', 'picking', 'picture', 'placing', 'planned', 'plastic', 'playing', 'pleased', 'pleases', 'pointed', 'popular', 'posting', 'precise', 'prefers', 'prepare', 'present', 'pressed', 'presses', 'presume', 'prevent', 'primary', 'printed', 'printer', 'private', 'problem', 'process', 'produce', 'product', 'project', 'promise', 'propose', 'protect', 'protest', 'provide', 'proving', 'publish', 'pulling', 'purpose', 'pushing', 'putting', 'qualify', 'quality', 'quarter', 'quicker', 'quickly', 'quietly', 'quoting', 'raising', 'rapidly', 'reached', 'reaches', 'readers', 'readily', 'reading', 'reality', 'reasons', 'receive', 'records', 'recover', 'reduced', 'reduces', 'reflect', 'refused', 'refuses', 'regards', 'regular', 'rejects', 'related', 'relates', 'release', 'remains', 'remarks', 'reminds', 'removal', 'removed', 'removes', 'repeats', 'replace', 'replied', 'replies', 'reports', 'request', 'require', 'reserve', 'respect', 'respond', 'restart', 'restore', 'results', 'returns', 'reveals', 'reverse', 'rewrite', 'ridding', 'roughly', 'routine', 'rubbish', 'running', 'satisfy', 'schools', 'science', 'scratch', 'screens', 'seconds', 'section', 'seeking', 'seeming', 'selects', 'selling', 'seminar', 'sending', 'serious', 'service', 'serving', 'session', 'setting', 'settled', 'settles', 'several', 'sharing', 'shopped', 'shorter', 'shortly', 'showing', 'signals', 'signing', 'similar', 'simpler', 'sitting', 'slowest', 'smaller', 'society', 'solving', 'somehow', 'someone', 'soonest', 'sorting', 'sounded', 'sources', 'speaker', 'special', 'specify', 'spotted', 'spreads', 'started', 'stating', 'station', 'staying', 'stopped', 'storage', 'storing', 'strange', 'strikes', 'strings', 'student', 'studied', 'studies', 'subject', 'submits', 'succeed', 'success', 'suffers', 'suffice', 'suggest', 'suiting', 'summary', 'support', 'suppose', 'surface', 'survive', 'suspect', 'suspend', 'symbols', 'systems', 'talking', 'teacher', 'teaches', 'tedious', 'telling', 'testing', 'thereby', 'thought', 'through', 'tickets', 'tonight', 'totally', 'touched', 'touches', 'towards', 'traffic', 'trained', 'trapped', 'treated', 'trivial', 'trouble', 'trusted', 'turning', 'typical', 'unaware', 'unclear', 'unhappy', 'uniform', 'unknown', 'unusual', 'updated', 'updates', 'upwards', 'useless', 'usually', 'utility', 'utterly', 'vaguely', 'variety', 'various', 'varying', 'version', 'visible', 'waiting', 'walking', 'wanting', 'warning', 'wasting', 'watched', 'watches', 'wearing', 'weather', 'weekend', 'welcome', 'western', 'whereas', 'whereby', 'whether', 'whoever', 'willing', 'windows', 'winning', 'wishing', 'without', 'wonders', 'wording', 'workers', 'working', 'worried', 'worries', 'writing', 'written'],
        8: ['absolute', 'academic', 'accepted', 'accident', 'accorded', 'accounts', 'accuracy', 'accurate', 'achieved', 'achieves', 'acquired', 'acquires', 'activity', 'actually', 'addition', 'adequate', 'admitted', 'adopting', 'advanced', 'advances', 'advising', 'affected', 'agreeing', 'allowing', 'altering', 'although', 'analogue', 'analysis', 'announce', 'annoying', 'answered', 'anyplace', 'anything', 'anywhere', 'apparent', 'appeared', 'applying', 'approach', 'approval', 'approved', 'approves', 'argument', 'arranged', 'arranges', 'arriving', 'articles', 'assembly', 'assuming', 'assuring', 'attached', 'attaches', 'attempts', 'attended', 'attitude', 'audience', 'avoiding', 'becoming', 'believed', 'believes', 'benefits', 'borrowed', 'bothered', 'brackets', 'branches', 'breaking', 'bringing', 'building', 'bulletin', 'business', 'campaign', 'capacity', 'carrying', 'cassette', 'catching', 'category', 'chairman', 'changing', 'channels', 'charging', 'cheapest', 'checking', 'chemical', 'children', 'choosing', 'claiming', 'clearest', 'clearing', 'collapse', 'collects', 'colleges', 'combined', 'combines', 'commands', 'comments', 'commonly', 'compared', 'compares', 'compiler', 'complain', 'complete', 'composed', 'composes', 'computed', 'computer', 'computes', 'concerns', 'concrete', 'confirms', 'confused', 'confuses', 'connects', 'consider', 'consists', 'constant', 'contains', 'contents', 'continue', 'contract', 'contrary', 'contrast', 'controls', 'convince', 'corrects', 'corrupts', 'counting', 'covering', 'crashing', 'creating', 'creation', 'creature', 'critical', 'customer', 'damaging', 'database', 'deciding', 'decision', 'declared', 'declares', 'decrease', 'dedicate', 'defining', 'definite', 'deleting', 'delivers', 'delivery', 'depended', 'deriving', 'describe', 'designed', 'desiring', 'destroys', 'detailed', 'detected', 'develops', 'devoting', 'directed', 'directly', 'director', 'disagree', 'disaster', 'discount', 'discover', 'displays', 'distance', 'distinct', 'district', 'disturbs', 'dividing', 'division', 'document', 'doubtful', 'dropping', 'earliest', 'economic', 'electing', 'election', 'electric', 'elements', 'elevator', 'emphasis', 'employee', 'engineer', 'enormous', 'ensuring', 'entering', 'entirely', 'entitled', 'entitles', 'entrance', 'estimate', 'evenings', 'everyone', 'evidence', 'examined', 'examines', 'examples', 'exchange', 'excluded', 'excludes', 'executed', 'executes', 'exercise', 'existing', 'expanded', 'expected', 'explains', 'explicit', 'extended', 'external', 'facility', 'familiar', 'farthest', 'feasible', 'features', 'feedback', 'finished', 'finishes', 'flashing', 'flexible', 'floating', 'followed', 'fraction', 'frequent', 'friendly', 'function', 'furthest', 'gasoline', 'generate', 'governor', 'graduate', 'granting', 'graphics', 'grateful', 'greatest', 'grinding', 'guessing', 'handling', 'happened', 'hardware', 'harmless', 'holidays', 'horrible', 'hospital', 'hundreds', 'identify', 'identity', 'ignoring', 'implying', 'imposing', 'improved', 'improves', 'incident', 'inclined', 'inclines', 'included', 'includes', 'increase', 'indicate', 'industry', 'inferior', 'infinite', 'informed', 'initials', 'innocent', 'inputted', 'inserted', 'insisted', 'installs', 'instance', 'integers', 'integral', 'intended', 'interact', 'interest', 'internal', 'interval', 'invented', 'inviting', 'involved', 'involves', 'irritate', 'isolated', 'isolates', 'keyboard', 'knocking', 'language', 'learning', 'lectures', 'lifetime', 'likewise', 'limiting', 'location', 'machines', 'magnetic', 'maintain', 'majority', 'managing', 'marriage', 'material', 'meanings', 'measured', 'measures', 'mechanic', 'meetings', 'mentions', 'messages', 'midnight', 'military', 'millions', 'minority', 'misleads', 'mistaken', 'mistakes', 'modified', 'modifies', 'mornings', 'movement', 'multiple', 'national', 'negative', 'networks', 'nonsense', 'normally', 'noticing', 'nowadays', 'numerous', 'objected', 'observed', 'observes', 'obtained', 'occasion', 'occupied', 'occupies', 'occurred', 'offering', 'official', 'omitting', 'operated', 'operates', 'operator', 'opinions', 'opposing', 'opposite', 'optional', 'ordering', 'ordinary', 'original', 'packages', 'parallel', 'patterns', 'peculiar', 'performs', 'personal', 'persuade', 'physical', 'pictures', 'planning', 'pleasant', 'pleasing', 'pointing', 'policies', 'position', 'positive', 'possible', 'possibly', 'powerful', 'prepared', 'prepares', 'presence', 'presents', 'preserve', 'pressing', 'pressure', 'prevents', 'previous', 'printers', 'printing', 'printout', 'probably', 'problems', 'produced', 'produces', 'products', 'progress', 'projects', 'promised', 'promises', 'promptly', 'properly', 'property', 'proposal', 'proposed', 'proposes', 'prospect', 'protects', 'provided', 'provides', 'publicly', 'puncture', 'purchase', 'purposes', 'quantity', 'question', 'quickest', 'quitting', 'randomly', 'reaching', 'reaction', 'readable', 'received', 'receives', 'recently', 'recorded', 'recovers', 'reducing', 'referred', 'reflects', 'refusing', 'regarded', 'register', 'rejected', 'relating', 'relation', 'relative', 'released', 'releases', 'relevant', 'reliable', 'religion', 'remained', 'remember', 'reminded', 'remotely', 'removing', 'repeated', 'replaced', 'replaces', 'replying', 'reported', 'requests', 'required', 'requires', 'research', 'reserved', 'reserves', 'resident', 'resource', 'respects', 'response', 'restored', 'restores', 'restrict', 'resulted', 'returned', 'revealed', 'sciences', 'searched', 'searches', 'secondly', 'sections', 'security', 'selected', 'sensible', 'sensibly', 'sentence', 'separate', 'sequence', 'services', 'sessions', 'settling', 'severely', 'shopping', 'shortage', 'shortest', 'shutting', 'simplest', 'slightly', 'smallest', 'software', 'solution', 'somebody', 'sometime', 'somewhat', 'sounding', 'southern', 'speakers', 'speaking', 'specific', 'spelling', 'spending', 'spotting', 'standard', 'standing', 'starting', 'stations', 'sticking', 'stopping', 'straight', 'strategy', 'strength', 'strictly', 'striking', 'strongly', 'students', 'studying', 'subjects', 'suddenly', 'suffered', 'suggests', 'suitable', 'suitably', 'superior', 'supplied', 'supplies', 'supports', 'supposed', 'supposes', 'surprise', 'survived', 'survives', 'suspects', 'suspends', 'switched', 'switches', 'teaching', 'tendency', 'terminal', 'terribly', 'thinking', 'thoughts', 'thousand', 'throwing', 'together', 'tomorrow', 'touching', 'training', 'transfer', 'trapping', 'treating', 'trusting', 'ultimate', 'unlikely', 'unwanted', 'updating', 'vacation', 'validity', 'valuable', 'variable', 'versions', 'watching', 'welcomed', 'welcomes', 'whatever', 'whenever', 'wherever', 'withdraw', 'wondered', 'worrying', 'yourself'],
        9: ['abilities', 'accepting', 'according', 'achieving', 'acquiring', 'addressed', 'addresses', 'admitting', 'advancing', 'advantage', 'advertise', 'affecting', 'afternoon', 'agreement', 'algorithm', 'alternate', 'ambiguous', 'anonymous', 'answering', 'apologies', 'appearing', 'approving', 'arbitrary', 'arguments', 'arranging', 'assembler', 'assistant', 'associate', 'attaching', 'attempted', 'attending', 'attention', 'authority', 'automatic', 'available', 'backwards', 'basically', 'beautiful', 'beginning', 'believing', 'borrowing', 'bothering', 'broadcast', 'buildings', 'calculate', 'candidate', 'cardboard', 'carefully', 'certainly', 'character', 'collected', 'combining', 'commented', 'committee', 'community', 'comparing', 'complains', 'complaint', 'completed', 'completes', 'component', 'composing', 'computers', 'computing', 'concerned', 'condition', 'confident', 'confirmed', 'confusing', 'confusion', 'connected', 'considers', 'construct', 'contained', 'continued', 'continues', 'convinced', 'convinces', 'corrected', 'correctly', 'corrupted', 'criticism', 'currently', 'dangerous', 'decisions', 'declaring', 'dedicated', 'dedicates', 'delivered', 'depending', 'described', 'describes', 'designing', 'desirable', 'desperate', 'destroyed', 'detailing', 'detecting', 'determine', 'developed', 'different', 'difficult', 'directing', 'direction', 'directory', 'disappear', 'discovers', 'discussed', 'discusses', 'displayed', 'disturbed', 'documents', 'education', 'effective', 'efficient', 'elsewhere', 'embarrass', 'emergency', 'encounter', 'encourage', 'engineers', 'entitling', 'equipment', 'essential', 'establish', 'everybody', 'examining', 'excellent', 'exception', 'excessive', 'excluding', 'exclusive', 'executing', 'existence', 'expanding', 'expansion', 'expecting', 'expensive', 'explained', 'expressed', 'expresses', 'extending', 'extension', 'extensive', 'extremely', 'financial', 'finishing', 'following', 'forgotten', 'functions', 'generally', 'generated', 'generates', 'gradually', 'guarantee', 'happening', 'hopefully', 'identical', 'immediate', 'implement', 'important', 'improving', 'inability', 'inclining', 'including', 'incorrect', 'increased', 'increases', 'indicates', 'influence', 'informing', 'initially', 'inputting', 'inserting', 'insisting', 'installed', 'instantly', 'insurance', 'intending', 'intention', 'interests', 'interface', 'interpret', 'intervals', 'introduce', 'inventing', 'invisible', 'involving', 'irritated', 'irritates', 'isolating', 'justified', 'justifies', 'knowledge', 'languages', 'libraries', 'literally', 'locations', 'magnitude', 'maintains', 'materials', 'measuring', 'mechanics', 'mechanism', 'mentioned', 'mistaking', 'modifying', 'movements', 'naturally', 'necessary', 'necessity', 'numerical', 'objecting', 'objection', 'observing', 'obtaining', 'obviously', 'occasions', 'occupying', 'occurring', 'operating', 'operation', 'operators', 'otherwise', 'ourselves', 'paragraph', 'partially', 'perfectly', 'performed', 'permanent', 'permitted', 'persuaded', 'persuades', 'pointless', 'political', 'positions', 'potential', 'practical', 'precisely', 'preferred', 'preparing', 'presented', 'president', 'prevented', 'primitive', 'principle', 'procedure', 'processed', 'processes', 'processor', 'producing', 'promising', 'proposing', 'protected', 'providing', 'publicity', 'published', 'publishes', 'qualified', 'qualifies', 'questions', 'receiving', 'reception', 'recommend', 'recording', 'recovered', 'reduction', 'redundant', 'reference', 'referring', 'reflected', 'regarding', 'registers', 'regularly', 'rejecting', 'releasing', 'relevance', 'religious', 'reluctant', 'remaining', 'remembers', 'reminding', 'repeating', 'replacing', 'reporting', 'represent', 'reproduce', 'requested', 'requiring', 'reserving', 'resourced', 'resources', 'responses', 'restoring', 'restricts', 'resulting', 'returning', 'revealing', 'satisfied', 'satisfies', 'searching', 'secondary', 'secretary', 'selecting', 'selection', 'sensitive', 'sentences', 'sequences', 'seriously', 'similarly', 'sincerely', 'situation', 'solutions', 'someplace', 'something', 'sometimes', 'somewhere', 'specially', 'specified', 'specifies', 'splitting', 'spreading', 'standards', 'statement', 'statistic', 'structure', 'submitted', 'suffering', 'suggested', 'supplying', 'supported', 'supposing', 'surprised', 'surprises', 'surviving', 'suspected', 'suspended', 'suspicion', 'switching', 'technical', 'technique', 'telephone', 'temporary', 'terminals', 'therefore', 'thousands', 'transfers', 'translate', 'transport', 'treatment', 'uncertain', 'universal', 'unlimited', 'upsetting', 'vacations', 'variables', 'variation', 'virtually', 'welcoming', 'wonderful', 'wondering', 'yesterday'],
        10: ['absolutely', 'acceptable', 'accessible', 'accidental', 'activities', 'additional', 'addressing', 'admittedly', 'advantages', 'advertised', 'advertises', 'algorithms', 'altogether', 'apparently', 'appearance', 'appreciate', 'arithmetic', 'artificial', 'associated', 'associates', 'assumption', 'atmosphere', 'attempting', 'attractive', 'automobile', 'background', 'beforehand', 'broadcasts', 'categories', 'characters', 'collecting', 'collection', 'commenting', 'commercial', 'commission', 'commitment', 'comparable', 'comparison', 'compatible', 'complained', 'complaints', 'completely', 'completing', 'complexity', 'complicate', 'components', 'compromise', 'compulsory', 'concerning', 'conclusion', 'conditions', 'conference', 'confirming', 'connecting', 'connection', 'considered', 'consistent', 'constraint', 'containing', 'continuing', 'continuous', 'contribute', 'controlled', 'convenient', 'convention', 'convincing', 'correcting', 'correction', 'corrupting', 'dedicating', 'definitely', 'definition', 'definitive', 'deliberate', 'delivering', 'democratic', 'department', 'describing', 'destroying', 'determined', 'determines', 'developing', 'dictionary', 'difference', 'difficulty', 'directions', 'disappears', 'discipline', 'discourage', 'discovered', 'discussing', 'discussion', 'displaying', 'distinctly', 'distribute', 'disturbing', 'documented', 'electronic', 'encounters', 'encouraged', 'encourages', 'engineered', 'equivalent', 'especially', 'eventually', 'everything', 'everywhere', 'exceptions', 'experience', 'experiment', 'explaining', 'expressing', 'expression', 'facilities', 'forgetting', 'frequently', 'generating', 'generation', 'government', 'guaranteed', 'guarantees', 'historical', 'implements', 'importance', 'impossible', 'impression', 'inadequate', 'incomplete', 'increasing', 'indication', 'individual', 'industrial', 'inevitably', 'installing', 'interested', 'interprets', 'introduced', 'introduces', 'invariably', 'invitation', 'irrelevant', 'irritating', 'justifying', 'laboratory', 'literature', 'maintained', 'meaningful', 'membership', 'mentioning', 'misleading', 'mysterious', 'objections', 'occasional', 'operations', 'opposition', 'originally', 'particular', 'performing', 'permission', 'permitting', 'personally', 'persuading', 'phenomenon', 'philosophy', 'population', 'postmaster', 'preferable', 'preferably', 'preference', 'preferring', 'presenting', 'presumably', 'preventing', 'previously', 'principles', 'processing', 'processors', 'production', 'programmer', 'properties', 'proportion', 'protecting', 'protection', 'publishing', 'qualifying', 'quantities', 'reasonable', 'reasonably', 'recommends', 'recovering', 'references', 'reflecting', 'reflection', 'regardless', 'registered', 'regulation', 'relatively', 'remembered', 'repeatedly', 'represents', 'requesting', 'resolution', 'resourcing', 'restricted', 'ridiculous', 'satisfying', 'scientific', 'separately', 'situations', 'specifying', 'statements', 'statistics', 'structures', 'submitting', 'subsequent', 'substitute', 'successful', 'sufficient', 'suggesting', 'suggestion', 'supervisor', 'supporting', 'supposedly', 'surprising', 'suspecting', 'suspending', 'techniques', 'technology', 'television', 'themselves', 'thoroughly', 'throughout', 'translated', 'translates', 'ultimately', 'underneath', 'understand', 'understood', 'university', 'unpleasant', 'unsuitable', 'whatsoever', 'widespread', 'worthwhile'],
        11: ['accordingly', 'advertising', 'alternative', 'application', 'appreciated', 'appreciates', 'appropriate', 'arrangement', 'associating', 'association', 'authorities', 'calculation', 'circulation', 'combination', 'communicate', 'competition', 'complaining', 'complicated', 'complicates', 'composition', 'connections', 'consequence', 'considering', 'consistency', 'constraints', 'consumption', 'continually', 'controlling', 'conventions', 'definitions', 'demonstrate', 'description', 'determining', 'development', 'differences', 'differently', 'disappeared', 'discouraged', 'discourages', 'discovering', 'discussions', 'distinction', 'distinguish', 'distributed', 'distributes', 'documenting', 'educational', 'effectively', 'electronics', 'embarrassed', 'embarrasses', 'encountered', 'encouraging', 'engineering', 'environment', 'essentially', 'established', 'establishes', 'experienced', 'experiences', 'experiments', 'explanation', 'forthcoming', 'fortunately', 'fundamental', 'imagination', 'immediately', 'implemented', 'implication', 'importantly', 'improvement', 'independent', 'individuals', 'information', 'institution', 'instruction', 'intelligent', 'interesting', 'interpreted', 'introducing', 'investigate', 'maintaining', 'mathematics', 'meaningless', 'necessarily', 'observation', 'opportunity', 'performance', 'permanently', 'possibility', 'potentially', 'practically', 'preparation', 'programmers', 'publication', 'punctuation', 'recognition', 'recommended', 'registering', 'regulations', 'remembering', 'replacement', 'represented', 'requirement', 'responsible', 'restricting', 'significant', 'statistical', 'substantial', 'suggestions', 'temperature', 'temporarily', 'terminology', 'theoretical', 'traditional', 'transferred', 'translating', 'translation', 'understands', 'unfortunate', 'unnecessary'],
        12: ['accidentally', 'alternatives', 'announcement', 'applications', 'appreciating', 'arrangements', 'broadcasting', 'calculations', 'circumstance', 'combinations', 'complicating', 'consequences', 'consequently', 'considerable', 'considerably', 'continuation', 'continuously', 'contribution', 'conventional', 'conversation', 'deliberately', 'descriptions', 'difficulties', 'disadvantage', 'disappearing', 'discouraging', 'distributing', 'distribution', 'embarrassing', 'encountering', 'establishing', 'experiencing', 'experimental', 'guaranteeing', 'implementing', 'implications', 'improvements', 'incidentally', 'incompatible', 'inconsistent', 'individually', 'institutions', 'instructions', 'intelligence', 'interpreting', 'intervention', 'introduction', 'manipulation', 'mathematical', 'nevertheless', 'occasionally', 'particularly', 'professional', 'recommending', 'relationship', 'representing', 'requirements', 'respectively', 'significance', 'simultaneous', 'sophisticate', 'specifically', 'successfully', 'sufficiently', 'transferring', 'unacceptable', 'universities', 'unreasonable']
    };
    /*WORDS = {
        2:  ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh', 'ii', 'jj', 'kk', 'll', 'mm', 'nn', 'oo', 'pp', 'qq', 'rr', 'ss', 'tt', 'uu', 'vv', 'ww', 'xx', 'yy', 'zz'],
        3:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        4:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        5:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        6:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        7:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        8:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        9:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        10:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        11:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        12:  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
    };*/
});

// lib/game/entities/particle.js
ig.baked = true;
ig.module('game.entities.particle').requires('impact.entity').defines(function () {
    EntityParticle = ig.Entity.extend({
        size: {
            x: 4,
            y: 4
        },
        offset: {
            x: 0,
            y: 0
        },
        maxVel: {
            x: 160,
            y: 160
        },
        minBounceVelocity: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.LITE,
        lifetime: 5,
        fadetime: 1,
        bounciness: 0.6,
        friction: {
            x: 20,
            y: 0
        },
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.vel.x = (Math.random() * 2 - 1) * this.vel.x;
            this.vel.y = (Math.random() * 2 - 1) * this.vel.y;
            this.currentAnim.flip.x = (Math.random() > 0.5);
            this.currentAnim.flip.y = (Math.random() > 0.5);
            this.currentAnim.gotoRandomFrame();
            this.idleTimer = new ig.Timer();
        },
        update: function () {
            if (this.idleTimer.delta() > this.lifetime) {
                this.kill();
                return;
            }
            this.currentAnim.alpha = this.idleTimer.delta().map(this.lifetime - this.fadetime, this.lifetime, 1, 0);
            this.parent();
        }
    });
});

// lib/game/entities/enemy.js
ig.baked = true;
ig.module('game.entities.enemy').requires('impact.entity', 'impact.font', 'game.words', 'game.entities.particle').defines(function () {
    EntityEnemy = ig.Entity.extend({
        word: 'none',
        remainingWord: 'none',
        health: 8,
        currentLetter: 0,
        targeted: false,
        font: new ig.Font('media/fonts/deja-vu-12.png'),
        fontActive: new ig.Font('media/fonts/deja-vu-12-orange.png'),
        speed: 10,
        friction: {
            x: 100,
            y: 100
        },
        hitTimer: null,
        dead: false,
        angle: 0,
        wordLength: {
            min: 8,
            max: 8
        },
        soundHit: new ig.Sound('media/sounds/hit.ogg'),
        type: ig.Entity.TYPE.B,
        checkAgainst: ig.Entity.TYPE.A,
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.health = Math.random().map(0, 1, this.wordLength.min, this.wordLength.max).round();
            this.word = this.getWordWithLength(this.health);
            this.remainingWord = this.word;
            this.hitTimer = new ig.Timer(0);
            this.dieTimer = new ig.Timer(0);
            ig.game.registerTarget(this.word.charAt(0), this);
            this.angle = this.angleTo(ig.game.player);
        },
        getWordWithLength: function (l) {
            var w = 'wtf';
            for (var i = 0; i < 20; i++) {
                if (l >= 2 && l <= 12) {
                    w = WORDS[l].random();
                } else {
                    w = String.fromCharCode('a'.charCodeAt(0) + (Math.random() * 26).floor());
                }
                if (!ig.game.targets[w.charAt(0)].length) {
                    return w;
                }
            }
            return w;
        },
        target: function () {
            this.targeted = true;
            ig.game.currentTarget = this;
            ig.game.unregisterTarget(this.word.charAt(0), this);
            ig.game.entities.erase(this);
            ig.game.entities.push(this);
        },
        draw: function () {
            ig.system.context.globalCompositeOperation = 'lighter';
            this.parent();
            ig.system.context.globalCompositeOperation = 'source-over';
        },
        drawLabel: function () {
            if (!this.remainingWord.length) {
                return;
            }
            var w = this.font.widthForString(this.word);
            var x = (this.pos.x - 6).limit(w + 2, ig.system.width - 1);
            var y = (this.pos.y + this.size.y - 10).limit(2, ig.system.height - 19);
            var bx = ig.system.getDrawPos(x - w - 2);
            var by = ig.system.getDrawPos(y - 3);
            ig.system.context.fillStyle = 'rgba(0,0,0,0.5)';
            ig.system.context.fillRect(bx, by, w + 3, 19);
            if (this.targeted) {
                this.fontActive.draw(this.remainingWord, x, y, ig.Font.ALIGN.RIGHT);
            } else {
                this.font.draw(this.remainingWord, x, y, ig.Font.ALIGN.RIGHT);
            }
        },
        kill: function () {
            ig.game.unregisterTarget(this.word.charAt(0), this);
            if (ig.game.currentTarget == this) {
                ig.game.currentTarget = null;
            }
            this.parent();
        },
        update: function () {
            if (this.hitTimer.delta() > 0) {
                this.vel.x = Math.cos(this.angle) * this.speed;
                this.vel.y = Math.sin(this.angle) * this.speed;
            }
            this.parent();
            if (this.pos.x < -this.animSheet.width || this.pos.x > ig.system.width + 10 || this.pos.y > ig.system.height + 10 || this.pos.y < -this.animSheet.height - 30) {
                this.kill();
            }
        },
        hit: function () {
            var numParticles = this.health <= 1 ? 10 : 4;
            for (var i = 0; i < numParticles; i++) {
                ig.game.spawnEntity(EntityExplosionParticle, this.pos.x, this.pos.y);
            }
            this.vel.x = -Math.cos(this.angle) * 20;
            this.vel.y = -Math.sin(this.angle) * 20;
            this.hitTimer.set(0.3);
            this.receiveDamage(1);
            ig.game.lastKillTimer.set(0.3);
            this.soundHit.play();
        },
        isHitBy: function (letter) {
            if (this.remainingWord.charAt(0) == letter) {
                this.remainingWord = this.remainingWord.substr(1);
                if (this.remainingWord.length == 0) {
                    ig.game.currentTarget = null;
                    ig.game.unregisterTarget(this.word.charAt(0), this);
                    this.dead = true;
                }
                return true;
            } else {
                return false;
            }
        },
        check: function (other) {
            other.kill();
            this.kill();
        }
    });
    EntityExplosionParticle = EntityParticle.extend({
        lifetime: 0.5,
        fadetime: 0.5,
        vel: {
            x: 60,
            y: 60
        },
        animSheet: new ig.AnimationSheet('media/sprites/explosion.png', 32, 32),
        init: function (x, y, settings) {
            this.addAnim('idle', 5, [0, 1, 2]);
            this.parent(x, y, settings);
        },
        draw: function () {
            ig.system.context.globalCompositeOperation = 'lighter';
            this.parent();
            ig.system.context.globalCompositeOperation = 'source-over';
        },
        update: function () {
            this.currentAnim.angle += 0.1 * ig.system.tick;
            this.parent();
        }
    });
});

// lib/game/entities/enemy-missle.js
ig.baked = true;
ig.module('game.entities.enemy-missle').requires('game.entities.enemy').defines(function () {
    EntityEnemyMissle = EntityEnemy.extend({
        size: {
            x: 8,
            y: 15
        },
        offset: {
            x: 6,
            y: 7
        },
        animSheet: new ig.AnimationSheet('media/sprites/missle.png', 20, 26),
        health: 4,
        speed: 35,
        targetTimer: null,
        wordLength: {
            min: 2,
            max: 5
        },
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
            this.angle = settings.angle;
            this.currentAnim.angle = this.angle - Math.PI / 2;
            this.targetTimer = new ig.Timer(1);
        },
        update: function () {
            var d = this.targetTimer.delta();
            if (d > 0 && d < 0.7) {
                var ad = this.angle - this.angleTo(ig.game.player);
                this.angle -= ad * ig.system.tick * 2;
                this.currentAnim.angle = this.angle - Math.PI / 2;
            }
            this.parent();
        }
    });
});

// lib/game/entities/enemy-mine.js
ig.baked = true;
ig.module('game.entities.enemy-mine').requires('game.entities.enemy').defines(function () {
    EntityEnemyMine = EntityEnemy.extend({
        size: {
            x: 12,
            y: 12
        },
        offset: {
            x: 10,
            y: 10
        },
        animSheet: new ig.AnimationSheet('media/sprites/mine.png', 32, 32),
        speed: 30,
        health: 6,
        wordLength: {
            min: 3,
            max: 6
        },
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
        },
        update: function () {
            this.angle = this.angleTo(ig.game.player);
            this.parent();
            this.currentAnim.angle += 2 * ig.system.tick;
        }
    });
});

// lib/game/entities/enemy-destroyer.js
ig.baked = true;
ig.module('game.entities.enemy-destroyer').requires('game.entities.enemy').defines(function () {
    EntityEnemyDestroyer = EntityEnemy.extend({
        size: {
            x: 24,
            y: 34
        },
        offset: {
            x: 10,
            y: 8
        },
        animSheet: new ig.AnimationSheet('media/sprites/destroyer.png', 43, 58),
        health: 8,
        speed: 20,
        shootTimer: null,
        wordLength: {
            min: 7,
            max: 10
        },
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
            this.shootTimer = new ig.Timer(5);
            this.angle = (Math.random().map(0, 1, 67, 90) + (this.pos.x > ig.system.width / 2 ? 22.5 : 0)) * Math.PI / 180;
            this.currentAnim.angle = this.angle - Math.PI / 2;
        },
        update: function () {
            this.parent();
            if (this.shootTimer.delta() > 0) {
                this.shootTimer.reset();
                ig.game.spawnEntity(EntityEnemyMissle, this.pos.x + 12, this.pos.y + 22, {
                    angle: this.angle
                });
            }
        }
    });
});

// lib/game/entities/enemy-oppressor.js
ig.baked = true;
ig.module('game.entities.enemy-oppressor').requires('game.entities.enemy').defines(function () {
    EntityEnemyOppressor = EntityEnemy.extend({
        size: {
            x: 36,
            y: 58
        },
        offset: {
            x: 16,
            y: 10
        },
        animSheet: new ig.AnimationSheet('media/sprites/oppressor.png', 68, 88),
        health: 10,
        speed: 15,
        shootTimer: null,
        bullets: 16,
        wordLength: {
            min: 9,
            max: 12
        },
        init: function (x, y, settings) {
            this.parent(x, y - 18, settings);
            this.addAnim('idle', 1, [0]);
            this.shootTimer = new ig.Timer(7);
            this.angle = Math.PI / 2;
        },
        update: function () {
            this.parent();
            if (this.shootTimer.delta() > 0) {
                var inc = 140 / (this.bullets - 1);
                var a = 20;
                var radius = 21;
                for (var i = 0; i < this.bullets; i++) {
                    var angle = a * Math.PI / 180;
                    var x = this.pos.x + 18 + Math.cos(angle) * radius;
                    var y = this.pos.y + 48 + Math.sin(angle) * radius;
                    ig.game.spawnEntity(EntityEnemyBullet, x, y, {
                        angle: angle
                    });
                    a += inc;
                }
                this.shootTimer.reset();
            }
        }
    });
    EntityEnemyBullet = EntityEnemy.extend({
        size: {
            x: 2,
            y: 2
        },
        offset: {
            x: 8,
            y: 11
        },
        animSheet: new ig.AnimationSheet('media/sprites/bullet.png', 20, 24),
        health: 1,
        speed: 50,
        wordLength: {
            min: 1,
            max: 1
        },
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
            this.angle = settings.angle;
            this.currentAnim.angle = this.angle - Math.PI / 2;
        }
    });
});

// lib/game/entities/player.js
ig.baked = true;
ig.module('game.entities.player').requires('impact.entity', 'game.entities.particle').defines(function () {
    EntityPlayer = ig.Entity.extend({
        animSheet: new ig.AnimationSheet('media/sprites/ship.png', 24, 24),
        targetAngle: 0,
        size: {
            x: 8,
            y: 8
        },
        offset: {
            x: 8,
            y: 8
        },
        angle: 0,
        targetAngle: 0,
        soundShoot: new ig.Sound('media/sounds/plasma.ogg'),
        soundMiss: new ig.Sound('media/sounds/click.ogg'),
        soundExplode: new ig.Sound('media/sounds/explosion.ogg'),
        type: ig.Entity.TYPE.A,
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 60, [0]);
            this.addAnim('shoot', 0.05, [3, 2, 1, 0], true);
            this.addAnim('miss', 0.05, [4, 5, 6], true);
        },
        draw: function () {
            ig.system.context.globalCompositeOperation = 'lighter';
            this.parent();
            ig.system.context.globalCompositeOperation = 'source-over';
        },
        update: function () {
            if (this.currentAnim.loopCount > 0) {
                this.currentAnim = this.anims.idle;
            }
            var ad = this.angle - this.targetAngle;
            if (Math.abs(ad) < 0.02) {
                this.angle = this.targetAngle;
            } else {
                this.angle -= ad * ig.system.tick * 10;
            }
            this.currentAnim.angle = this.angle;
            this.parent();
        },
        kill: function () {
            ig.game.setGameOver();
            this.soundExplode.play();
            for (var i = 0; i < 50; i++) {
                ig.game.spawnEntity(EntityExplosionParticleFast, this.pos.x, this.pos.y);
            }
            this.pos.y = ig.system.height + 300;
            this.parent();
        },
        shoot: function (target) {
            this.currentAnim = this.anims.shoot.rewind();
            var ent = ig.game.spawnEntity(EntityPlasma, this.pos.x + 6, this.pos.y + 4);
            ent.target = target;
            var angle = this.angleTo(target);
            this.targetAngle = angle + Math.PI / 2;
            this.soundShoot.play();
        },
        miss: function () {
            this.currentAnim = this.anims.miss.rewind();
            this.soundMiss.play();
        }
    });
    EntityPlasma = ig.Entity.extend({
        speed: 800,
        maxVel: {
            x: 1000,
            y: 1000
        },
        animSheet: new ig.AnimationSheet('media/sprites/plasma.png', 96, 96),
        size: {
            x: 4,
            y: 4
        },
        offset: {
            x: 46,
            y: 46
        },
        distance: 100000,
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
        },
        draw: function () {
            ig.system.context.globalCompositeOperation = 'lighter';
            this.parent();
            ig.system.context.globalCompositeOperation = 'source-over';
        },
        update: function () {
            if (this.target) {
                var currentDistance = this.distanceTo(this.target);
                if (currentDistance > this.distance || currentDistance < this.target.size.y) {
                    this.target.hit();
                    this.kill();
                    return;
                } else {
                    var angle = this.angleTo(this.target);
                    this.currentAnim.angle = angle + Math.PI / 2;
                    this.vel.x = Math.cos(angle) * this.speed;
                    this.vel.y = Math.sin(angle) * this.speed;
                }
                this.distance = currentDistance;
                this.parent();
            } else {
                this.kill();
            }
        }
    });
    EntityExplosionParticleFast = EntityParticle.extend({
        lifetime: 2,
        fadetime: 2,
        maxVel: {
            x: 1000,
            y: 1000
        },
        vel: {
            x: 100,
            y: 100
        },
        animSheet: new ig.AnimationSheet('media/sprites/explosion.png', 32, 32),
        init: function (x, y, settings) {
            this.addAnim('idle', 5, [0, 1, 2]);
            this.parent(x, y, settings);
        },
        draw: function () {
            ig.system.context.globalCompositeOperation = 'lighter';
            this.parent();
            ig.system.context.globalCompositeOperation = 'source-over';
        },
        update: function () {
            this.currentAnim.angle += 0.1 * ig.system.tick;
            this.parent();
        }
    });
});

// lib/plugins/impact-splash-loader.js
ig.baked = true;
ig.module('plugins.impact-splash-loader').requires('impact.loader').defines(function () {
    ig.ImpactSplashLoader = ig.Loader.extend({
        endTimer: 0,
        fadeToWhiteTime: 200,
        fadeToGameTime: 800,
        end: function () {
            this.parent();
            this.endTime = Date.now();
            ig.system.setDelegate(this);
        },
        run: function () {
            var t = Date.now() - this.endTime;
            var alpha = 1;
            if (t < this.fadeToWhiteTime) {
                this.draw();
                alpha = t.map(0, this.fadeToWhiteTime, 0, 1);
            } else if (t < this.fadeToGameTime) {
                ig.game.run();
                alpha = t.map(this.fadeToWhiteTime, this.fadeToGameTime, 1, 0);
            } else {
                ig.system.setDelegate(ig.game);
                return;
            }
            ig.system.context.fillStyle = 'rgba(255,255,255,' + alpha + ')';
            ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
        },
        draw: function () {
            this._drawStatus += (this.status - this._drawStatus) / 5;
            var ctx = ig.system.context;
            var w = ig.system.realWidth;
            var h = ig.system.realHeight;
            var s = w / 340 / 3;
            var c = (w - 340 * s) / 2;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.font = '10px Arial';
            ctx.fillText('http://impactjs.com', w - 10, h - 10);
            ctx.textAlign = 'left';
            ctx.save();
            ctx.translate(c, h / 2.5);
            ctx.scale(s, s);
            ctx.lineWidth = '3';
            ctx.strokeStyle = '#666666';
            ctx.strokeRect(25, 160, 300, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(30, 165, 290 * this._drawStatus, 10);
            this.drawPaths("rgb(255,255,255)", ig.ImpactSplashLoader.PATHS_IMPACT);
            var comet = ig.ImpactSplashLoader.PATHS_COMET;
            comet[5][0] = 3 - Math.random() * this._drawStatus * 7;
            comet[5][1] = 3 - Math.random() * this._drawStatus * 10;
            comet[7][0] = 29.5 - Math.random() * this._drawStatus * 10;
            comet[7][1] = 40.4 - Math.random() * this._drawStatus * 10;
            comet[9][0] = 16.1 - Math.random() * this._drawStatus * 10;
            comet[9][1] = 36.1 - Math.random() * this._drawStatus * 5;
            ctx.translate(-Math.random() * this._drawStatus * 7, -Math.random() * this._drawStatus * 5);
            this.drawPaths("rgb(243,120,31)", comet);
            ctx.restore();
        },
        drawPaths: function (color, paths) {
            var ctx = ig.system.context;
            ctx.fillStyle = color;
            for (var i = 0; i < paths.length; i += 2) {
                ctx[ig.ImpactSplashLoader.OPS[paths[i]]].apply(ctx, paths[i + 1]);
            }
        }
    });
    ig.ImpactSplashLoader.OPS = {
        bp: 'beginPath',
        cp: 'closePath',
        f: 'fill',
        m: 'moveTo',
        l: 'lineTo',
        bc: 'bezierCurveTo'
    };
    ig.ImpactSplashLoader.PATHS_COMET = ['bp', [], 'm', [85.1, 58.3], 'l', [0.0, 0.0], 'l', [29.5, 40.4], 'l', [16.1, 36.1], 'l', [54.6, 91.6], 'bc', [65.2, 106.1, 83.4, 106.7, 93.8, 95.7], 'bc', [103.9, 84.9, 98.6, 67.6, 85.1, 58.3], 'cp', [], 'm', [76.0, 94.3], 'bc', [68.5, 94.3, 62.5, 88.2, 62.5, 80.8], 'bc', [62.5, 73.3, 68.5, 67.2, 76.0, 67.2], 'bc', [83.5, 67.2, 89.6, 73.3, 89.6, 80.8], 'bc', [89.6, 88.2, 83.5, 94.3, 76.0, 94.3], 'cp', [], 'f', []];
    ig.ImpactSplashLoader.PATHS_IMPACT = ['bp', [], 'm', [128.8, 98.7], 'l', [114.3, 98.7], 'l', [114.3, 26.3], 'l', [128.8, 26.3], 'l', [128.8, 98.7], 'cp', [], 'f', [], 'bp', [], 'm', [159.2, 70.1], 'l', [163.6, 26.3], 'l', [184.6, 26.3], 'l', [184.6, 98.7], 'l', [170.3, 98.7], 'l', [170.3, 51.2], 'l', [164.8, 98.7], 'l', [151.2, 98.7], 'l', [145.7, 50.7], 'l', [145.7, 98.7], 'l', [134.1, 98.7], 'l', [134.1, 26.3], 'l', [155.0, 26.3], 'l', [159.2, 70.1], 'cp', [], 'f', [], 'bp', [], 'm', [204.3, 98.7], 'l', [189.8, 98.7], 'l', [189.8, 26.3], 'l', [211.0, 26.3], 'bc', [220.0, 26.3, 224.5, 30.7, 224.5, 39.7], 'l', [224.5, 60.1], 'bc', [224.5, 69.1, 220.0, 73.6, 211.0, 73.6], 'l', [204.3, 73.6], 'l', [204.3, 98.7], 'cp', [], 'm', [207.4, 38.7], 'l', [204.3, 38.7], 'l', [204.3, 61.2], 'l', [207.4, 61.2], 'bc', [209.1, 61.2, 210.0, 60.3, 210.0, 58.6], 'l', [210.0, 41.3], 'bc', [210.0, 39.5, 209.1, 38.7, 207.4, 38.7], 'cp', [], 'f', [], 'bp', [], 'm', [262.7, 98.7], 'l', [248.3, 98.7], 'l', [247.1, 88.2], 'l', [238.0, 88.2], 'l', [237.0, 98.7], 'l', [223.8, 98.7], 'l', [233.4, 26.3], 'l', [253.1, 26.3], 'l', [262.7, 98.7], 'cp', [], 'm', [239.4, 75.5], 'l', [245.9, 75.5], 'l', [242.6, 43.9], 'l', [239.4, 75.5], 'cp', [], 'f', [], 'bp', [], 'm', [300.9, 66.7], 'l', [300.9, 85.9], 'bc', [300.9, 94.9, 296.4, 99.4, 287.4, 99.4], 'l', [278.5, 99.4], 'bc', [269.5, 99.4, 265.1, 94.9, 265.1, 85.9], 'l', [265.1, 39.1], 'bc', [265.1, 30.1, 269.5, 25.6, 278.5, 25.6], 'l', [287.2, 25.6], 'bc', [296.2, 25.6, 300.7, 30.1, 300.7, 39.1], 'l', [300.7, 56.1], 'l', [286.4, 56.1], 'l', [286.4, 40.7], 'bc', [286.4, 38.9, 285.6, 38.1, 283.8, 38.1], 'l', [282.1, 38.1], 'bc', [280.4, 38.1, 279.5, 38.9, 279.5, 40.7], 'l', [279.5, 84.3], 'bc', [279.5, 86.1, 280.4, 86.9, 282.1, 86.9], 'l', [284.0, 86.9], 'bc', [285.8, 86.9, 286.6, 86.1, 286.6, 84.3], 'l', [286.6, 66.7], 'l', [300.9, 66.7], 'cp', [], 'f', [], 'bp', [], 'm', [312.5, 98.7], 'l', [312.5, 39.2], 'l', [303.7, 39.2], 'l', [303.7, 26.3], 'l', [335.8, 26.3], 'l', [335.8, 39.2], 'l', [327.0, 39.2], 'l', [327.0, 98.7], 'l', [312.5, 98.7], 'cp', [], 'f', [], ];
});

// lib/game/main.js
ig.baked = true;
ig.module('game.main').requires('impact.game', 'impact.font', 'game.menus', 'game.entities.enemy-missle', 'game.entities.enemy-mine', 'game.entities.enemy-destroyer', 'game.entities.enemy-oppressor', 'game.entities.player', 'plugins.impact-splash-loader').defines(function () {
    Number.zeroes = '000000000000';
    Number.prototype.zeroFill = function (d) {
        var s = this.toString();
        return Number.zeroes.substr(0, d - s.length) + s;
    };
    ZType = ig.Game.extend({
        font: new ig.Font('media/fonts/tungsten-18.png'),
        fontScore: new ig.Font('media/fonts/04b03-mono-digits.png'),
        fontTitle: new ig.Font('media/fonts/tungsten-48.png'),
        fontSelected: new ig.Font('media/fonts/tungsten-18-orange.png'),
        spawnTimer: null,
        targets: {},
        currentTarget: null,
        yScroll: 0,
        backdrop: new ig.Image('media/background/backdrop.png'),
        grid: new ig.Image('media/background/grid.png'),
        music: new ig.Sound('media/music/endure.ogg', false),
        menu: null,
        mode: 0,
        score: 0,
        streak: 0,
        hits: 0,
        misses: 0,
        multiplier: 1,
        wave: {},
        gameTime: 0,
        kills: 0,
        difficulty: 'NORMAL',
        init: function () {
            var bgmap = new ig.BackgroundMap(62, [
                [1]
            ], this.grid);
            bgmap.repeat = true;
            this.backgroundMaps.push(bgmap);
            ig.music.add(this.music);
            window.addEventListener('keydown', this.keydown.bind(this), false);
            ig.input.bind(ig.KEY.ENTER, 'ok');
            ig.input.bind(ig.KEY.SPACE, 'ok');
            ig.input.bind(ig.KEY.MOUSE1, 'click');
            ig.input.bind(ig.KEY.BACKSPACE, 'void');
            ig.input.bind(ig.KEY.ESC, 'menu');
            ig.input.bind(ig.KEY.UP_ARROW, 'up');
            ig.input.bind(ig.KEY.DOWN_ARROW, 'down');
            ig.input.bind(ig.KEY.LEFT_ARROW, 'left');
            ig.input.bind(ig.KEY.RIGHT_ARROW, 'right');
            this.setTitle();
            window.focus();
            ig.system.canvas.onclick = function () {
                window.focus();
            };
        },
        reset: function () {
            this.entities = [];
            this.currentTarget = null;
            this.wave = ig.copy(ZType.WAVES[this.difficulty]);
            var first = 'a'.charCodeAt(0),
                last = 'z'.charCodeAt(0);
            for (var i = first; i <= last; i++) {
                this.targets[String.fromCharCode(i)] = [];
            }
            this.score = 0;
            this.rs = 0;
            this.streak = 0;
            this.hits = 0;
            this.misses = 0;
            this.kills = 0;
            this.multiplier = 1;
            this.gameTime = 0;
            this.lastKillTimer = new ig.Timer();
            this.spawnTimer = new ig.Timer();
            this.waveEndTimer = null;
        },
        nextWave: function () {
            this.wave.wave++;
            this.wave.spawnWait = (this.wave.spawnWait * 0.97).limit(0.2, 1);
            this.wave.spawn = [];
            var dec = 0;
            for (var t = 0; t < this.wave.types.length; t++) {
                var type = this.wave.types[t];
                type.count -= dec;
                if (this.wave.wave % type.incEvery == 0) {
                    type.count++;
                    dec++;
                }
                for (var s = 0; s < type.count; s++) {
                    this.wave.spawn.push(t);
                }
            }
            this.wave.spawn.sort(function () {
                return Math.random() - 0.5;
            });
        },
        spawnCurrentWave: function () {
            if (!this.wave.spawn.length) {
                if (this.entities.length <= 1 && !this.waveEndTimer) {
                    this.waveEndTimer = new ig.Timer(2);
                } else if (this.waveEndTimer && this.waveEndTimer.delta() > 0) {
                    this.waveEndTimer = null;
                    this.nextWave();
                }
            } else if (this.spawnTimer.delta() > this.wave.spawnWait) {
                this.spawnTimer.reset();
                var type = this.wave.types[this.wave.spawn.pop()].type;
                var x = Math.random().map(0, 1, 10, ig.system.width - 10);
                var y = -30;
                this.spawnEntity(type, x, y, {
                    healthBoost: this.wave.healthBoost
                });
            }
        },
        registerTarget: function (letter, ent) {
            this.targets[letter].push(ent);
        },
        unregisterTarget: function (letter, ent) {
            this.targets[letter].erase(ent);
        },
        keydown: function (event) {
            if (event.target.type == 'text' || event.ctrlKey || event.shiftKey || event.altKey || this.mode != ZType.MODE.GAME || this.menu) {
                return true;
            }
            var c = event.which;
            if (!((c > 64 && c < 91) || (c > 96 && c < 123))) {
                return true;
            }
            event.stopPropagation();
            event.preventDefault();
            var letter = String.fromCharCode(c).toLowerCase();
            if (!this.currentTarget) {
                var potentialTargets = this.targets[letter];
                var nearestDistance = -1;
                var nearestTarget = null;
                for (var i = 0; i < potentialTargets.length; i++) {
                    var distance = this.player.distanceTo(potentialTargets[i]);
                    if (distance < nearestDistance || !nearestTarget) {
                        nearestDistance = distance;
                        nearestTarget = potentialTargets[i];
                    }
                }
                if (nearestTarget) {
                    nearestTarget.target();
                } else {
                    this.player.miss();
                    this.multiplier = 1;
                    this.streak = 0;
                    this.misses++;
                }
            }
            if (this.currentTarget) {
                var c = this.currentTarget;
                var hit = this.currentTarget.isHitBy(letter);
                if (hit) {
                    this.player.shoot(c);
                    this.score += this.multiplier;
                    this.hits++;
                    this.streak++;
                    if (ZType.MULTIPLIER_TIERS[this.streak]) {
                        this.multiplier += 1;
                    }
                    if (c.dead) {
                        this.kills++;
                    }
                } else {
                    this.player.miss();
                    this.multiplier = 1;
                    this.streak = 0;
                    this.misses++;
                }
            }
            return false;
        },
        setGame: function () {
            this.reset();
            this.menu = null;
            this.player = this.spawnEntity(EntityPlayer, ig.system.width / 2, ig.system.height - 50);
            this.mode = ZType.MODE.GAME;
            this.nextWave();
            ig.music.play();
        },
        setGameOver: function () {
            this.mode = ZType.MODE.GAME_OVER;
            this.menu = new GameOverMenu();
        },
        setTitle: function () {
            this.reset();
            this.mode = ZType.MODE.TITLE;
            this.menu = new TitleMenu();
        },
        toggleMenu: function () {
            if (this.mode == ZType.MODE.TITLE) {
                if (this.menu instanceof TitleMenu) {
                    this.menu = new PauseMenu();
                } else {
                    this.menu = new TitleMenu();
                }
            } else {
                if (this.menu) {
                    this.menu = null;
                } else {
                    this.menu = new PauseMenu();
                }
            }
        },
        update: function () {
            if (ig.input.pressed('menu') && !this.menu) {
                this.toggleMenu();
            }
            if (this.menu) {
                this.backgroundMaps[0].scroll.y -= 100 * ig.system.tick;
                this.menu.update();
                if (!(this.menu instanceof GameOverMenu)) {
                    return;
                }
            }
            this.parent();
            if (this.mode == ZType.MODE.GAME) {
                this.spawnCurrentWave();
            } else if (ig.input.pressed('ok')) {
                if (this.mode == ZType.MODE.TITLE) {
                    this.setGame();
                } else {
                    this.setTitle();
                }
            }
            this.yScroll -= 100 * ig.system.tick;
            this.backgroundMaps[0].scroll.y = this.yScroll;
            if (this.entities.length > 1 && this.mode == ZType.MODE.GAME) {
                this.gameTime += ig.system.tick;
            }
            if (this.score - this.rs > 100 || ig.Timer.timeScale != 1) {
                this.score = 0;
            }
            this.rs = this.score;
        },
        draw: function () {
            this.backdrop.draw(0, 0);
            var d = this.lastKillTimer.delta();
            ig.system.context.globalAlpha = d < 0 ? d * -2 + 0.3 : 0.3;
            for (var i = 0; i < this.backgroundMaps.length; i++) {
                this.backgroundMaps[i].draw();
            }
            ig.system.context.globalAlpha = 1;
            for (var i = 0; i < this.entities.length; i++) {
                this.entities[i].draw();
            }
            for (var i = 0; i < this.entities.length; i++) {
                this.entities[i].drawLabel && this.entities[i].drawLabel();
            }
            if (this.mode == ZType.MODE.GAME) {
                this.drawUI();
            } else if (this.mode == ZType.MODE.TITLE) {
                this.drawTitle();
            } else if (this.mode == ZType.MODE.GAME_OVER) {
                this.drawGameOver();
            }
            if (this.menu) {
                this.menu.draw();
            }
        },
        drawUI: function () {
            var s = '(' + this.multiplier + 'x) ' + this.score.zeroFill(6);
            this.fontScore.draw(s, ig.system.width - 4, ig.system.height - 12, ig.Font.ALIGN.RIGHT);
            if (this.waveEndTimer) {
                var d = -this.waveEndTimer.delta();
                var a = d > 1.7 ? d.map(2, 1.7, 0, 1) : d < 1 ? d.map(1, 0, 1, 0) : 1;
                var xs = ig.system.width / 2;
                var ys = ig.system.height / 3 + (d < 1 ? Math.cos(1 - d).map(1, 0, 0, 250) : 0);
                var w = this.wave.wave.zeroFill(3);
                ig.system.context.globalAlpha = a;
                this.fontTitle.draw('Wave ' + w + ' Clear', xs, ys, ig.Font.ALIGN.CENTER);
                ig.system.context.globalAlpha = 1;
            }
        },
        drawTitle: function () {
            var xs = ig.system.width / 2;
            var ys = ig.system.height / 4;
            this.fontTitle.draw('Z-Type', xs, ys, ig.Font.ALIGN.CENTER);
            ig.system.context.globalAlpha = 0.8;
            this.font.draw('Type to Shoot!', xs, ys + 90, ig.Font.ALIGN.CENTER);
            ig.system.context.globalAlpha = 1;
            var xc = 8;
            var yc = ig.system.height - 40;
            ig.system.context.globalAlpha = 0.6;
            this.font.draw('Concept, Graphics & Programming: Dominic Szablewski', xc, yc);
            this.font.draw('Music: Andreas Loesch', xc, yc + 20);
            ig.system.context.globalAlpha = 1;
        },
        drawGameOver: function () {
            var xs = ig.system.width / 2;
            var ys = ig.system.height / 4;
            var acc = this.hits ? this.hits / (this.hits + this.misses) * 100 : 0;
            var wpm = this.kills / (this.gameTime / 60);
            this.fontTitle.draw('Game Over', xs, ys, ig.Font.ALIGN.CENTER);
            this.fontTitle.draw('Final Score: ' + this.score.zeroFill(6), xs, ys + 90, ig.Font.ALIGN.CENTER);
            this.font.draw('Accuracy: ' + acc.round(1) + '%', xs, ys + 144, ig.Font.ALIGN.CENTER);
            this.font.draw('Words Per Minute: ' + wpm.round(1), xs, ys + 168, ig.Font.ALIGN.CENTER);
        }
    });
    ZType.MODE = {
        TITLE: 0,
        GAME: 1,
        GAME_OVER: 2
    };
    ZType.MULTIPLIER_TIERS = {
        25: 2,
        50: 3,
        100: 4
    };
    ZType.WAVES = {
        NORMAL: {
            wave: 0,
            spawn: [],
            spawnWait: 1,
            healthBoost: 0,
            types: [{
                type: EntityEnemyOppressor,
                count: 0,
                incEvery: 13
            }, {
                type: EntityEnemyDestroyer,
                count: 0,
                incEvery: 5
            }, {
                type: EntityEnemyMine,
                count: 3,
                incEvery: 2
            }]
        },
        EXPERT: {
            wave: 0,
            spawn: [],
            spawnWait: 0.7,
            healthBoost: 0,
            types: [{
                type: EntityEnemyOppressor,
                count: 1,
                incEvery: 7
            }, {
                type: EntityEnemyDestroyer,
                count: 2,
                incEvery: 3
            }, {
                type: EntityEnemyMine,
                count: 9,
                incEvery: 1
            }]
        }
    };
    ig.System.drawMode = ig.System.DRAW.SMOOTH;

    ZType.startGame = function () {
        ig.main('#canvas', ZType, 60, 360, 640, 1, ig.ImpactSplashLoader);
    }
});
