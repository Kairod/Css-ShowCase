/* http://prismjs.com/download.html?themes=prism-coy&languages=markup+css&plugins=line-highlight+line-numbers+toolbar+previewer-base+previewer-color+previewer-gradient+previewer-easing+autoloader+show-language+copy-to-clipboard */
var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
		? self // if in worker
		: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 * MIT license http://www.opensource.org/licenses/mit-license.php/
 * @author Lea Verou http://lea.verou.me
 */

var Prism = (function(){

// Private helper vars
var lang = /\blang(?:uage)?-(\w+)\b/i;
var uniqueId = 0;

var _ = _self.Prism = {
	manual: _self.Prism && _self.Prism.manual,
	util: {
		encode: function (tokens) {
			if (tokens instanceof Token) {
				return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
			} else if (_.util.type(tokens) === 'Array') {
				return tokens.map(_.util.encode);
			} else {
				return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
			}
		},

		type: function (o) {
			return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
		},

		objId: function (obj) {
			if (!obj['__id']) {
				Object.defineProperty(obj, '__id', { value: ++uniqueId });
			}
			return obj['__id'];
		},

		// Deep clone a language definition (e.g. to extend it)
		clone: function (o) {
			var type = _.util.type(o);

			switch (type) {
				case 'Object':
					var clone = {};

					for (var key in o) {
						if (o.hasOwnProperty(key)) {
							clone[key] = _.util.clone(o[key]);
						}
					}

					return clone;

				case 'Array':
					// Check for existence for IE8
					return o.map && o.map(function(v) { return _.util.clone(v); });
			}

			return o;
		}
	},

	languages: {
		extend: function (id, redef) {
			var lang = _.util.clone(_.languages[id]);

			for (var key in redef) {
				lang[key] = redef[key];
			}

			return lang;
		},

		/**
		 * Insert a token before another token in a language literal
		 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
		 * we cannot just provide an object, we need anobject and a key.
		 * @param inside The key (or language id) of the parent
		 * @param before The key to insert before. If not provided, the function appends instead.
		 * @param insert Object with the key/value pairs to insert
		 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
		 */
		insertBefore: function (inside, before, insert, root) {
			root = root || _.languages;
			var grammar = root[inside];

			if (arguments.length == 2) {
				insert = arguments[1];

				for (var newToken in insert) {
					if (insert.hasOwnProperty(newToken)) {
						grammar[newToken] = insert[newToken];
					}
				}

				return grammar;
			}

			var ret = {};

			for (var token in grammar) {

				if (grammar.hasOwnProperty(token)) {

					if (token == before) {

						for (var newToken in insert) {

							if (insert.hasOwnProperty(newToken)) {
								ret[newToken] = insert[newToken];
							}
						}
					}

					ret[token] = grammar[token];
				}
			}

			// Update references in other language definitions
			_.languages.DFS(_.languages, function(key, value) {
				if (value === root[inside] && key != inside) {
					this[key] = ret;
				}
			});

			return root[inside] = ret;
		},

		// Traverse a language definition with Depth First Search
		DFS: function(o, callback, type, visited) {
			visited = visited || {};
			for (var i in o) {
				if (o.hasOwnProperty(i)) {
					callback.call(o, i, o[i], type || i);

					if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
						visited[_.util.objId(o[i])] = true;
						_.languages.DFS(o[i], callback, null, visited);
					}
					else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
						visited[_.util.objId(o[i])] = true;
						_.languages.DFS(o[i], callback, i, visited);
					}
				}
			}
		}
	},
	plugins: {},

	highlightAll: function(async, callback) {
		var env = {
			callback: callback,
			selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
		};

		_.hooks.run("before-highlightall", env);

		var elements = env.elements || document.querySelectorAll(env.selector);

		for (var i=0, element; element = elements[i++];) {
			_.highlightElement(element, async === true, env.callback);
		}
	},

	highlightElement: function(element, async, callback) {
		// Find language
		var language, grammar, parent = element;

		while (parent && !lang.test(parent.className)) {
			parent = parent.parentNode;
		}

		if (parent) {
			language = (parent.className.match(lang) || [,''])[1].toLowerCase();
			grammar = _.languages[language];
		}

		// Set language on the element, if not present
		element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

		// Set language on the parent, for styling
		parent = element.parentNode;

		if (/pre/i.test(parent.nodeName)) {
			parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
		}

		var code = element.textContent;

		var env = {
			element: element,
			language: language,
			grammar: grammar,
			code: code
		};

		_.hooks.run('before-sanity-check', env);

		if (!env.code || !env.grammar) {
			if (env.code) {
				_.hooks.run('before-highlight', env);
				env.element.textContent = env.code;
				_.hooks.run('after-highlight', env);
			}
			_.hooks.run('complete', env);
			return;
		}

		_.hooks.run('before-highlight', env);

		if (async && _self.Worker) {
			var worker = new Worker(_.filename);

			worker.onmessage = function(evt) {
				env.highlightedCode = evt.data;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				callback && callback.call(env.element);
				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
			};

			worker.postMessage(JSON.stringify({
				language: env.language,
				code: env.code,
				immediateClose: true
			}));
		}
		else {
			env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

			_.hooks.run('before-insert', env);

			env.element.innerHTML = env.highlightedCode;

			callback && callback.call(element);

			_.hooks.run('after-highlight', env);
			_.hooks.run('complete', env);
		}
	},

	highlight: function (text, grammar, language) {
		var tokens = _.tokenize(text, grammar);
		return Token.stringify(_.util.encode(tokens), language);
	},

	matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
		var Token = _.Token;

		for (var token in grammar) {
			if(!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			if (token == target) {
				return;
			}

			var patterns = grammar[token];
			patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				var pattern = patterns[j],
					inside = pattern.inside,
					lookbehind = !!pattern.lookbehind,
					greedy = !!pattern.greedy,
					lookbehindLength = 0,
					alias = pattern.alias;

				if (greedy && !pattern.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
					pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
				}

				pattern = pattern.pattern || pattern;

				// Don’t cache length as it changes during the loop
				for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

					var str = strarr[i];

					if (strarr.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					pattern.lastIndex = 0;

					var match = pattern.exec(str),
					    delNum = 1;

					// Greedy patterns can override/remove up to two previously matched tokens
					if (!match && greedy && i != strarr.length - 1) {
						pattern.lastIndex = pos;
						match = pattern.exec(text);
						if (!match) {
							break;
						}

						var from = match.index + (lookbehind ? match[1].length : 0),
						    to = match.index + match[0].length,
						    k = i,
						    p = pos;

						for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
							p += strarr[k].length;
							// Move the index i to the element in strarr that is closest to from
							if (from >= p) {
								++i;
								pos = p;
							}
						}

						/*
						 * If strarr[i] is a Token, then the match starts inside another Token, which is invalid
						 * If strarr[k - 1] is greedy we are in conflict with another greedy pattern
						 */
						if (strarr[i] instanceof Token || strarr[k - 1].greedy) {
							continue;
						}

						// Number of tokens to delete and replace with the new match
						delNum = k - i;
						str = text.slice(pos, p);
						match.index -= pos;
					}

					if (!match) {
						if (oneshot) {
							break;
						}

						continue;
					}

					if(lookbehind) {
						lookbehindLength = match[1].length;
					}

					var from = match.index + lookbehindLength,
					    match = match[0].slice(lookbehindLength),
					    to = from + match.length,
					    before = str.slice(0, from),
					    after = str.slice(to);

					var args = [i, delNum];

					if (before) {
						++i;
						pos += before.length;
						args.push(before);
					}

					var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

					args.push(wrapped);

					if (after) {
						args.push(after);
					}

					Array.prototype.splice.apply(strarr, args);

					if (delNum != 1)
						_.matchGrammar(text, strarr, grammar, i, pos, true, token);

					if (oneshot)
						break;
				}
			}
		}
	},

	tokenize: function(text, grammar, language) {
		var strarr = [text];

		var rest = grammar.rest;

		if (rest) {
			for (var token in rest) {
				grammar[token] = rest[token];
			}

			delete grammar.rest;
		}

		_.matchGrammar(text, strarr, grammar, 0, 0, false);

		return strarr;
	},

	hooks: {
		all: {},

		add: function (name, callback) {
			var hooks = _.hooks.all;

			hooks[name] = hooks[name] || [];

			hooks[name].push(callback);
		},

		run: function (name, env) {
			var callbacks = _.hooks.all[name];

			if (!callbacks || !callbacks.length) {
				return;
			}

			for (var i=0, callback; callback = callbacks[i++];) {
				callback(env);
			}
		}
	}
};

var Token = _.Token = function(type, content, alias, matchedStr, greedy) {
	this.type = type;
	this.content = content;
	this.alias = alias;
	// Copy of the full string this token was created from
	this.length = (matchedStr || "").length|0;
	this.greedy = !!greedy;
};

Token.stringify = function(o, language, parent) {
	if (typeof o == 'string') {
		return o;
	}

	if (_.util.type(o) === 'Array') {
		return o.map(function(element) {
			return Token.stringify(element, language, o);
		}).join('');
	}

	var env = {
		type: o.type,
		content: Token.stringify(o.content, language, parent),
		tag: 'span',
		classes: ['token', o.type],
		attributes: {},
		language: language,
		parent: parent
	};

	if (env.type == 'comment') {
		env.attributes['spellcheck'] = 'true';
	}

	if (o.alias) {
		var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
		Array.prototype.push.apply(env.classes, aliases);
	}

	_.hooks.run('wrap', env);

	var attributes = Object.keys(env.attributes).map(function(name) {
		return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
	}).join(' ');

	return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';

};

if (!_self.document) {
	if (!_self.addEventListener) {
		// in Node.js
		return _self.Prism;
	}
 	// In worker
	_self.addEventListener('message', function(evt) {
		var message = JSON.parse(evt.data),
		    lang = message.language,
		    code = message.code,
		    immediateClose = message.immediateClose;

		_self.postMessage(_.highlight(code, _.languages[lang], lang));
		if (immediateClose) {
			_self.close();
		}
	}, false);

	return _self.Prism;
}

//Get current script and highlight
var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

if (script) {
	_.filename = script.src;

	if (document.addEventListener && !_.manual && !script.hasAttribute('data-manual')) {
		if(document.readyState !== "loading") {
			if (window.requestAnimationFrame) {
				window.requestAnimationFrame(_.highlightAll);
			} else {
				window.setTimeout(_.highlightAll, 16);
			}
		}
		else {
			document.addEventListener('DOMContentLoaded', _.highlightAll);
		}
	}
}

return _self.Prism;

})();

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}
;
Prism.languages.markup = {
	'comment': /<!--[\s\S]*?-->/,
	'prolog': /<\?[\s\S]+?\?>/,
	'doctype': /<!DOCTYPE[\s\S]+?>/i,
	'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\s\S])*\1|[^\s'">=]+))?)*\s*\/?>/i,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/i,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'attr-value': {
				pattern: /=(?:('|")[\s\S]*?(\1)|[^\s>]+)/i,
				inside: {
					'punctuation': /[=>"']/
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': /&#?[\da-z]{1,8};/i
};

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function(env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.css = {
	'comment': /\/\*[\s\S]*?\*\//,
	'atrule': {
		pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
		inside: {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	'url': /url\((?:(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
	'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
	'string': {
		pattern: /("|')(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'property': /(\b|\B)[\w-]+(?=\s*:)/i,
	'important': /\B!important\b/i,
	'function': /[-a-z0-9]+(?=\()/i,
	'punctuation': /[(){};:]/
};

Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);

if (Prism.languages.markup) {
	Prism.languages.insertBefore('markup', 'tag', {
		'style': {
			pattern: /(<style[\s\S]*?>)[\s\S]*?(?=<\/style>)/i,
			lookbehind: true,
			inside: Prism.languages.css,
			alias: 'language-css'
		}
	});
	
	Prism.languages.insertBefore('inside', 'attr-value', {
		'style-attr': {
			pattern: /\s*style=("|').*?\1/i,
			inside: {
				'attr-name': {
					pattern: /^\s*style/i,
					inside: Prism.languages.markup.tag.inside
				},
				'punctuation': /^\s*=\s*['"]|['"]\s*$/,
				'attr-value': {
					pattern: /.+/i,
					inside: Prism.languages.css
				}
			},
			alias: 'language-css'
		}
	}, Prism.languages.markup.tag);
};
(function(){

if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
	return;
}

function $$(expr, con) {
	return Array.prototype.slice.call((con || document).querySelectorAll(expr));
}

function hasClass(element, className) {
  className = " " + className + " ";
  return (" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(className) > -1
}

// Some browsers round the line-height, others don't.
// We need to test for it to position the elements properly.
var isLineHeightRounded = (function() {
	var res;
	return function() {
		if(typeof res === 'undefined') {
			var d = document.createElement('div');
			d.style.fontSize = '13px';
			d.style.lineHeight = '1.5';
			d.style.padding = 0;
			d.style.border = 0;
			d.innerHTML = '&nbsp;<br />&nbsp;';
			document.body.appendChild(d);
			// Browsers that round the line-height should have offsetHeight === 38
			// The others should have 39.
			res = d.offsetHeight === 38;
			document.body.removeChild(d);
		}
		return res;
	}
}());

function highlightLines(pre, lines, classes) {
	var ranges = lines.replace(/\s+/g, '').split(','),
	    offset = +pre.getAttribute('data-line-offset') || 0;

	var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
	var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);

	for (var i=0, range; range = ranges[i++];) {
		range = range.split('-');

		var start = +range[0],
		    end = +range[1] || start;

		var line = document.createElement('div');

		line.textContent = Array(end - start + 2).join(' \n');
		line.setAttribute('aria-hidden', 'true');
		line.className = (classes || '') + ' line-highlight';

		//if the line-numbers plugin is enabled, then there is no reason for this plugin to display the line numbers
		if(!hasClass(pre, 'line-numbers')) {
			line.setAttribute('data-start', start);

			if(end > start) {
				line.setAttribute('data-end', end);
			}
		}

		line.style.top = (start - offset - 1) * lineHeight + 'px';

		//allow this to play nicely with the line-numbers plugin
		if(hasClass(pre, 'line-numbers')) {
			//need to attack to pre as when line-numbers is enabled, the code tag is relatively which screws up the positioning
			pre.appendChild(line);
		} else {
			(pre.querySelector('code') || pre).appendChild(line);
		}
	}
}

function applyHash() {
	var hash = location.hash.slice(1);

	// Remove pre-existing temporary lines
	$$('.temporary.line-highlight').forEach(function (line) {
		line.parentNode.removeChild(line);
	});

	var range = (hash.match(/\.([\d,-]+)$/) || [,''])[1];

	if (!range || document.getElementById(hash)) {
		return;
	}

	var id = hash.slice(0, hash.lastIndexOf('.')),
	    pre = document.getElementById(id);

	if (!pre) {
		return;
	}

	if (!pre.hasAttribute('data-line')) {
		pre.setAttribute('data-line', '');
	}

	highlightLines(pre, range, 'temporary ');

	document.querySelector('.temporary.line-highlight').scrollIntoView();
}

var fakeTimer = 0; // Hack to limit the number of times applyHash() runs

Prism.hooks.add('before-sanity-check', function(env) {
	var pre = env.element.parentNode;
	var lines = pre && pre.getAttribute('data-line');

	if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
		return;
	}

	/*
	 * Cleanup for other plugins (e.g. autoloader).
	 *
	 * Sometimes <code> blocks are highlighted multiple times. It is necessary
	 * to cleanup any left-over tags, because the whitespace inside of the <div>
	 * tags change the content of the <code> tag.
	 */
	var num = 0;
	$$('.line-highlight', pre).forEach(function (line) {
		num += line.textContent.length;
		line.parentNode.removeChild(line);
	});

	// Remove extra whitespace
	if (num && /^( \n)+$/.test(env.code.slice(-num))) {
		env.code = env.code.slice(0, -num);
	}
});

Prism.hooks.add('complete', function(env) {
	var pre = env.element.parentNode;
	var lines = pre && pre.getAttribute('data-line');

	if (!pre || !lines || !/pre/i.test(pre.nodeName)) {
		return;
	}

	clearTimeout(fakeTimer);

	highlightLines(pre, lines);

	fakeTimer = setTimeout(applyHash, 1);
});

if(window.addEventListener) {
	window.addEventListener('hashchange', applyHash);
}

})();

(function() {

if (typeof self === 'undefined' || !self.Prism || !self.document) {
	return;
}

Prism.hooks.add('complete', function (env) {
	if (!env.code) {
		return;
	}

	// works only for <code> wrapped inside <pre> (not inline)
	var pre = env.element.parentNode;
	var clsReg = /\s*\bline-numbers\b\s*/;
	if (
		!pre || !/pre/i.test(pre.nodeName) ||
			// Abort only if nor the <pre> nor the <code> have the class
		(!clsReg.test(pre.className) && !clsReg.test(env.element.className))
	) {
		return;
	}

	if (env.element.querySelector(".line-numbers-rows")) {
		// Abort if line numbers already exists
		return;
	}

	if (clsReg.test(env.element.className)) {
		// Remove the class "line-numbers" from the <code>
		env.element.className = env.element.className.replace(clsReg, '');
	}
	if (!clsReg.test(pre.className)) {
		// Add the class "line-numbers" to the <pre>
		pre.className += ' line-numbers';
	}

	var match = env.code.match(/\n(?!$)/g);
	var linesNum = match ? match.length + 1 : 1;
	var lineNumbersWrapper;

	var lines = new Array(linesNum + 1);
	lines = lines.join('<span></span>');

	lineNumbersWrapper = document.createElement('span');
	lineNumbersWrapper.setAttribute('aria-hidden', 'true');
	lineNumbersWrapper.className = 'line-numbers-rows';
	lineNumbersWrapper.innerHTML = lines;

	if (pre.hasAttribute('data-start')) {
		pre.style.counterReset = 'linenumber ' + (parseInt(pre.getAttribute('data-start'), 10) - 1);
	}

	env.element.appendChild(lineNumbersWrapper);

});

}());
(function(){
	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	var callbacks = [];
	var map = {};
	var noop = function() {};

	Prism.plugins.toolbar = {};

	/**
	 * Register a button callback with the toolbar.
	 *
	 * @param {string} key
	 * @param {Object|Function} opts
	 */
	var registerButton = Prism.plugins.toolbar.registerButton = function (key, opts) {
		var callback;

		if (typeof opts === 'function') {
			callback = opts;
		} else {
			callback = function (env) {
				var element;

				if (typeof opts.onClick === 'function') {
					element = document.createElement('button');
					element.type = 'button';
					element.addEventListener('click', function () {
						opts.onClick.call(this, env);
					});
				} else if (typeof opts.url === 'string') {
					element = document.createElement('a');
					element.href = opts.url;
				} else {
					element = document.createElement('span');
				}

				element.textContent = opts.text;

				return element;
			};
		}

		callbacks.push(map[key] = callback);
	};

	/**
	 * Post-highlight Prism hook callback.
	 *
	 * @param env
	 */
	var hook = Prism.plugins.toolbar.hook = function (env) {
		// Check if inline or actual code block (credit to line-numbers plugin)
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		// Autoloader rehighlights, so only do this once.
		if (pre.classList.contains('code-toolbar')) {
			return;
		}

		pre.classList.add('code-toolbar');

		// Setup the toolbar
		var toolbar = document.createElement('div');
		toolbar.classList.add('toolbar');

		if (document.body.hasAttribute('data-toolbar-order')) {
			callbacks = document.body.getAttribute('data-toolbar-order').split(',').map(function(key) {
				return map[key] || noop;
			});
		}

		callbacks.forEach(function(callback) {
			var element = callback(env);

			if (!element) {
				return;
			}

			var item = document.createElement('div');
			item.classList.add('toolbar-item');

			item.appendChild(element);
			toolbar.appendChild(item);
		});

		// Add our toolbar to the <pre> tag
		pre.appendChild(toolbar);
	};

	registerButton('label', function(env) {
		var pre = env.element.parentNode;
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return;
		}

		if (!pre.hasAttribute('data-label')) {
			return;
		}

		var element, template;
		var text = pre.getAttribute('data-label');
		try {
			// Any normal text will blow up this selector.
			template = document.querySelector('template#' + text);
		} catch (e) {}

		if (template) {
			element = template.content;
		} else {
			if (pre.hasAttribute('data-url')) {
				element = document.createElement('a');
				element.href = pre.getAttribute('data-url');
			} else {
				element = document.createElement('span');
			}

			element.textContent = text;
		}

		return element;
	});

	/**
	 * Register the toolbar with Prism.
	 */
	Prism.hooks.add('complete', hook);
})();

(function() {

	if (typeof self === 'undefined' || !self.Prism || !self.document || !Function.prototype.bind) {
		return;
	}

	/**
	 * Returns the absolute X, Y offsets for an element
	 * @param {HTMLElement} element
	 * @returns {{top: number, right: number, bottom: number, left: number}}
	 */
	var getOffset = function (element) {
		var left = 0, top = 0, el = element;

		if (el.parentNode) {
			do {
				left += el.offsetLeft;
				top += el.offsetTop;
			} while ((el = el.offsetParent) && el.nodeType < 9);

			el = element;

			do {
				left -= el.scrollLeft;
				top -= el.scrollTop;
			} while ((el = el.parentNode) && !/body/i.test(el.nodeName));
		}

		return {
			top: top,
			right: innerWidth - left - element.offsetWidth,
			bottom: innerHeight - top - element.offsetHeight,
			left: left
		};
	};

	var tokenRegexp = /(?:^|\s)token(?=$|\s)/;
	var activeRegexp = /(?:^|\s)active(?=$|\s)/g;
	var flippedRegexp = /(?:^|\s)flipped(?=$|\s)/g;

	/**
	 * Previewer constructor
	 * @param {string} type Unique previewer type
	 * @param {function} updater Function that will be called on mouseover.
	 * @param {string[]|string=} supportedLanguages Aliases of the languages this previewer must be enabled for. Defaults to "*", all languages.
	 * @constructor
	 */
	var Previewer = function (type, updater, supportedLanguages, initializer) {
		this._elt = null;
		this._type = type;
		this._clsRegexp = RegExp('(?:^|\\s)' + type + '(?=$|\\s)');
		this._token = null;
		this.updater = updater;
		this._mouseout = this.mouseout.bind(this);
		this.initializer = initializer;

		var self = this;

		if (!supportedLanguages) {
			supportedLanguages = ['*'];
		}
		if (Prism.util.type(supportedLanguages) !== 'Array') {
			supportedLanguages = [supportedLanguages];
		}
		supportedLanguages.forEach(function (lang) {
			if (typeof lang !== 'string') {
				lang = lang.lang;
			}
			if (!Previewer.byLanguages[lang]) {
				Previewer.byLanguages[lang] = [];
			}
			if (Previewer.byLanguages[lang].indexOf(self) < 0) {
				Previewer.byLanguages[lang].push(self);
			}
		});
		Previewer.byType[type] = this;
	};

	/**
	 * Creates the HTML element for the previewer.
	 */
	Previewer.prototype.init = function () {
		if (this._elt) {
			return;
		}
		this._elt = document.createElement('div');
		this._elt.className = 'prism-previewer prism-previewer-' + this._type;
		document.body.appendChild(this._elt);
		if(this.initializer) {
			this.initializer();
		}
	};

	/**
	 * Checks the class name of each hovered element
	 * @param token
	 */
	Previewer.prototype.check = function (token) {
		do {
			if (tokenRegexp.test(token.className) && this._clsRegexp.test(token.className)) {
				break;
			}
		} while(token = token.parentNode);

		if (token && token !== this._token) {
			this._token = token;
			this.show();
		}
	};

	/**
	 * Called on mouseout
	 */
	Previewer.prototype.mouseout = function() {
		this._token.removeEventListener('mouseout', this._mouseout, false);
		this._token = null;
		this.hide();
	};

	/**
	 * Shows the previewer positioned properly for the current token.
	 */
	Previewer.prototype.show = function () {
		if (!this._elt) {
			this.init();
		}
		if (!this._token) {
			return;
		}

		if (this.updater.call(this._elt, this._token.textContent)) {
			this._token.addEventListener('mouseout', this._mouseout, false);

			var offset = getOffset(this._token);
			this._elt.className += ' active';

			if (offset.top - this._elt.offsetHeight > 0) {
				this._elt.className = this._elt.className.replace(flippedRegexp, '');
				this._elt.style.top = offset.top + 'px';
				this._elt.style.bottom = '';
			} else {
				this._elt.className +=  ' flipped';
				this._elt.style.bottom = offset.bottom + 'px';
				this._elt.style.top = '';
			}

			this._elt.style.left = offset.left + Math.min(200, this._token.offsetWidth / 2) + 'px';
		} else {
			this.hide();
		}
	};

	/**
	 * Hides the previewer.
	 */
	Previewer.prototype.hide = function () {
		this._elt.className = this._elt.className.replace(activeRegexp, '');
	};

	/**
	 * Map of all registered previewers by language
	 * @type {{}}
	 */
	Previewer.byLanguages = {};

	/**
	 * Map of all registered previewers by type
	 * @type {{}}
	 */
	Previewer.byType = {};

	/**
	 * Initializes the mouseover event on the code block.
	 * @param {HTMLElement} elt The code block (env.element)
	 * @param {string} lang The language (env.language)
	 */
	Previewer.initEvents = function (elt, lang) {
		var previewers = [];
		if (Previewer.byLanguages[lang]) {
			previewers = previewers.concat(Previewer.byLanguages[lang]);
		}
		if (Previewer.byLanguages['*']) {
			previewers = previewers.concat(Previewer.byLanguages['*']);
		}
		elt.addEventListener('mouseover', function (e) {
			var target = e.target;
			previewers.forEach(function (previewer) {
				previewer.check(target);
			});
		}, false);
	};
	Prism.plugins.Previewer = Previewer;

	// Initialize the previewers only when needed
	Prism.hooks.add('after-highlight', function (env) {
		if(Previewer.byLanguages['*'] || Previewer.byLanguages[env.language]) {
			Previewer.initEvents(env.element, env.language);
		}
	});

}());
(function() {

	if (
		typeof self !== 'undefined' && !self.Prism ||
		typeof global !== 'undefined' && !global.Prism
	) {
		return;
	}

	var languages = {
		'css': true,
		'less': true,
		'markup': {
			lang: 'markup',
			before: 'punctuation',
			inside: 'inside',
			root: Prism.languages.markup && Prism.languages.markup['tag'].inside['attr-value']
		},
		'sass': [
			{
				lang: 'sass',
				before: 'punctuation',
				inside: 'inside',
				root: Prism.languages.sass && Prism.languages.sass['variable-line']
			},
			{
				lang: 'sass',
				inside: 'inside',
				root: Prism.languages.sass && Prism.languages.sass['property-line']
			}
		],
		'scss': true,
		'stylus': [
			{
				lang: 'stylus',
				before: 'hexcode',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
			},
			{
				lang: 'stylus',
				before: 'hexcode',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
			}
		]
	};

	Prism.hooks.add('before-highlight', function (env) {
		if (env.language && languages[env.language] && !languages[env.language].initialized) {
			var lang = languages[env.language];
			if (Prism.util.type(lang) !== 'Array') {
				lang = [lang];
			}
			lang.forEach(function(lang) {
				var before, inside, root, skip;
				if (lang === true) {
					before = 'important';
					inside = env.language;
					lang = env.language;
				} else {
					before = lang.before || 'important';
					inside = lang.inside || lang.lang;
					root = lang.root || Prism.languages;
					skip = lang.skip;
					lang = env.language;
				}

				if (!skip && Prism.languages[lang]) {
					Prism.languages.insertBefore(inside, before, {
						'color': /\B#(?:[0-9a-f]{3}){1,2}\b|\b(?:rgb|hsl)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)\B|\b(?:rgb|hsl)a\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*(?:0|0?\.\d+|1)\s*\)\B|\b(?:AliceBlue|AntiqueWhite|Aqua|Aquamarine|Azure|Beige|Bisque|Black|BlanchedAlmond|Blue|BlueViolet|Brown|BurlyWood|CadetBlue|Chartreuse|Chocolate|Coral|CornflowerBlue|Cornsilk|Crimson|Cyan|DarkBlue|DarkCyan|DarkGoldenRod|DarkGray|DarkGreen|DarkKhaki|DarkMagenta|DarkOliveGreen|DarkOrange|DarkOrchid|DarkRed|DarkSalmon|DarkSeaGreen|DarkSlateBlue|DarkSlateGray|DarkTurquoise|DarkViolet|DeepPink|DeepSkyBlue|DimGray|DodgerBlue|FireBrick|FloralWhite|ForestGreen|Fuchsia|Gainsboro|GhostWhite|Gold|GoldenRod|Gray|Green|GreenYellow|HoneyDew|HotPink|IndianRed|Indigo|Ivory|Khaki|Lavender|LavenderBlush|LawnGreen|LemonChiffon|LightBlue|LightCoral|LightCyan|LightGoldenRodYellow|LightGray|LightGreen|LightPink|LightSalmon|LightSeaGreen|LightSkyBlue|LightSlateGray|LightSteelBlue|LightYellow|Lime|LimeGreen|Linen|Magenta|Maroon|MediumAquaMarine|MediumBlue|MediumOrchid|MediumPurple|MediumSeaGreen|MediumSlateBlue|MediumSpringGreen|MediumTurquoise|MediumVioletRed|MidnightBlue|MintCream|MistyRose|Moccasin|NavajoWhite|Navy|OldLace|Olive|OliveDrab|Orange|OrangeRed|Orchid|PaleGoldenRod|PaleGreen|PaleTurquoise|PaleVioletRed|PapayaWhip|PeachPuff|Peru|Pink|Plum|PowderBlue|Purple|Red|RosyBrown|RoyalBlue|SaddleBrown|Salmon|SandyBrown|SeaGreen|SeaShell|Sienna|Silver|SkyBlue|SlateBlue|SlateGray|Snow|SpringGreen|SteelBlue|Tan|Teal|Thistle|Tomato|Turquoise|Violet|Wheat|White|WhiteSmoke|Yellow|YellowGreen)\b/i
					}, root);
					env.grammar = Prism.languages[lang];

					languages[env.language] = {initialized: true};
				}
			});
		}
	});

	if (Prism.plugins.Previewer) {
		new Prism.plugins.Previewer('color', function(value) {
			this.style.backgroundColor = '';
			this.style.backgroundColor = value;
			return !!this.style.backgroundColor;
		});
	}

}());
(function() {

	if (
		typeof self !== 'undefined' && !self.Prism ||
		typeof global !== 'undefined' && !global.Prism
	) {
		return;
	}

	var languages = {
		'css': true,
		'less': true,
		'sass': [
			{
				lang: 'sass',
				before: 'punctuation',
				inside: 'inside',
				root: Prism.languages.sass && Prism.languages.sass['variable-line']
			},
			{
				lang: 'sass',
				before: 'punctuation',
				inside: 'inside',
				root: Prism.languages.sass && Prism.languages.sass['property-line']
			}
		],
		'scss': true,
		'stylus': [
			{
				lang: 'stylus',
				before: 'func',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
			},
			{
				lang: 'stylus',
				before: 'func',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
			}
		]
	};

	Prism.hooks.add('before-highlight', function (env) {
		if (env.language && languages[env.language] && !languages[env.language].initialized) {
			var lang = languages[env.language];
			if (Prism.util.type(lang) !== 'Array') {
				lang = [lang];
			}
			lang.forEach(function(lang) {
				var before, inside, root, skip;
				if (lang === true) {
					// Insert before color previewer if it exists
					before = Prism.plugins.Previewer && Prism.plugins.Previewer.byType['color'] ? 'color' : 'important';
					inside = env.language;
					lang = env.language;
				} else {
					before = lang.before || 'important';
					inside = lang.inside || lang.lang;
					root = lang.root || Prism.languages;
					skip = lang.skip;
					lang = env.language;
				}

				if (!skip && Prism.languages[lang]) {
					Prism.languages.insertBefore(inside, before, {
						'gradient': {
							pattern: /(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\((?:(?:rgb|hsl)a?\(.+?\)|[^\)])+\)/gi,
							inside: {
								'function': /[\w-]+(?=\()/,
								'punctuation': /[(),]/
							}
						}
					}, root);
					env.grammar = Prism.languages[lang];

					languages[env.language] = {initialized: true};
				}
			});
		}
	});

	// Stores already processed gradients so that we don't
	// make the conversion every time the previewer is shown
	var cache = {};

	/**
	 * Returns a W3C-valid linear gradient
	 * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
	 * @param {string} func Gradient function name ("linear-gradient")
	 * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
	 */
	var convertToW3CLinearGradient = function(prefix, func, values) {
		// Default value for angle
		var angle = '180deg';

		if (/^(?:-?\d*\.?\d+(?:deg|rad)|to\b|top|right|bottom|left)/.test(values[0])) {
			angle = values.shift();
			if (angle.indexOf('to ') < 0) {
				// Angle uses old keywords
				// W3C syntax uses "to" + opposite keywords
				if (angle.indexOf('top') >= 0) {
					if (angle.indexOf('left') >= 0) {
						angle = 'to bottom right';
					} else if (angle.indexOf('right') >= 0) {
						angle = 'to bottom left';
					} else {
						angle = 'to bottom';
					}
				} else if (angle.indexOf('bottom') >= 0) {
					if (angle.indexOf('left') >= 0) {
						angle = 'to top right';
					} else if (angle.indexOf('right') >= 0) {
						angle = 'to top left';
					} else {
						angle = 'to top';
					}
				} else if (angle.indexOf('left') >= 0) {
					angle = 'to right';
				} else if (angle.indexOf('right') >= 0) {
					angle = 'to left';
				} else if (prefix) {
					// Angle is shifted by 90deg in prefixed gradients
					if (angle.indexOf('deg') >= 0) {
						angle = (90 - parseFloat(angle)) + 'deg';
					} else if (angle.indexOf('rad') >= 0) {
						angle = (Math.PI / 2 - parseFloat(angle)) + 'rad';
					}
				}
			}
		}

		return func + '(' + angle + ',' + values.join(',') + ')';
	};

	/**
	 * Returns a W3C-valid radial gradient
	 * @param {string} prefix Vendor prefix if any ("-moz-", "-webkit-", etc.)
	 * @param {string} func Gradient function name ("linear-gradient")
	 * @param {string[]} values Array of the gradient function parameters (["0deg", "red 0%", "blue 100%"])
	 */
	var convertToW3CRadialGradient = function(prefix, func, values) {
		if (values[0].indexOf('at') < 0) {
			// Looks like old syntax

			// Default values
			var position = 'center';
			var shape = 'ellipse';
			var size = 'farthest-corner';

			if (/\bcenter|top|right|bottom|left\b|^\d+/.test(values[0])) {
				// Found a position
				// Remove angle value, if any
				position = values.shift().replace(/\s*-?\d+(?:rad|deg)\s*/, '');
			}
			if (/\bcircle|ellipse|closest|farthest|contain|cover\b/.test(values[0])) {
				// Found a shape and/or size
				var shapeSizeParts = values.shift().split(/\s+/);
				if (shapeSizeParts[0] && (shapeSizeParts[0] === 'circle' || shapeSizeParts[0] === 'ellipse')) {
					shape = shapeSizeParts.shift();
				}
				if (shapeSizeParts[0]) {
					size = shapeSizeParts.shift();
				}

				// Old keywords are converted to their synonyms
				if (size === 'cover') {
					size = 'farthest-corner';
				} else if (size === 'contain') {
					size = 'clothest-side';
				}
			}

			return func + '(' + shape + ' ' + size + ' at ' + position + ',' + values.join(',') + ')';
		}
		return func + '(' + values.join(',') + ')';
	};

	/**
	 * Converts a gradient to a W3C-valid one
	 * Does not support old webkit syntax (-webkit-gradient(linear...) and -webkit-gradient(radial...))
	 * @param {string} gradient The CSS gradient
	 */
	var convertToW3CGradient = function(gradient) {
		if (cache[gradient]) {
			return cache[gradient];
		}
		var parts = gradient.match(/^(\b|\B-[a-z]{1,10}-)((?:repeating-)?(?:linear|radial)-gradient)/);
		// "", "-moz-", etc.
		var prefix = parts && parts[1];
		// "linear-gradient", "radial-gradient", etc.
		var func = parts && parts[2];

		var values = gradient.replace(/^(?:\b|\B-[a-z]{1,10}-)(?:repeating-)?(?:linear|radial)-gradient\(|\)$/g, '').split(/\s*,\s*/);

		if (func.indexOf('linear') >= 0) {
			return cache[gradient] = convertToW3CLinearGradient(prefix, func, values);
		} else if (func.indexOf('radial') >= 0) {
			return cache[gradient] = convertToW3CRadialGradient(prefix, func, values);
		}
		return cache[gradient] = func + '(' + values.join(',') + ')';
	};



	if (Prism.plugins.Previewer) {
		new Prism.plugins.Previewer('gradient', function(value) {
			this.firstChild.style.backgroundImage = '';
			this.firstChild.style.backgroundImage = convertToW3CGradient(value);
			return !!this.firstChild.style.backgroundImage;
		}, '*', function () {
			this._elt.innerHTML = '<div></div>';
		});
	}

}());
(function() {

	if (
		typeof self !== 'undefined' && !self.Prism ||
		typeof global !== 'undefined' && !global.Prism
	) {
		return;
	}

	var languages = {
		'css': true,
		'less': true,
		'sass': [
			{
				lang: 'sass',
				inside: 'inside',
				before: 'punctuation',
				root: Prism.languages.sass && Prism.languages.sass['variable-line']
			},
			{
				lang: 'sass',
				inside: 'inside',
				root: Prism.languages.sass && Prism.languages.sass['property-line']
			}
		],
		'scss': true,
		'stylus': [
			{
				lang: 'stylus',
				before: 'hexcode',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['property-declaration'].inside
			},
			{
				lang: 'stylus',
				before: 'hexcode',
				inside: 'rest',
				root: Prism.languages.stylus && Prism.languages.stylus['variable-declaration'].inside
			}
		]
	};

	Prism.hooks.add('before-highlight', function (env) {
		if (env.language && languages[env.language] && !languages[env.language].initialized) {
			var lang = languages[env.language];
			if (Prism.util.type(lang) !== 'Array') {
				lang = [lang];
			}
			lang.forEach(function(lang) {
				var before, inside, root, skip;
				if (lang === true) {
					before = 'important';
					inside = env.language;
					lang = env.language;
				} else {
					before = lang.before || 'important';
					inside = lang.inside || lang.lang;
					root = lang.root || Prism.languages;
					skip = lang.skip;
					lang = env.language;
				}

				if (!skip && Prism.languages[lang]) {
					Prism.languages.insertBefore(inside, before, {
						'easing': /\bcubic-bezier\((?:-?\d*\.?\d+,\s*){3}-?\d*\.?\d+\)\B|\b(?:linear|ease(?:-in)?(?:-out)?)(?=\s|[;}]|$)/i
					}, root);
					env.grammar = Prism.languages[lang];

					languages[env.language] = {initialized: true};
				}
			});
		}
	});

	if (Prism.plugins.Previewer) {
		new Prism.plugins.Previewer('easing', function (value) {

			value = {
				'linear': '0,0,1,1',
				'ease': '.25,.1,.25,1',
				'ease-in': '.42,0,1,1',
				'ease-out': '0,0,.58,1',
				'ease-in-out':'.42,0,.58,1'
			}[value] || value;

			var p = value.match(/-?\d*\.?\d+/g);

			if(p.length === 4) {
				p = p.map(function(p, i) { return (i % 2? 1 - p : p) * 100; });

				this.querySelector('path').setAttribute('d', 'M0,100 C' + p[0] + ',' + p[1] + ', ' + p[2] + ',' + p[3] + ', 100,0');

				var lines = this.querySelectorAll('line');
				lines[0].setAttribute('x2', p[0]);
				lines[0].setAttribute('y2', p[1]);
				lines[1].setAttribute('x2', p[2]);
				lines[1].setAttribute('y2', p[3]);

				return true;
			}

			return false;
		}, '*', function () {
			this._elt.innerHTML = '<svg viewBox="-20 -20 140 140" width="100" height="100">' +
				'<defs>' +
					'<marker id="prism-previewer-easing-marker" viewBox="0 0 4 4" refX="2" refY="2" markerUnits="strokeWidth">' +
						'<circle cx="2" cy="2" r="1.5" />' +
					'</marker>' +
				'</defs>' +
				'<path d="M0,100 C20,50, 40,30, 100,0" />' +
				'<line x1="0" y1="100" x2="20" y2="50" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
				'<line x1="100" y1="0" x2="40" y2="30" marker-start="url(' + location.href + '#prism-previewer-easing-marker)" marker-end="url(' + location.href + '#prism-previewer-easing-marker)" />' +
			'</svg>';
		});
	}

}());
(function () {
	if (typeof self === 'undefined' || !self.Prism || !self.document || !document.createElement) {
		return;
	}

	// The dependencies map is built automatically with gulp
	var lang_dependencies = /*languages_placeholder[*/{"javascript":"clike","actionscript":"javascript","aspnet":"markup","bison":"c","c":"clike","csharp":"clike","cpp":"c","coffeescript":"javascript","crystal":"ruby","css-extras":"css","d":"clike","dart":"clike","django":"markup","fsharp":"clike","glsl":"clike","go":"clike","groovy":"clike","haml":"ruby","handlebars":"markup","haxe":"clike","jade":"javascript","java":"clike","jolie":"clike","kotlin":"clike","less":"css","markdown":"markup","nginx":"clike","objectivec":"c","parser":"markup","php":"clike","php-extras":"php","processing":"clike","protobuf":"clike","qore":"clike","jsx":["markup","javascript"],"reason":"clike","ruby":"clike","sass":"css","scss":"css","scala":"java","smarty":"markup","swift":"clike","textile":"markup","twig":"markup","typescript":"javascript","vbnet":"basic","wiki":"markup"}/*]*/;

	var lang_data = {};

	var ignored_language = 'none';

	var config = Prism.plugins.autoloader = {
		languages_path: 'components/',
		use_minified: true
	};

	/**
	 * Lazy loads an external script
	 * @param {string} src
	 * @param {function=} success
	 * @param {function=} error
	 */
	var script = function (src, success, error) {
		var s = document.createElement('script');
		s.src = src;
		s.async = true;
		s.onload = function() {
			document.body.removeChild(s);
			success && success();
		};
		s.onerror = function() {
			document.body.removeChild(s);
			error && error();
		};
		document.body.appendChild(s);
	};

	/**
	 * Returns the path to a grammar, using the language_path and use_minified config keys.
	 * @param {string} lang
	 * @returns {string}
	 */
	var getLanguagePath = function (lang) {
		return config.languages_path +
			'prism-' + lang
			+ (config.use_minified ? '.min' : '') + '.js'
	};

	/**
	 * Tries to load a grammar and
	 * highlight again the given element once loaded.
	 * @param {string} lang
	 * @param {HTMLElement} elt
	 */
	var registerElement = function (lang, elt) {
		var data = lang_data[lang];
		if (!data) {
			data = lang_data[lang] = {};
		}

		// Look for additional dependencies defined on the <code> or <pre> tags
		var deps = elt.getAttribute('data-dependencies');
		if (!deps && elt.parentNode && elt.parentNode.tagName.toLowerCase() === 'pre') {
			deps = elt.parentNode.getAttribute('data-dependencies');
		}

		if (deps) {
			deps = deps.split(/\s*,\s*/g);
		} else {
			deps = [];
		}

		loadLanguages(deps, function () {
			loadLanguage(lang, function () {
				Prism.highlightElement(elt);
			});
		});
	};

	/**
	 * Sequentially loads an array of grammars.
	 * @param {string[]|string} langs
	 * @param {function=} success
	 * @param {function=} error
	 */
	var loadLanguages = function (langs, success, error) {
		if (typeof langs === 'string') {
			langs = [langs];
		}
		var i = 0;
		var l = langs.length;
		var f = function () {
			if (i < l) {
				loadLanguage(langs[i], function () {
					i++;
					f();
				}, function () {
					error && error(langs[i]);
				});
			} else if (i === l) {
				success && success(langs);
			}
		};
		f();
	};

	/**
	 * Load a grammar with its dependencies
	 * @param {string} lang
	 * @param {function=} success
	 * @param {function=} error
	 */
	var loadLanguage = function (lang, success, error) {
		var load = function () {
			var force = false;
			// Do we want to force reload the grammar?
			if (lang.indexOf('!') >= 0) {
				force = true;
				lang = lang.replace('!', '');
			}

			var data = lang_data[lang];
			if (!data) {
				data = lang_data[lang] = {};
			}
			if (success) {
				if (!data.success_callbacks) {
					data.success_callbacks = [];
				}
				data.success_callbacks.push(success);
			}
			if (error) {
				if (!data.error_callbacks) {
					data.error_callbacks = [];
				}
				data.error_callbacks.push(error);
			}

			if (!force && Prism.languages[lang]) {
				languageSuccess(lang);
			} else if (!force && data.error) {
				languageError(lang);
			} else if (force || !data.loading) {
				data.loading = true;
				var src = getLanguagePath(lang);
				script(src, function () {
					data.loading = false;
					languageSuccess(lang);

				}, function () {
					data.loading = false;
					data.error = true;
					languageError(lang);
				});
			}
		};
		var dependencies = lang_dependencies[lang];
		if(dependencies && dependencies.length) {
			loadLanguages(dependencies, load);
		} else {
			load();
		}
	};

	/**
	 * Runs all success callbacks for this language.
	 * @param {string} lang
	 */
	var languageSuccess = function (lang) {
		if (lang_data[lang] && lang_data[lang].success_callbacks && lang_data[lang].success_callbacks.length) {
			lang_data[lang].success_callbacks.forEach(function (f) {
				f(lang);
			});
		}
	};

	/**
	 * Runs all error callbacks for this language.
	 * @param {string} lang
	 */
	var languageError = function (lang) {
		if (lang_data[lang] && lang_data[lang].error_callbacks && lang_data[lang].error_callbacks.length) {
			lang_data[lang].error_callbacks.forEach(function (f) {
				f(lang);
			});
		}
	};

	Prism.hooks.add('complete', function (env) {
		if (env.element && env.language && !env.grammar) {
			if (env.language !== ignored_language) {
				registerElement(env.language, env.element);
			}
		}
	});

}());
(function(){

if (typeof self === 'undefined' || !self.Prism || !self.document) {
	return;
}

if (!Prism.plugins.toolbar) {
	console.warn('Show Languages plugin loaded before Toolbar plugin.');

	return;
}

// The languages map is built automatically with gulp
var Languages = /*languages_placeholder[*/{"html":"HTML","xml":"XML","svg":"SVG","mathml":"MathML","css":"CSS","clike":"C-like","javascript":"JavaScript","abap":"ABAP","actionscript":"ActionScript","apacheconf":"Apache Configuration","apl":"APL","applescript":"AppleScript","asciidoc":"AsciiDoc","aspnet":"ASP.NET (C#)","autoit":"AutoIt","autohotkey":"AutoHotkey","basic":"BASIC","csharp":"C#","cpp":"C++","coffeescript":"CoffeeScript","css-extras":"CSS Extras","django":"Django/Jinja2","fsharp":"F#","glsl":"GLSL","graphql":"GraphQL","http":"HTTP","inform7":"Inform 7","json":"JSON","latex":"LaTeX","livescript":"LiveScript","lolcode":"LOLCODE","matlab":"MATLAB","mel":"MEL","nasm":"NASM","nginx":"nginx","nsis":"NSIS","objectivec":"Objective-C","ocaml":"OCaml","parigp":"PARI/GP","php":"PHP","php-extras":"PHP Extras","powershell":"PowerShell","properties":".properties","protobuf":"Protocol Buffers","jsx":"React JSX","rest":"reST (reStructuredText)","sas":"SAS","sass":"Sass (Sass)","scss":"Sass (Scss)","sql":"SQL","typescript":"TypeScript","vbnet":"VB.Net","vhdl":"VHDL","vim":"vim","wiki":"Wiki markup","xojo":"Xojo (REALbasic)","yaml":"YAML"}/*]*/;
Prism.plugins.toolbar.registerButton('show-language', function(env) {
	var pre = env.element.parentNode;
	if (!pre || !/pre/i.test(pre.nodeName)) {
		return;
	}
	var language = pre.getAttribute('data-language') || Languages[env.language] || (env.language.substring(0, 1).toUpperCase() + env.language.substring(1));

	var element = document.createElement('span');
	element.textContent = language;

	return element;
});

})();

(function(){
	if (typeof self === 'undefined' || !self.Prism || !self.document) {
		return;
	}

	if (!Prism.plugins.toolbar) {
		console.warn('Copy to Clipboard plugin loaded before Toolbar plugin.');

		return;
	}

	var Clipboard = window.Clipboard || undefined;

	if (!Clipboard && typeof require === 'function') {
		Clipboard = require('clipboard');
	}

	var callbacks = [];

	if (!Clipboard) {
		var script = document.createElement('script');
		var head = document.querySelector('head');

		script.onload = function() {
			Clipboard = window.Clipboard;

			if (Clipboard) {
				while (callbacks.length) {
					callbacks.pop()();
				}
			}
		};

		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.8/clipboard.min.js';
		head.appendChild(script);
	}

	Prism.plugins.toolbar.registerButton('copy-to-clipboard', function (env) {
		var linkCopy = document.createElement('a');
		linkCopy.textContent = 'Copy';

		if (!Clipboard) {
			callbacks.push(registerClipboard);
		} else {
			registerClipboard();
		}

		return linkCopy;

		function registerClipboard() {
			var clip = new Clipboard(linkCopy, {
				'text': function () {
					return env.code;
				}
			});

			clip.on('success', function() {
				linkCopy.textContent = 'Copied!';

				resetText();
			});
			clip.on('error', function () {
				linkCopy.textContent = 'Press Ctrl+C to copy';

				resetText();
			});
		}

		function resetText() {
			setTimeout(function () {
				linkCopy.textContent = 'Copy';
			}, 5000);
		}
	});
})();

