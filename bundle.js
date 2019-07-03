
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(component, store, callback) {
        const unsub = store.subscribe(callback);
        component.$$.on_destroy.push(unsub.unsubscribe
            ? () => unsub.unsubscribe()
            : unsub);
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? requestAnimationFrame : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function claim_element(nodes, name, attributes, svg) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeName === name) {
                for (let j = 0; j < node.attributes.length; j += 1) {
                    const attribute = node.attributes[j];
                    if (!attributes[attribute.name])
                        node.removeAttribute(attribute.name);
                }
                return nodes.splice(i, 1)[0]; // TODO strip unwanted attributes
            }
        }
        return svg ? svg_element(name) : element(name);
    }
    function claim_text(nodes, data) {
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node.nodeType === 3) {
                node.data = data;
                return nodes.splice(i, 1)[0];
            }
        }
        return text(data);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    let outros;
    function group_outros() {
        outros = {
            remaining: 0,
            callbacks: []
        };
    }
    function check_outros() {
        if (!outros.remaining) {
            run_all(outros.callbacks);
        }
    }
    function on_outro(callback) {
        outros.callbacks.push(callback);
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick: tick$$1 = noop, css } = config;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.remaining += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick$$1(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now$$1 => {
                    if (pending_program && now$$1 > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now$$1 >= running_program.end) {
                            tick$$1(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.remaining)
                                        run_all(running_program.group.callbacks);
                                }
                            }
                            running_program = null;
                        }
                        else if (now$$1 >= running_program.start) {
                            const p = now$$1 - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick$$1(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_render.forEach(add_render_callback);
    }
    function destroy(component, detaching) {
        if (component.$$) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro && component.$$.fragment.i)
                component.$$.fragment.i();
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy(this, true);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        const invalidators = [];
        const store = readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                run_all(invalidators);
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
        return {
            subscribe(run, invalidate = noop) {
                invalidators.push(invalidate);
                const unsubscribe = store.subscribe(run, invalidate);
                return () => {
                    const index = invalidators.indexOf(invalidate);
                    if (index !== -1) {
                        invalidators.splice(index, 1);
                    }
                    unsubscribe();
                };
            }
        };
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.5.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.5.1 */

    // (39:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				on_outro(() => {
    					if_blocks[previous_block_index].d(1);
    					if_blocks[previous_block_index] = null;
    				});
    				if_block.o(1);
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				if_block.i(1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (42:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (40:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		l: function claim(nodes) {
    			if (switch_instance) switch_instance.$$.fragment.l(nodes);
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    				(changed.routeParams) && ctx.routeParams,
    				(changed.routeProps) && ctx.routeProps
    			]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					on_outro(() => {
    						old_component.$destroy();
    					});
    					old_component.$$.fragment.o(1);
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					switch_instance.$$.fragment.i(1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) switch_instance.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) switch_instance.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(switch_instance_anchor);
    			}

    			if (switch_instance) switch_instance.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					if_block.i(1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Link.svelte generated by Svelte v3.5.1 */

    const file = "node_modules\\svelte-routing\\src\\Link.svelte";

    function create_fragment$2(ctx) {
    	var a, current, dispose;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	var a_levels = [
    		{ href: ctx.href },
    		{ "aria-current": ctx.ariaCurrent },
    		ctx.props
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();
    			this.h();
    		},

    		l: function claim(nodes) {
    			a = claim_element(nodes, "A", { href: true, "aria-current": true }, false);
    			var a_nodes = children(a);

    			if (default_slot) default_slot.l(a_nodes);
    			a_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			set_attributes(a, a_data);
    			add_location(a, file, 40, 0, 1249);
    			dispose = listen(a, "click", ctx.onClick);
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.href) && { href: ctx.href },
    				(changed.ariaCurrent) && { "aria-current": ctx.ariaCurrent },
    				(changed.props) && ctx.props
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $base, $location;

    	

      let { to = "#", replace = false, state = {}, getProps = () => ({}) } = $$props;

      const { base } = getContext(ROUTER); validate_store(base, 'base'); subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });
      const location = getContext(LOCATION); validate_store(location, 'location'); subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });
      const dispatch = createEventDispatcher();

      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault();
          // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.
          const shouldReplace = $location.pathname === href || replace;
          navigate(href, { state, replace: shouldReplace });
        }
      }

    	const writable_props = ['to', 'replace', 'state', 'getProps'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('to' in $$props) $$invalidate('to', to = $$props.to);
    		if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
    		if ('state' in $$props) $$invalidate('state', state = $$props.state);
    		if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	let ariaCurrent;

    	$$self.$$.update = ($$dirty = { to: 1, $base: 1, $location: 1, href: 1, isCurrent: 1, getProps: 1, isPartiallyCurrent: 1 }) => {
    		if ($$dirty.to || $$dirty.$base) { $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri)); }
    		if ($$dirty.$location || $$dirty.href) { $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href)); }
    		if ($$dirty.href || $$dirty.$location) { $$invalidate('isCurrent', isCurrent = href === $location.pathname); }
    		if ($$dirty.isCurrent) { $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined); }
    		if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) { $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          })); }
    	};

    	return {
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		href,
    		props,
    		onClick,
    		ariaCurrent,
    		$$slots,
    		$$scope
    	};
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["to", "replace", "state", "getProps"]);
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    /* src\Editor.svelte generated by Svelte v3.5.1 */

    const file$1 = "src\\Editor.svelte";

    // (49:0) {#if mostrar}
    function create_if_block$1(ctx) {
    	var div5, div4, div0, span0, t0, input0, t1, div1, span1, t2, input1, t3, div2, span2, t4, input2, t5, div3, button, t6, t7, div5_transition, current, dispose;

    	var if_block = (ctx.selecionado) && create_if_block_1$1(ctx);

    	return {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = space();
    			input0 = element("input");
    			t1 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			div2 = element("div");
    			span2 = element("span");
    			t4 = space();
    			input2 = element("input");
    			t5 = space();
    			div3 = element("div");
    			button = element("button");
    			t6 = text("Adicionar");
    			t7 = space();
    			if (if_block) if_block.c();
    			this.h();
    		},

    		l: function claim(nodes) {
    			div5 = claim_element(nodes, "DIV", { class: true }, false);
    			var div5_nodes = children(div5);

    			div4 = claim_element(div5_nodes, "DIV", { class: true }, false);
    			var div4_nodes = children(div4);

    			div0 = claim_element(div4_nodes, "DIV", { class: true }, false);
    			var div0_nodes = children(div0);

    			span0 = claim_element(div0_nodes, "SPAN", { class: true, "uk-icon": true }, false);
    			var span0_nodes = children(span0);

    			span0_nodes.forEach(detach);
    			t0 = claim_text(div0_nodes, "\r\n                ");

    			input0 = claim_element(div0_nodes, "INPUT", { class: true, type: true }, false);
    			var input0_nodes = children(input0);

    			input0_nodes.forEach(detach);
    			div0_nodes.forEach(detach);
    			t1 = claim_text(div4_nodes, "\r\n            ");

    			div1 = claim_element(div4_nodes, "DIV", { class: true }, false);
    			var div1_nodes = children(div1);

    			span1 = claim_element(div1_nodes, "SPAN", { class: true, "uk-icon": true }, false);
    			var span1_nodes = children(span1);

    			span1_nodes.forEach(detach);
    			t2 = claim_text(div1_nodes, "\r\n                ");

    			input1 = claim_element(div1_nodes, "INPUT", { class: true, type: true }, false);
    			var input1_nodes = children(input1);

    			input1_nodes.forEach(detach);
    			div1_nodes.forEach(detach);
    			t3 = claim_text(div4_nodes, "\r\n            ");

    			div2 = claim_element(div4_nodes, "DIV", { class: true }, false);
    			var div2_nodes = children(div2);

    			span2 = claim_element(div2_nodes, "SPAN", { class: true, "uk-icon": true }, false);
    			var span2_nodes = children(span2);

    			span2_nodes.forEach(detach);
    			t4 = claim_text(div2_nodes, "\r\n                ");

    			input2 = claim_element(div2_nodes, "INPUT", { class: true, type: true, placeholder: true }, false);
    			var input2_nodes = children(input2);

    			input2_nodes.forEach(detach);
    			div2_nodes.forEach(detach);
    			t5 = claim_text(div4_nodes, "\r\n\r\n            ");

    			div3 = claim_element(div4_nodes, "DIV", { class: true, "uk-grid": true }, false);
    			var div3_nodes = children(div3);

    			button = claim_element(div3_nodes, "BUTTON", { "uk-icon": true, class: true }, false);
    			var button_nodes = children(button);

    			t6 = claim_text(button_nodes, "Adicionar");
    			button_nodes.forEach(detach);
    			t7 = claim_text(div3_nodes, "            \r\n                ");
    			if (if_block) if_block.l(div3_nodes);
    			div3_nodes.forEach(detach);
    			div4_nodes.forEach(detach);
    			div5_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			span0.className = "uk-form-icon";
    			attr(span0, "uk-icon", "icon: comment");
    			add_location(span0, file$1, 53, 16, 1368);
    			input0.className = "uk-input uk-width-1-1";
    			attr(input0, "type", "text");
    			add_location(input0, file$1, 54, 16, 1444);
    			div0.className = "uk-inline linha svelte-1vfdoss";
    			add_location(div0, file$1, 52, 12, 1321);
    			span1.className = "uk-form-icon";
    			attr(span1, "uk-icon", "icon: link");
    			add_location(span1, file$1, 58, 16, 1713);
    			input1.className = "uk-input uk-width-1-1";
    			attr(input1, "type", "text");
    			add_location(input1, file$1, 59, 16, 1786);
    			div1.className = "uk-inline linha svelte-1vfdoss";
    			add_location(div1, file$1, 57, 12, 1666);
    			span2.className = "uk-form-icon";
    			attr(span2, "uk-icon", "icon: link");
    			add_location(span2, file$1, 62, 16, 1937);
    			input2.className = "uk-input uk-width-1-1";
    			attr(input2, "type", "text");
    			input2.placeholder = "url da imagem";
    			add_location(input2, file$1, 63, 16, 2010);
    			div2.className = "uk-inline linha svelte-1vfdoss";
    			add_location(div2, file$1, 61, 12, 1890);
    			attr(button, "uk-icon", "icon: plus-circle");
    			button.className = "uk-button uk-button-default uk-width-1-1";
    			add_location(button, file$1, 67, 16, 2248);
    			div3.className = "uk-grid-small uk-child-width-expand@s uk-text-center uk-margin";
    			attr(div3, "uk-grid", "");
    			add_location(div3, file$1, 66, 12, 2146);
    			div4.className = "formeditor svelte-1vfdoss";
    			add_location(div4, file$1, 51, 8, 1283);
    			div5.className = "uk-card uk-card-primary uk-padding svelte-1vfdoss";
    			add_location(div5, file$1, 49, 4, 1197);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(button, "click", ctx.gravar)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div0);
    			append(div0, span0);
    			append(div0, t0);
    			append(div0, input0);

    			input0.value = ctx.nome;

    			append(div4, t1);
    			append(div4, div1);
    			append(div1, span1);
    			append(div1, t2);
    			append(div1, input1);

    			input1.value = ctx.link;

    			append(div4, t3);
    			append(div4, div2);
    			append(div2, span2);
    			append(div2, t4);
    			append(div2, input2);

    			input2.value = ctx.imagem;

    			append(div4, t5);
    			append(div4, div3);
    			append(div3, button);
    			append(button, t6);
    			append(div3, t7);
    			if (if_block) if_block.m(div3, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.nome && (input0.value !== ctx.nome)) input0.value = ctx.nome;
    			if (changed.link && (input1.value !== ctx.link)) input1.value = ctx.link;
    			if (changed.imagem && (input2.value !== ctx.imagem)) input2.value = ctx.imagem;

    			if (ctx.selecionado) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(div3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!div5_transition) div5_transition = create_bidirectional_transition(div5, slide, {}, true);
    				div5_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!div5_transition) div5_transition = create_bidirectional_transition(div5, slide, {}, false);
    			div5_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div5);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				if (div5_transition) div5_transition.end();
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (69:16) {#if selecionado}
    function create_if_block_1$1(ctx) {
    	var button0, t0, t1, button1, t2, dispose;

    	return {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("Editar");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Remover");
    			this.h();
    		},

    		l: function claim(nodes) {
    			button0 = claim_element(nodes, "BUTTON", { "uk-icon": true, class: true, style: true }, false);
    			var button0_nodes = children(button0);

    			t0 = claim_text(button0_nodes, "Editar");
    			button0_nodes.forEach(detach);
    			t1 = claim_text(nodes, "\r\n                ");

    			button1 = claim_element(nodes, "BUTTON", { "uk-icon": true, class: true }, false);
    			var button1_nodes = children(button1);

    			t2 = claim_text(button1_nodes, "Remover");
    			button1_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			attr(button0, "uk-icon", "icon: file-edit");
    			button0.className = "uk-button  uk-width-1-2";
    			set_style(button0, "background-color", "green");
    			add_location(button0, file$1, 69, 16, 2436);
    			attr(button1, "uk-icon", "icon: minus-circle");
    			button1.className = "uk-button uk-button-danger uk-width-1-2";
    			add_location(button1, file$1, 70, 16, 2587);

    			dispose = [
    				listen(button0, "click", ctx.editar),
    				listen(button1, "click", ctx.remover)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, button0, anchor);
    			append(button0, t0);
    			insert(target, t1, anchor);
    			insert(target, button1, anchor);
    			append(button1, t2);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button0);
    				detach(t1);
    				detach(button1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var div, t, button, current, dispose;

    	var if_block = (ctx.mostrar) && create_if_block$1(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			button = element("button");
    			this.h();
    		},

    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true }, false);
    			var div_nodes = children(div);

    			if (if_block) if_block.l(div_nodes);
    			t = claim_text(div_nodes, "\r\n");

    			button = claim_element(div_nodes, "BUTTON", { "uk-icon": true, class: true }, false);
    			var button_nodes = children(button);

    			button_nodes.forEach(detach);
    			div_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			attr(button, "uk-icon", "icon: plus-circle");
    			button.className = "uk-button uk-button-primary";
    			add_location(button, file$1, 77, 0, 2813);
    			div.className = "uk-scope svelte-1vfdoss";
    			add_location(div, file$1, 47, 0, 1154);
    			dispose = listen(button, "click", ctx.toggleMostrar);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);
    			append(div, button);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.mostrar) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					if_block.i(1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(div, t);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	
        const dispatch = createEventDispatcher();

        let { link, imagem, nome, id, selecionado, itemsTab1 } = $$props;

        function remover(){
            dispatch("remover");
        }
        function gravar(e){
            console.log('uid ='+uid);
            dispatch("salvar", {id:uid, nome:nome, link:link, img:imagem, selected:false});
        }
        function editar(e){
            dispatch("editar", {id:id, nome:nome, link:link, img:imagem, selected:false});
        }
        
        let mostrar = false;
        const toggleMostrar = () => { const $$result = (mostrar = !mostrar); $$invalidate('mostrar', mostrar); return $$result; };

    	const writable_props = ['link', 'imagem', 'nome', 'id', 'selecionado', 'itemsTab1'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		nome = this.value;
    		$$invalidate('nome', nome);
    	}

    	function input1_input_handler() {
    		link = this.value;
    		$$invalidate('link', link);
    	}

    	function input2_input_handler() {
    		imagem = this.value;
    		$$invalidate('imagem', imagem);
    	}

    	$$self.$set = $$props => {
    		if ('link' in $$props) $$invalidate('link', link = $$props.link);
    		if ('imagem' in $$props) $$invalidate('imagem', imagem = $$props.imagem);
    		if ('nome' in $$props) $$invalidate('nome', nome = $$props.nome);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('selecionado' in $$props) $$invalidate('selecionado', selecionado = $$props.selecionado);
    		if ('itemsTab1' in $$props) $$invalidate('itemsTab1', itemsTab1 = $$props.itemsTab1);
    	};

    	let uid;

    	$$self.$$.update = ($$dirty = { itemsTab1: 1 }) => {
    		if ($$dirty.itemsTab1) { uid = itemsTab1.length + 1; }
    	};

    	return {
    		link,
    		imagem,
    		nome,
    		id,
    		selecionado,
    		itemsTab1,
    		remover,
    		gravar,
    		editar,
    		mostrar,
    		toggleMostrar,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	};
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["link", "imagem", "nome", "id", "selecionado", "itemsTab1"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.link === undefined && !('link' in props)) {
    			console.warn("<Editor> was created without expected prop 'link'");
    		}
    		if (ctx.imagem === undefined && !('imagem' in props)) {
    			console.warn("<Editor> was created without expected prop 'imagem'");
    		}
    		if (ctx.nome === undefined && !('nome' in props)) {
    			console.warn("<Editor> was created without expected prop 'nome'");
    		}
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Editor> was created without expected prop 'id'");
    		}
    		if (ctx.selecionado === undefined && !('selecionado' in props)) {
    			console.warn("<Editor> was created without expected prop 'selecionado'");
    		}
    		if (ctx.itemsTab1 === undefined && !('itemsTab1' in props)) {
    			console.warn("<Editor> was created without expected prop 'itemsTab1'");
    		}
    	}

    	get link() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set link(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imagem() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imagem(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nome() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nome(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selecionado() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selecionado(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemsTab1() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemsTab1(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Home.svelte generated by Svelte v3.5.1 */

    const file$2 = "src\\Home.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.each_value = list;
    	child_ctx.item_index = i;
    	return child_ctx;
    }

    // (96:14) {#each itemsTab1 as item}
    function create_each_block(ctx) {
    	var label, input, t0, a, t1_value = ctx.item.nome, t1, t2, img, img_src_value, a_href_value, label_transition, current, dispose;

    	function input_change_handler() {
    		ctx.input_change_handler.call(input, ctx);
    	}

    	return {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			img = element("img");
    			this.h();
    		},

    		l: function claim(nodes) {
    			label = claim_element(nodes, "LABEL", {}, false);
    			var label_nodes = children(label);

    			input = claim_element(label_nodes, "INPUT", { class: true, type: true }, false);
    			var input_nodes = children(input);

    			input_nodes.forEach(detach);
    			t0 = claim_text(label_nodes, "\r\n                  ");

    			a = claim_element(label_nodes, "A", { href: true }, false);
    			var a_nodes = children(a);

    			t1 = claim_text(a_nodes, t1_value);
    			t2 = claim_text(a_nodes, "\r\n                    ");

    			img = claim_element(a_nodes, "IMG", { src: true, alt: true }, false);
    			var img_nodes = children(img);

    			img_nodes.forEach(detach);
    			a_nodes.forEach(detach);
    			label_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			input.className = "uk-checkbox";
    			attr(input, "type", "checkbox");
    			add_location(input, file$2, 97, 18, 2581);
    			img.src = img_src_value = ctx.item.img;
    			img.alt = "";
    			add_location(img, file$2, 103, 20, 2814);
    			a.href = a_href_value = ctx.item.link;
    			add_location(a, file$2, 101, 18, 2738);
    			add_location(label, file$2, 96, 16, 2537);
    			dispose = listen(input, "change", input_change_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);

    			input.checked = ctx.item.selected;

    			append(label, t0);
    			append(label, a);
    			append(a, t1);
    			append(a, t2);
    			append(a, img);
    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.itemsTab1) input.checked = ctx.item.selected;

    			if ((!current || changed.itemsTab1) && t1_value !== (t1_value = ctx.item.nome)) {
    				set_data(t1, t1_value);
    			}

    			if ((!current || changed.itemsTab1) && img_src_value !== (img_src_value = ctx.item.img)) {
    				img.src = img_src_value;
    			}

    			if ((!current || changed.itemsTab1) && a_href_value !== (a_href_value = ctx.item.link)) {
    				a.href = a_href_value;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!label_transition) label_transition = create_bidirectional_transition(label, slide, {}, true);
    				label_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!label_transition) label_transition = create_bidirectional_transition(label, slide, {}, false);
    			label_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(label);
    				if (label_transition) label_transition.end();
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var div17, div1, div0, t0, div10, div3, t1, div2, t2, div4, h10, t3, t4, a0, t5, img0, t6, a1, t7, img1, t8, a2, t9, img2, t10, a3, t11, t12, h20, t13, t14, a4, t15, t16, a5, t17, t18, h21, t19, t20, a6, t21, t22, a7, t23, t24, a8, t25, t26, a9, t27, t28, a10, t29, t30, a11, t31, t32, a12, t33, t34, h22, t35, t36, a13, t37, t38, a14, t39, t40, a15, t41, t42, a16, t43, t44, div9, h11, t45, t46, h23, t47, t48, h30, t49, b0, t50, t51, div5, a17, t52, t53, a18, t54, t55, h31, t56, b1, t57, t58, div6, a19, t59, t60, a20, t61, t62, h32, t63, b2, t64, div7, a21, t65, t66, a22, t67, t68, h33, t69, b3, t70, div8, a23, t71, t72, a24, t73, t74, h24, t75, t76, a25, t77, t78, h25, t79, t80, a26, t81, t82, a27, t83, t84, div16, div11, t85, t86, div12, t87, t88, div13, t89, t90, div14, t91, t92, div15, t93, current;

    	var editor = new Editor({
    		props: {
    		itemsTab1: ctx.itemsTab1,
    		selecionado: ctx.selecionado,
    		nome: ctx.nome,
    		link: ctx.link,
    		imagem: ctx.imagem,
    		id: ctx.id
    	},
    		$$inline: true
    	});
    	editor.$on("remover", ctx.remove);
    	editor.$on("salvar", ctx.salvar);
    	editor.$on("editar", ctx.editar);

    	var each_value = ctx.itemsTab1;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div17 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div10 = element("div");
    			div3 = element("div");
    			editor.$$.fragment.c();
    			t1 = space();
    			div2 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div4 = element("div");
    			h10 = element("h1");
    			t3 = text("Links");
    			t4 = space();
    			a0 = element("a");
    			t5 = text("/pol/\r\n        ");
    			img0 = element("img");
    			t6 = space();
    			a1 = element("a");
    			t7 = text("/wg/\r\n        ");
    			img1 = element("img");
    			t8 = space();
    			a2 = element("a");
    			t9 = text("/gd/\r\n        ");
    			img2 = element("img");
    			t10 = space();
    			a3 = element("a");
    			t11 = text("Asana");
    			t12 = space();
    			h20 = element("h2");
    			t13 = text("Sites de Imagens");
    			t14 = space();
    			a4 = element("a");
    			t15 = text("PXHere");
    			t16 = space();
    			a5 = element("a");
    			t17 = text("Pexels");
    			t18 = space();
    			h21 = element("h2");
    			t19 = text("CSS");
    			t20 = space();
    			a6 = element("a");
    			t21 = text("Animista - presets de animações");
    			t22 = space();
    			a7 = element("a");
    			t23 = text("Loading.io");
    			t24 = space();
    			a8 = element("a");
    			t25 = text("Coolors - cores, paletas");
    			t26 = space();
    			a9 = element("a");
    			t27 = text("Clippy - SVG formas geometricas");
    			t28 = space();
    			a10 = element("a");
    			t29 = text("SVG Backgrounds");
    			t30 = space();
    			a11 = element("a");
    			t31 = text("Triangulos backgrounds");
    			t32 = space();
    			a12 = element("a");
    			t33 = text("Keyframes.app");
    			t34 = space();
    			h22 = element("h2");
    			t35 = text("Inspiração");
    			t36 = space();
    			a13 = element("a");
    			t37 = text("Evernote Design");
    			t38 = space();
    			a14 = element("a");
    			t39 = text("Webframe");
    			t40 = space();
    			a15 = element("a");
    			t41 = text("Dribble");
    			t42 = space();
    			a16 = element("a");
    			t43 = text("Dribble 2");
    			t44 = space();
    			div9 = element("div");
    			h11 = element("h1");
    			t45 = text("Work");
    			t46 = space();
    			h23 = element("h2");
    			t47 = text("Servidores");
    			t48 = space();
    			h30 = element("h3");
    			t49 = text("Contabo  \r\n        ");
    			b0 = element("b");
    			t50 = text("6");
    			t51 = space();
    			div5 = element("div");
    			a17 = element("a");
    			t52 = text("Rancher");
    			t53 = space();
    			a18 = element("a");
    			t54 = text("PMA");
    			t55 = space();
    			h31 = element("h3");
    			t56 = text("Contabo  \r\n        ");
    			b1 = element("b");
    			t57 = text("8");
    			t58 = space();
    			div6 = element("div");
    			a19 = element("a");
    			t59 = text("Rancher");
    			t60 = space();
    			a20 = element("a");
    			t61 = text("PMA");
    			t62 = space();
    			h32 = element("h3");
    			t63 = text("Hetzner  \r\n        ");
    			b2 = element("b");
    			t64 = space();
    			div7 = element("div");
    			a21 = element("a");
    			t65 = text("Rancher");
    			t66 = space();
    			a22 = element("a");
    			t67 = text("PMA");
    			t68 = space();
    			h33 = element("h3");
    			t69 = text("Hetzner  2\r\n        ");
    			b3 = element("b");
    			t70 = space();
    			div8 = element("div");
    			a23 = element("a");
    			t71 = text("Rancher");
    			t72 = space();
    			a24 = element("a");
    			t73 = text("PMA");
    			t74 = space();
    			h24 = element("h2");
    			t75 = text("Github");
    			t76 = space();
    			a25 = element("a");
    			t77 = text("Github relato");
    			t78 = space();
    			h25 = element("h2");
    			t79 = text("Mautic");
    			t80 = space();
    			a26 = element("a");
    			t81 = text("Guia Powertic");
    			t82 = space();
    			a27 = element("a");
    			t83 = text("Luizeof");
    			t84 = space();
    			div16 = element("div");
    			div11 = element("div");
    			t85 = text("424964");
    			t86 = space();
    			div12 = element("div");
    			t87 = text("1A1423");
    			t88 = space();
    			div13 = element("div");
    			t89 = text("E26D5A");
    			t90 = space();
    			div14 = element("div");
    			t91 = text("FFC857");
    			t92 = space();
    			div15 = element("div");
    			t93 = text("1F2041");
    			this.h();
    		},

    		l: function claim(nodes) {
    			div17 = claim_element(nodes, "DIV", { class: true }, false);
    			var div17_nodes = children(div17);

    			div1 = claim_element(div17_nodes, "DIV", { class: true }, false);
    			var div1_nodes = children(div1);

    			div0 = claim_element(div1_nodes, "DIV", {}, false);
    			var div0_nodes = children(div0);

    			div0_nodes.forEach(detach);
    			div1_nodes.forEach(detach);
    			t0 = claim_text(div17_nodes, "\r\n\r\n  ");

    			div10 = claim_element(div17_nodes, "DIV", { class: true }, false);
    			var div10_nodes = children(div10);

    			div3 = claim_element(div10_nodes, "DIV", { class: true }, false);
    			var div3_nodes = children(div3);

    			editor.$$.fragment.l(div3_nodes);
    			t1 = claim_text(div3_nodes, "\r\n\r\n            ");

    			div2 = claim_element(div3_nodes, "DIV", { class: true }, false);
    			var div2_nodes = children(div2);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div2_nodes);
    			}

    			div2_nodes.forEach(detach);
    			div3_nodes.forEach(detach);
    			t2 = claim_text(div10_nodes, "\r\n\r\n    ");

    			div4 = claim_element(div10_nodes, "DIV", { class: true }, false);
    			var div4_nodes = children(div4);

    			h10 = claim_element(div4_nodes, "H1", {}, false);
    			var h10_nodes = children(h10);

    			t3 = claim_text(h10_nodes, "Links");
    			h10_nodes.forEach(detach);
    			t4 = claim_text(div4_nodes, "\r\n      ");

    			a0 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a0_nodes = children(a0);

    			t5 = claim_text(a0_nodes, "/pol/\r\n        ");

    			img0 = claim_element(a0_nodes, "IMG", { src: true, alt: true }, false);
    			var img0_nodes = children(img0);

    			img0_nodes.forEach(detach);
    			a0_nodes.forEach(detach);
    			t6 = claim_text(div4_nodes, "\r\n      ");

    			a1 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a1_nodes = children(a1);

    			t7 = claim_text(a1_nodes, "/wg/\r\n        ");

    			img1 = claim_element(a1_nodes, "IMG", { src: true, alt: true }, false);
    			var img1_nodes = children(img1);

    			img1_nodes.forEach(detach);
    			a1_nodes.forEach(detach);
    			t8 = claim_text(div4_nodes, "\r\n      ");

    			a2 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a2_nodes = children(a2);

    			t9 = claim_text(a2_nodes, "/gd/\r\n        ");

    			img2 = claim_element(a2_nodes, "IMG", { src: true, alt: true }, false);
    			var img2_nodes = children(img2);

    			img2_nodes.forEach(detach);
    			a2_nodes.forEach(detach);
    			t10 = claim_text(div4_nodes, "\r\n      ");

    			a3 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a3_nodes = children(a3);

    			t11 = claim_text(a3_nodes, "Asana");
    			a3_nodes.forEach(detach);
    			t12 = claim_text(div4_nodes, "\r\n      ");

    			h20 = claim_element(div4_nodes, "H2", {}, false);
    			var h20_nodes = children(h20);

    			t13 = claim_text(h20_nodes, "Sites de Imagens");
    			h20_nodes.forEach(detach);
    			t14 = claim_text(div4_nodes, "\r\n      ");

    			a4 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a4_nodes = children(a4);

    			t15 = claim_text(a4_nodes, "PXHere");
    			a4_nodes.forEach(detach);
    			t16 = claim_text(div4_nodes, "\r\n      ");

    			a5 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a5_nodes = children(a5);

    			t17 = claim_text(a5_nodes, "Pexels");
    			a5_nodes.forEach(detach);
    			t18 = claim_text(div4_nodes, "\r\n      ");

    			h21 = claim_element(div4_nodes, "H2", { class: true }, false);
    			var h21_nodes = children(h21);

    			t19 = claim_text(h21_nodes, "CSS");
    			h21_nodes.forEach(detach);
    			t20 = claim_text(div4_nodes, "\r\n      ");

    			a6 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a6_nodes = children(a6);

    			t21 = claim_text(a6_nodes, "Animista - presets de animações");
    			a6_nodes.forEach(detach);
    			t22 = claim_text(div4_nodes, "\r\n      ");

    			a7 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a7_nodes = children(a7);

    			t23 = claim_text(a7_nodes, "Loading.io");
    			a7_nodes.forEach(detach);
    			t24 = claim_text(div4_nodes, "\r\n      ");

    			a8 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a8_nodes = children(a8);

    			t25 = claim_text(a8_nodes, "Coolors - cores, paletas");
    			a8_nodes.forEach(detach);
    			t26 = claim_text(div4_nodes, "\r\n      ");

    			a9 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a9_nodes = children(a9);

    			t27 = claim_text(a9_nodes, "Clippy - SVG formas geometricas");
    			a9_nodes.forEach(detach);
    			t28 = claim_text(div4_nodes, "\r\n      ");

    			a10 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a10_nodes = children(a10);

    			t29 = claim_text(a10_nodes, "SVG Backgrounds");
    			a10_nodes.forEach(detach);
    			t30 = claim_text(div4_nodes, "\r\n      ");

    			a11 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a11_nodes = children(a11);

    			t31 = claim_text(a11_nodes, "Triangulos backgrounds");
    			a11_nodes.forEach(detach);
    			t32 = claim_text(div4_nodes, "\r\n      ");

    			a12 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a12_nodes = children(a12);

    			t33 = claim_text(a12_nodes, "Keyframes.app");
    			a12_nodes.forEach(detach);
    			t34 = claim_text(div4_nodes, "\r\n      ");

    			h22 = claim_element(div4_nodes, "H2", {}, false);
    			var h22_nodes = children(h22);

    			t35 = claim_text(h22_nodes, "Inspiração");
    			h22_nodes.forEach(detach);
    			t36 = claim_text(div4_nodes, "\r\n      ");

    			a13 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a13_nodes = children(a13);

    			t37 = claim_text(a13_nodes, "Evernote Design");
    			a13_nodes.forEach(detach);
    			t38 = claim_text(div4_nodes, "\r\n      ");

    			a14 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a14_nodes = children(a14);

    			t39 = claim_text(a14_nodes, "Webframe");
    			a14_nodes.forEach(detach);
    			t40 = claim_text(div4_nodes, "\r\n      ");

    			a15 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a15_nodes = children(a15);

    			t41 = claim_text(a15_nodes, "Dribble");
    			a15_nodes.forEach(detach);
    			t42 = claim_text(div4_nodes, "\r\n      ");

    			a16 = claim_element(div4_nodes, "A", { href: true }, false);
    			var a16_nodes = children(a16);

    			t43 = claim_text(a16_nodes, "Dribble 2");
    			a16_nodes.forEach(detach);
    			div4_nodes.forEach(detach);
    			t44 = claim_text(div10_nodes, "\r\n    ");

    			div9 = claim_element(div10_nodes, "DIV", { class: true }, false);
    			var div9_nodes = children(div9);

    			h11 = claim_element(div9_nodes, "H1", {}, false);
    			var h11_nodes = children(h11);

    			t45 = claim_text(h11_nodes, "Work");
    			h11_nodes.forEach(detach);
    			t46 = claim_text(div9_nodes, "\r\n      ");

    			h23 = claim_element(div9_nodes, "H2", { class: true }, false);
    			var h23_nodes = children(h23);

    			t47 = claim_text(h23_nodes, "Servidores");
    			h23_nodes.forEach(detach);
    			t48 = claim_text(div9_nodes, "\r\n      ");

    			h30 = claim_element(div9_nodes, "H3", {}, false);
    			var h30_nodes = children(h30);

    			t49 = claim_text(h30_nodes, "Contabo  \r\n        ");

    			b0 = claim_element(h30_nodes, "B", {}, false);
    			var b0_nodes = children(b0);

    			t50 = claim_text(b0_nodes, "6");
    			b0_nodes.forEach(detach);
    			h30_nodes.forEach(detach);
    			t51 = claim_text(div9_nodes, "\r\n      ");

    			div5 = claim_element(div9_nodes, "DIV", { class: true }, false);
    			var div5_nodes = children(div5);

    			a17 = claim_element(div5_nodes, "A", { href: true }, false);
    			var a17_nodes = children(a17);

    			t52 = claim_text(a17_nodes, "Rancher");
    			a17_nodes.forEach(detach);
    			t53 = claim_text(div5_nodes, "\r\n        ");

    			a18 = claim_element(div5_nodes, "A", { href: true }, false);
    			var a18_nodes = children(a18);

    			t54 = claim_text(a18_nodes, "PMA");
    			a18_nodes.forEach(detach);
    			div5_nodes.forEach(detach);
    			t55 = claim_text(div9_nodes, "\r\n      ");

    			h31 = claim_element(div9_nodes, "H3", {}, false);
    			var h31_nodes = children(h31);

    			t56 = claim_text(h31_nodes, "Contabo  \r\n        ");

    			b1 = claim_element(h31_nodes, "B", {}, false);
    			var b1_nodes = children(b1);

    			t57 = claim_text(b1_nodes, "8");
    			b1_nodes.forEach(detach);
    			h31_nodes.forEach(detach);
    			t58 = claim_text(div9_nodes, "\r\n      ");

    			div6 = claim_element(div9_nodes, "DIV", { class: true }, false);
    			var div6_nodes = children(div6);

    			a19 = claim_element(div6_nodes, "A", { href: true }, false);
    			var a19_nodes = children(a19);

    			t59 = claim_text(a19_nodes, "Rancher");
    			a19_nodes.forEach(detach);
    			t60 = claim_text(div6_nodes, "\r\n        ");

    			a20 = claim_element(div6_nodes, "A", { href: true }, false);
    			var a20_nodes = children(a20);

    			t61 = claim_text(a20_nodes, "PMA");
    			a20_nodes.forEach(detach);
    			div6_nodes.forEach(detach);
    			t62 = claim_text(div9_nodes, "\r\n      ");

    			h32 = claim_element(div9_nodes, "H3", {}, false);
    			var h32_nodes = children(h32);

    			t63 = claim_text(h32_nodes, "Hetzner  \r\n        ");

    			b2 = claim_element(h32_nodes, "B", {}, false);
    			var b2_nodes = children(b2);

    			b2_nodes.forEach(detach);
    			h32_nodes.forEach(detach);
    			t64 = claim_text(div9_nodes, "\r\n      ");

    			div7 = claim_element(div9_nodes, "DIV", { class: true }, false);
    			var div7_nodes = children(div7);

    			a21 = claim_element(div7_nodes, "A", { href: true }, false);
    			var a21_nodes = children(a21);

    			t65 = claim_text(a21_nodes, "Rancher");
    			a21_nodes.forEach(detach);
    			t66 = claim_text(div7_nodes, "\r\n        ");

    			a22 = claim_element(div7_nodes, "A", { href: true }, false);
    			var a22_nodes = children(a22);

    			t67 = claim_text(a22_nodes, "PMA");
    			a22_nodes.forEach(detach);
    			div7_nodes.forEach(detach);
    			t68 = claim_text(div9_nodes, "\r\n      ");

    			h33 = claim_element(div9_nodes, "H3", {}, false);
    			var h33_nodes = children(h33);

    			t69 = claim_text(h33_nodes, "Hetzner  2\r\n        ");

    			b3 = claim_element(h33_nodes, "B", {}, false);
    			var b3_nodes = children(b3);

    			b3_nodes.forEach(detach);
    			h33_nodes.forEach(detach);
    			t70 = claim_text(div9_nodes, "\r\n      ");

    			div8 = claim_element(div9_nodes, "DIV", { class: true }, false);
    			var div8_nodes = children(div8);

    			a23 = claim_element(div8_nodes, "A", { href: true }, false);
    			var a23_nodes = children(a23);

    			t71 = claim_text(a23_nodes, "Rancher");
    			a23_nodes.forEach(detach);
    			t72 = claim_text(div8_nodes, "\r\n        ");

    			a24 = claim_element(div8_nodes, "A", { href: true }, false);
    			var a24_nodes = children(a24);

    			t73 = claim_text(a24_nodes, "PMA");
    			a24_nodes.forEach(detach);
    			div8_nodes.forEach(detach);
    			t74 = claim_text(div9_nodes, "\r\n\r\n      ");

    			h24 = claim_element(div9_nodes, "H2", { class: true }, false);
    			var h24_nodes = children(h24);

    			t75 = claim_text(h24_nodes, "Github");
    			h24_nodes.forEach(detach);
    			t76 = claim_text(div9_nodes, "\r\n      ");

    			a25 = claim_element(div9_nodes, "A", { href: true }, false);
    			var a25_nodes = children(a25);

    			t77 = claim_text(a25_nodes, "Github relato");
    			a25_nodes.forEach(detach);
    			t78 = claim_text(div9_nodes, "\r\n      ");

    			h25 = claim_element(div9_nodes, "H2", { class: true }, false);
    			var h25_nodes = children(h25);

    			t79 = claim_text(h25_nodes, "Mautic");
    			h25_nodes.forEach(detach);
    			t80 = claim_text(div9_nodes, "\r\n      ");

    			a26 = claim_element(div9_nodes, "A", { href: true }, false);
    			var a26_nodes = children(a26);

    			t81 = claim_text(a26_nodes, "Guia Powertic");
    			a26_nodes.forEach(detach);
    			t82 = claim_text(div9_nodes, "\r\n      ");

    			a27 = claim_element(div9_nodes, "A", { href: true }, false);
    			var a27_nodes = children(a27);

    			t83 = claim_text(a27_nodes, "Luizeof");
    			a27_nodes.forEach(detach);
    			div9_nodes.forEach(detach);
    			div10_nodes.forEach(detach);
    			t84 = claim_text(div17_nodes, "\r\n  ");

    			div16 = claim_element(div17_nodes, "DIV", { class: true }, false);
    			var div16_nodes = children(div16);

    			div11 = claim_element(div16_nodes, "DIV", { style: true }, false);
    			var div11_nodes = children(div11);

    			t85 = claim_text(div11_nodes, "424964");
    			div11_nodes.forEach(detach);
    			t86 = claim_text(div16_nodes, "\r\n    ");

    			div12 = claim_element(div16_nodes, "DIV", { style: true }, false);
    			var div12_nodes = children(div12);

    			t87 = claim_text(div12_nodes, "1A1423");
    			div12_nodes.forEach(detach);
    			t88 = claim_text(div16_nodes, "\r\n    ");

    			div13 = claim_element(div16_nodes, "DIV", { style: true }, false);
    			var div13_nodes = children(div13);

    			t89 = claim_text(div13_nodes, "E26D5A");
    			div13_nodes.forEach(detach);
    			t90 = claim_text(div16_nodes, "\r\n    ");

    			div14 = claim_element(div16_nodes, "DIV", { style: true }, false);
    			var div14_nodes = children(div14);

    			t91 = claim_text(div14_nodes, "FFC857");
    			div14_nodes.forEach(detach);
    			t92 = claim_text(div16_nodes, "\r\n    ");

    			div15 = claim_element(div16_nodes, "DIV", { style: true }, false);
    			var div15_nodes = children(div15);

    			t93 = claim_text(div15_nodes, "1F2041");
    			div15_nodes.forEach(detach);
    			div16_nodes.forEach(detach);
    			div17_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			add_location(div0, file$2, 75, 4, 2039);
    			div1.className = "sidebar esquerda";
    			add_location(div1, file$2, 74, 2, 2003);
    			div2.className = "nested";
    			add_location(div2, file$2, 94, 12, 2458);
    			div3.className = "colunas nested";
    			add_location(div3, file$2, 82, 4, 2165);
    			add_location(h10, file$2, 111, 6, 2985);
    			img0.src = "images/icons/4chan.png";
    			img0.alt = "";
    			add_location(img0, file$2, 114, 8, 3072);
    			a0.href = "https://boards.4chan.org/pol/";
    			add_location(a0, file$2, 112, 6, 3007);
    			img1.src = "images/icons/4chan.png";
    			img1.alt = "";
    			add_location(img1, file$2, 118, 8, 3197);
    			a1.href = "https://boards.4chan.org/wg/";
    			add_location(a1, file$2, 116, 6, 3134);
    			img2.src = "images/icons/4chan.png";
    			img2.alt = "";
    			add_location(img2, file$2, 122, 8, 3323);
    			a2.href = "https://boards.4chan.org/gd/";
    			add_location(a2, file$2, 120, 6, 3260);
    			a3.href = "https://app.asana.com/";
    			add_location(a3, file$2, 124, 6, 3386);
    			add_location(h20, file$2, 125, 6, 3436);
    			a4.href = "https://pxhere.com/pt/";
    			add_location(a4, file$2, 126, 6, 3469);
    			a5.href = "https://www.pexels.com/";
    			add_location(a5, file$2, 127, 6, 3520);
    			h21.className = "tracking-in-contract";
    			add_location(h21, file$2, 128, 6, 3572);
    			a6.href = "http://animista.net/play/background/ken-burns/kenburns-bottom-left";
    			add_location(a6, file$2, 129, 6, 3621);
    			a7.href = "https://loading.io/";
    			add_location(a7, file$2, 133, 6, 3768);
    			a8.href = "https://coolors.co/424964-1a1423-e26d5a-ffc857-1f2041";
    			add_location(a8, file$2, 134, 6, 3820);
    			a9.href = "https://bennettfeely.com/clippy/";
    			add_location(a9, file$2, 137, 6, 3938);
    			a10.href = "https://www.svgbackgrounds.com/";
    			add_location(a10, file$2, 140, 6, 4042);
    			a11.href = "http://alssndro.github.io/trianglify-background-generator/";
    			add_location(a11, file$2, 141, 6, 4111);
    			a12.href = "https://keyframes.app/editor/";
    			add_location(a12, file$2, 144, 6, 4232);
    			add_location(h22, file$2, 145, 6, 4297);
    			a13.href = "https://www.evernote.design/";
    			add_location(a13, file$2, 146, 6, 4324);
    			a14.href = "https://webframe.xyz/";
    			add_location(a14, file$2, 147, 6, 4390);
    			a15.href = "https://dribbble.com/fantasy";
    			add_location(a15, file$2, 148, 6, 4442);
    			a16.href = "https://dribbble.com/fantasy";
    			add_location(a16, file$2, 149, 6, 4500);
    			div4.className = "colunas";
    			add_location(div4, file$2, 110, 4, 2956);
    			add_location(h11, file$2, 152, 6, 4599);
    			h23.className = "tracking-in-contract";
    			add_location(h23, file$2, 153, 6, 4620);
    			add_location(b0, file$2, 156, 8, 4709);
    			add_location(h30, file$2, 154, 6, 4676);
    			a17.href = "http://contabo6.oncloud.net.br:10001/env/1a5/apps/stacks";
    			add_location(a17, file$2, 159, 8, 4768);
    			a18.href = "http://phpmyadmin6.3lados.com.br/";
    			add_location(a18, file$2, 162, 8, 4878);
    			div5.className = "nested";
    			add_location(div5, file$2, 158, 6, 4738);
    			add_location(b1, file$2, 166, 8, 4984);
    			add_location(h31, file$2, 164, 6, 4951);
    			a19.href = "http://contabo8.3lados.com.br:10001/";
    			add_location(a19, file$2, 169, 8, 5043);
    			a20.href = "http://phpmyadmin8.3lados.com.br/";
    			add_location(a20, file$2, 170, 8, 5111);
    			div6.className = "nested";
    			add_location(div6, file$2, 168, 6, 5013);
    			add_location(b2, file$2, 174, 8, 5217);
    			add_location(h32, file$2, 172, 6, 5184);
    			a21.href = "http://116.203.114.19:10001";
    			add_location(a21, file$2, 177, 8, 5273);
    			a22.href = "http://phpmyadminhetzner.3lados.com.br";
    			add_location(a22, file$2, 178, 8, 5332);
    			div7.className = "nested";
    			add_location(div7, file$2, 176, 6, 5243);
    			add_location(b3, file$2, 182, 8, 5444);
    			add_location(h33, file$2, 180, 6, 5410);
    			a23.href = "http://hetzner2.3lados.com.br:10001/";
    			add_location(a23, file$2, 185, 8, 5500);
    			a24.href = "http://pmahetzner2.3lados.com.br/";
    			add_location(a24, file$2, 186, 8, 5568);
    			div8.className = "nested";
    			add_location(div8, file$2, 184, 6, 5470);
    			h24.className = "tracking-in-contract";
    			add_location(h24, file$2, 189, 6, 5643);
    			a25.href = "https://github.com/RELATO";
    			add_location(a25, file$2, 190, 6, 5695);
    			h25.className = "tracking-in-contract";
    			add_location(h25, file$2, 191, 6, 5756);
    			a26.href = "https://powertic.com/pt-br/guia-para-iniciantes-em-mautic/";
    			add_location(a26, file$2, 192, 6, 5808);
    			a27.href = "https://luizeof.com.br/";
    			add_location(a27, file$2, 195, 6, 5920);
    			div9.className = "colunas";
    			add_location(div9, file$2, 151, 4, 4570);
    			div10.className = "centro";
    			add_location(div10, file$2, 80, 2, 2137);
    			set_style(div11, "background-color", "#424964");
    			add_location(div11, file$2, 199, 4, 6026);
    			set_style(div12, "background-color", "#1A1423");
    			add_location(div12, file$2, 200, 4, 6083);
    			set_style(div13, "background-color", "#E26D5A");
    			add_location(div13, file$2, 201, 4, 6140);
    			set_style(div14, "background-color", "#FFC857");
    			add_location(div14, file$2, 202, 4, 6197);
    			set_style(div15, "background-color", "#1F2041");
    			add_location(div15, file$2, 203, 4, 6254);
    			div16.className = "sidebar direita";
    			add_location(div16, file$2, 198, 2, 5991);
    			div17.className = "main";
    			add_location(div17, file$2, 73, 0, 1981);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div17, anchor);
    			append(div17, div1);
    			append(div1, div0);
    			append(div17, t0);
    			append(div17, div10);
    			append(div10, div3);
    			mount_component(editor, div3, null);
    			append(div3, t1);
    			append(div3, div2);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append(div10, t2);
    			append(div10, div4);
    			append(div4, h10);
    			append(h10, t3);
    			append(div4, t4);
    			append(div4, a0);
    			append(a0, t5);
    			append(a0, img0);
    			append(div4, t6);
    			append(div4, a1);
    			append(a1, t7);
    			append(a1, img1);
    			append(div4, t8);
    			append(div4, a2);
    			append(a2, t9);
    			append(a2, img2);
    			append(div4, t10);
    			append(div4, a3);
    			append(a3, t11);
    			append(div4, t12);
    			append(div4, h20);
    			append(h20, t13);
    			append(div4, t14);
    			append(div4, a4);
    			append(a4, t15);
    			append(div4, t16);
    			append(div4, a5);
    			append(a5, t17);
    			append(div4, t18);
    			append(div4, h21);
    			append(h21, t19);
    			append(div4, t20);
    			append(div4, a6);
    			append(a6, t21);
    			append(div4, t22);
    			append(div4, a7);
    			append(a7, t23);
    			append(div4, t24);
    			append(div4, a8);
    			append(a8, t25);
    			append(div4, t26);
    			append(div4, a9);
    			append(a9, t27);
    			append(div4, t28);
    			append(div4, a10);
    			append(a10, t29);
    			append(div4, t30);
    			append(div4, a11);
    			append(a11, t31);
    			append(div4, t32);
    			append(div4, a12);
    			append(a12, t33);
    			append(div4, t34);
    			append(div4, h22);
    			append(h22, t35);
    			append(div4, t36);
    			append(div4, a13);
    			append(a13, t37);
    			append(div4, t38);
    			append(div4, a14);
    			append(a14, t39);
    			append(div4, t40);
    			append(div4, a15);
    			append(a15, t41);
    			append(div4, t42);
    			append(div4, a16);
    			append(a16, t43);
    			append(div10, t44);
    			append(div10, div9);
    			append(div9, h11);
    			append(h11, t45);
    			append(div9, t46);
    			append(div9, h23);
    			append(h23, t47);
    			append(div9, t48);
    			append(div9, h30);
    			append(h30, t49);
    			append(h30, b0);
    			append(b0, t50);
    			append(div9, t51);
    			append(div9, div5);
    			append(div5, a17);
    			append(a17, t52);
    			append(div5, t53);
    			append(div5, a18);
    			append(a18, t54);
    			append(div9, t55);
    			append(div9, h31);
    			append(h31, t56);
    			append(h31, b1);
    			append(b1, t57);
    			append(div9, t58);
    			append(div9, div6);
    			append(div6, a19);
    			append(a19, t59);
    			append(div6, t60);
    			append(div6, a20);
    			append(a20, t61);
    			append(div9, t62);
    			append(div9, h32);
    			append(h32, t63);
    			append(h32, b2);
    			append(div9, t64);
    			append(div9, div7);
    			append(div7, a21);
    			append(a21, t65);
    			append(div7, t66);
    			append(div7, a22);
    			append(a22, t67);
    			append(div9, t68);
    			append(div9, h33);
    			append(h33, t69);
    			append(h33, b3);
    			append(div9, t70);
    			append(div9, div8);
    			append(div8, a23);
    			append(a23, t71);
    			append(div8, t72);
    			append(div8, a24);
    			append(a24, t73);
    			append(div9, t74);
    			append(div9, h24);
    			append(h24, t75);
    			append(div9, t76);
    			append(div9, a25);
    			append(a25, t77);
    			append(div9, t78);
    			append(div9, h25);
    			append(h25, t79);
    			append(div9, t80);
    			append(div9, a26);
    			append(a26, t81);
    			append(div9, t82);
    			append(div9, a27);
    			append(a27, t83);
    			append(div17, t84);
    			append(div17, div16);
    			append(div16, div11);
    			append(div11, t85);
    			append(div16, t86);
    			append(div16, div12);
    			append(div12, t87);
    			append(div16, t88);
    			append(div16, div13);
    			append(div13, t89);
    			append(div16, t90);
    			append(div16, div14);
    			append(div14, t91);
    			append(div16, t92);
    			append(div16, div15);
    			append(div15, t93);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var editor_changes = {};
    			if (changed.itemsTab1) editor_changes.itemsTab1 = ctx.itemsTab1;
    			if (changed.selecionado) editor_changes.selecionado = ctx.selecionado;
    			if (changed.nome) editor_changes.nome = ctx.nome;
    			if (changed.link) editor_changes.link = ctx.link;
    			if (changed.imagem) editor_changes.imagem = ctx.imagem;
    			if (changed.id) editor_changes.id = ctx.id;
    			editor.$set(editor_changes);

    			if (changed.itemsTab1) {
    				each_value = ctx.itemsTab1;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			editor.$$.fragment.i(local);

    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			editor.$$.fragment.o(local);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div17);
    			}

    			editor.$destroy();

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {

      let link = "url";
      let imagem = "images/icons/youtube.svg";
      let nome = "Nome";
      let id = 0;

      let itemsTab1 = [
        {
          id: id++,
          nome: "Youtube",
          link: "https://youtube.com",
          img: "images/icons/youtube.svg",
          selected: false
        },
        {
          id: id++,
          nome: "Gmail",
          link: "https://gmail.com",
          img: "images/icons/gmail.svg",
          selected: false
        },
        {
          id: id++,
          nome: "Cloudflare",
          link: "https://www.cloudflare.com/",
          img: "images/icons/cloudflare.svg",
          selected: false
        },
        {
          id: id++,
          nome: "Google News",
          link: "https://news.google.com/foryou",
          img:
            "https://lh3.googleusercontent.com/-DR60l-K8vnyi99NZovm9HlXyZwQ85GMDxiwJWzoasZYCUrPuUM_P_4Rb7ei03j-0nRs0c4F=w128",
          selected: false
        }
      ];

      function remove(e) {
        $$invalidate('itemsTab1', itemsTab1 = itemsTab1.filter(t => { const $$result = !t.selected; $$invalidate('id', id), $$invalidate('itemsTab1', itemsTab1); return $$result; }));
        $$invalidate('itemsTab1', itemsTab1 = [...itemsTab1]);
        console.log("asd " + e);
      }
      const salvar = e => {
        const novoItem = e.detail;
        $$invalidate('itemsTab1', itemsTab1 = [...itemsTab1, novoItem]);
      };
      const editar = e => {
        const editarItem = e.detail;
        console.log(editarItem);
        itemsTab1[editarItem.id] = editarItem; $$invalidate('itemsTab1', itemsTab1);
      };

      let selecionado = false;

    	function input_change_handler({ item, each_value, item_index }) {
    		each_value[item_index].selected = this.checked;
    		$$invalidate('itemsTab1', itemsTab1);
    	}

    	$$self.$$.update = ($$dirty = { itemsTab1: 1 }) => {
    		if ($$dirty.itemsTab1) { $$invalidate('selecionado', selecionado = itemsTab1.filter(t => t.selected).length); }
    		if ($$dirty.itemsTab1) { if (itemsTab1.filter(t => t.selected).length) {
            $$invalidate('link', link = itemsTab1.filter(t => t.selected)[0].link);
            $$invalidate('imagem', imagem = itemsTab1.filter(t => t.selected)[0].img);
            $$invalidate('nome', nome = itemsTab1.filter(t => t.selected)[0].nome);
            $$invalidate('id', id = itemsTab1.filter(t => t.selected)[0].id);
          } }
    	};

    	return {
    		link,
    		imagem,
    		nome,
    		id,
    		itemsTab1,
    		remove,
    		salvar,
    		editar,
    		selecionado,
    		input_change_handler
    	};
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* src\Sites.svelte generated by Svelte v3.5.1 */

    const file$3 = "src\\Sites.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.site = list[i];
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.server = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.server = list[i];
    	return child_ctx;
    }

    // (161:24) {#each servidores as server}
    function create_each_block_2(ctx) {
    	var option, t_value = ctx.server.name, t, option_value_value;

    	return {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			this.h();
    		},

    		l: function claim(nodes) {
    			option = claim_element(nodes, "OPTION", { value: true }, false);
    			var option_nodes = children(option);

    			t = claim_text(option_nodes, t_value);
    			option_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			option.__value = option_value_value = ctx.server.id;
    			option.value = option.__value;
    			add_location(option, file$3, 161, 24, 5210);
    		},

    		m: function mount(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.servidores) && t_value !== (t_value = ctx.server.name)) {
    				set_data(t, t_value);
    			}

    			if ((changed.servidores) && option_value_value !== (option_value_value = ctx.server.id)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (180:14) {#if site.servidores == server.id}
    function create_if_block$2(ctx) {
    	var div, a0, t0_value = ctx.site.title.rendered, t0, t1, t2_value = ctx.server.name, t2, t3, a1, t4, a1_name_value, div_transition, current, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    			t3 = space();
    			a1 = element("a");
    			t4 = text("x");
    			this.h();
    		},

    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true }, false);
    			var div_nodes = children(div);

    			a0 = claim_element(div_nodes, "A", { href: true, class: true }, false);
    			var a0_nodes = children(a0);

    			t0 = claim_text(a0_nodes, t0_value);
    			t1 = claim_text(a0_nodes, " / ");
    			t2 = claim_text(a0_nodes, t2_value);
    			a0_nodes.forEach(detach);
    			t3 = claim_text(div_nodes, "\r\n                  ");

    			a1 = claim_element(div_nodes, "A", { href: true, name: true, class: true }, false);
    			var a1_nodes = children(a1);

    			t4 = claim_text(a1_nodes, "x");
    			a1_nodes.forEach(detach);
    			div_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			a0.href = "#";
    			a0.className = "svelte-11atozw";
    			add_location(a0, file$3, 181, 18, 5935);
    			a1.href = "#";
    			attr(a1, "name", a1_name_value = ctx.site.id);
    			a1.className = "svelte-11atozw";
    			add_location(a1, file$3, 182, 18, 6009);
    			div.className = "listasites svelte-11atozw";
    			add_location(div, file$3, 180, 16, 5874);
    			dispose = listen(a1, "click", removeSite);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a0);
    			append(a0, t0);
    			append(a0, t1);
    			append(a0, t2);
    			append(div, t3);
    			append(div, a1);
    			append(a1, t4);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.sites3lados) && t0_value !== (t0_value = ctx.site.title.rendered)) {
    				set_data(t0, t0_value);
    			}

    			if ((!current || changed.servidores) && t2_value !== (t2_value = ctx.server.name)) {
    				set_data(t2, t2_value);
    			}

    			if ((!current || changed.sites3lados) && a1_name_value !== (a1_name_value = ctx.site.id)) {
    				attr(a1, "name", a1_name_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_transition) div_transition.end();
    			}

    			dispose();
    		}
    	};
    }

    // (179:12) {#each sites3lados as site}
    function create_each_block_1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.site.servidores == ctx.server.id) && create_if_block$2(ctx);

    	return {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.site.servidores == ctx.server.id) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					if_block.i(1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    // (176:8) {#each servidores as server}
    function create_each_block$1(ctx) {
    	var div, h2, t0_value = ctx.server.name, t0, t1, t2, current;

    	var each_value_1 = ctx.sites3lados;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			this.h();
    		},

    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { class: true }, false);
    			var div_nodes = children(div);

    			h2 = claim_element(div_nodes, "H2", {}, false);
    			var h2_nodes = children(h2);

    			t0 = claim_text(h2_nodes, t0_value);
    			h2_nodes.forEach(detach);
    			t1 = claim_text(div_nodes, "\r\n            ");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div_nodes);
    			}

    			t2 = claim_text(div_nodes, "\r\n          ");
    			div_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			add_location(h2, file$3, 177, 12, 5743);
    			div.className = "servers svelte-11atozw";
    			add_location(div, file$3, 176, 10, 5708);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(div, t1);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.servidores) && t0_value !== (t0_value = ctx.server.name)) {
    				set_data(t0, t0_value);
    			}

    			if (changed.sites3lados || changed.servidores || changed.removeSite) {
    				each_value_1 = ctx.sites3lados;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div, t2);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value_1.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var div7, div1, div0, t0, div6, div5, h1, t1, t2, h2, t3, t4, div3, div2, label0, t5, input0, t6, label1, t7, input1, t8, label2, t9, select, option, t10, button, t11, t12, div4, current, dispose;

    	var each_value_2 = ctx.servidores;

    	var each_blocks_1 = [];

    	for (var i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	var each_value = ctx.servidores;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks[i].d(detaching);
    					each_blocks[i] = null;
    				});
    			}

    			each_blocks[i].o(local);
    		}
    	}

    	return {
    		c: function create() {
    			div7 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h1 = element("h1");
    			t1 = text("Sites");
    			t2 = space();
    			h2 = element("h2");
    			t3 = text("Edição");
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			label0 = element("label");
    			t5 = text("Site\r\n                    ");
    			input0 = element("input");
    			t6 = space();
    			label1 = element("label");
    			t7 = text("URL\r\n                    ");
    			input1 = element("input");
    			t8 = space();
    			label2 = element("label");
    			t9 = text("Servidor\r\n                    ");
    			select = element("select");
    			option = element("option");

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t10 = space();
    			button = element("button");
    			t11 = text("Adicionar");
    			t12 = space();
    			div4 = element("div");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			this.h();
    		},

    		l: function claim(nodes) {
    			div7 = claim_element(nodes, "DIV", { class: true }, false);
    			var div7_nodes = children(div7);

    			div1 = claim_element(div7_nodes, "DIV", { class: true }, false);
    			var div1_nodes = children(div1);

    			div0 = claim_element(div1_nodes, "DIV", {}, false);
    			var div0_nodes = children(div0);

    			div0_nodes.forEach(detach);
    			div1_nodes.forEach(detach);
    			t0 = claim_text(div7_nodes, "\r\n\r\n  ");

    			div6 = claim_element(div7_nodes, "DIV", { class: true }, false);
    			var div6_nodes = children(div6);

    			div5 = claim_element(div6_nodes, "DIV", { class: true }, false);
    			var div5_nodes = children(div5);

    			h1 = claim_element(div5_nodes, "H1", {}, false);
    			var h1_nodes = children(h1);

    			t1 = claim_text(h1_nodes, "Sites");
    			h1_nodes.forEach(detach);
    			t2 = claim_text(div5_nodes, "\r\n      ");

    			h2 = claim_element(div5_nodes, "H2", {}, false);
    			var h2_nodes = children(h2);

    			t3 = claim_text(h2_nodes, "Edição");
    			h2_nodes.forEach(detach);
    			t4 = claim_text(div5_nodes, "\r\n      ");

    			div3 = claim_element(div5_nodes, "DIV", { class: true, style: true }, false);
    			var div3_nodes = children(div3);

    			div2 = claim_element(div3_nodes, "DIV", { class: true }, false);
    			var div2_nodes = children(div2);

    			label0 = claim_element(div2_nodes, "LABEL", { class: true }, false);
    			var label0_nodes = children(label0);

    			t5 = claim_text(label0_nodes, "Site\r\n                    ");

    			input0 = claim_element(label0_nodes, "INPUT", { class: true, type: true, placeholder: true }, false);
    			var input0_nodes = children(input0);

    			input0_nodes.forEach(detach);
    			label0_nodes.forEach(detach);
    			t6 = claim_text(div2_nodes, "\r\n                ");

    			label1 = claim_element(div2_nodes, "LABEL", { class: true }, false);
    			var label1_nodes = children(label1);

    			t7 = claim_text(label1_nodes, "URL\r\n                    ");

    			input1 = claim_element(label1_nodes, "INPUT", { class: true, type: true, placeholder: true }, false);
    			var input1_nodes = children(input1);

    			input1_nodes.forEach(detach);
    			label1_nodes.forEach(detach);
    			t8 = claim_text(div2_nodes, "\r\n                ");

    			label2 = claim_element(div2_nodes, "LABEL", { class: true }, false);
    			var label2_nodes = children(label2);

    			t9 = claim_text(label2_nodes, "Servidor\r\n                    ");

    			select = claim_element(label2_nodes, "SELECT", { class: true }, false);
    			var select_nodes = children(select);

    			option = claim_element(select_nodes, "OPTION", { value: true }, false);
    			var option_nodes = children(option);

    			option_nodes.forEach(detach);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].l(select_nodes);
    			}

    			select_nodes.forEach(detach);
    			label2_nodes.forEach(detach);
    			div2_nodes.forEach(detach);
    			t10 = claim_text(div3_nodes, "\r\n            ");

    			button = claim_element(div3_nodes, "BUTTON", { class: true, style: true }, false);
    			var button_nodes = children(button);

    			t11 = claim_text(button_nodes, "Adicionar");
    			button_nodes.forEach(detach);
    			div3_nodes.forEach(detach);
    			t12 = claim_text(div5_nodes, "\r\n\r\n      \r\n      ");

    			div4 = claim_element(div5_nodes, "DIV", { class: true }, false);
    			var div4_nodes = children(div4);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div4_nodes);
    			}

    			div4_nodes.forEach(detach);
    			div5_nodes.forEach(detach);
    			div6_nodes.forEach(detach);
    			div7_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			add_location(div0, file$3, 129, 4, 4151);
    			div1.className = "sidebar esquerda";
    			add_location(div1, file$3, 128, 2, 4115);
    			add_location(h1, file$3, 137, 6, 4313);
    			add_location(h2, file$3, 138, 6, 4335);
    			input0.className = "uk-input";
    			attr(input0, "type", "text");
    			input0.placeholder = "Nome";
    			add_location(input0, file$3, 144, 20, 4547);
    			label0.className = "svelte-11atozw";
    			add_location(label0, file$3, 143, 16, 4514);
    			input1.className = "uk-input";
    			attr(input1, "type", "text");
    			input1.placeholder = "URL";
    			add_location(input1, file$3, 151, 20, 4786);
    			label1.className = "svelte-11atozw";
    			add_location(label1, file$3, 150, 16, 4754);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$3, 159, 24, 5111);
    			if (ctx.servselecionado === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			select.className = "uk-select";
    			add_location(select, file$3, 158, 20, 5030);
    			label2.className = "svelte-11atozw";
    			add_location(label2, file$3, 157, 16, 4993);
    			div2.className = "formsites svelte-11atozw";
    			add_location(div2, file$3, 142, 10, 4473);
    			button.className = "uk-button uk-button-default";
    			set_style(button, "margin", "10px");
    			add_location(button, file$3, 166, 12, 5382);
    			div3.className = "uk-card uk-card-primary uk-width-1-1@m uk-margin ";
    			set_style(div3, "padding", "30px");
    			add_location(div3, file$3, 139, 6, 4358);
    			div4.className = "sites svelte-11atozw";
    			add_location(div4, file$3, 174, 6, 5639);
    			div5.className = "colunas nested";
    			add_location(div5, file$3, 136, 4, 4277);
    			div6.className = "centro";
    			add_location(div6, file$3, 134, 2, 4249);
    			div7.className = "main";
    			add_location(div7, file$3, 127, 0, 4093);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(select, "change", ctx.select_change_handler),
    				listen(button, "click", ctx.addSite)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div7, anchor);
    			append(div7, div1);
    			append(div1, div0);
    			append(div7, t0);
    			append(div7, div6);
    			append(div6, div5);
    			append(div5, h1);
    			append(h1, t1);
    			append(div5, t2);
    			append(div5, h2);
    			append(h2, t3);
    			append(div5, t4);
    			append(div5, div3);
    			append(div3, div2);
    			append(div2, label0);
    			append(label0, t5);
    			append(label0, input0);

    			input0.value = ctx.nomesite;

    			append(div2, t6);
    			append(div2, label1);
    			append(label1, t7);
    			append(label1, input1);

    			input1.value = ctx.urlsite;

    			append(div2, t8);
    			append(div2, label2);
    			append(label2, t9);
    			append(label2, select);
    			append(select, option);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			select_option(select, ctx.servselecionado);

    			append(div3, t10);
    			append(div3, button);
    			append(button, t11);
    			append(div5, t12);
    			append(div5, div4);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.nomesite && (input0.value !== ctx.nomesite)) input0.value = ctx.nomesite;
    			if (changed.urlsite && (input1.value !== ctx.urlsite)) input1.value = ctx.urlsite;

    			if (changed.servidores) {
    				each_value_2 = ctx.servidores;

    				for (var i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_2.length;
    			}

    			if (changed.servselecionado) select_option(select, ctx.servselecionado);

    			if (changed.sites3lados || changed.servidores || changed.removeSite) {
    				each_value = ctx.servidores;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div4, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div7);
    			}

    			destroy_each(each_blocks_1, detaching);

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    }

    let URL = "teste.3lados.com.br";

    let tokenteste3lados =
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC90ZXN0ZS4zbGFkb3MuY29tLmJyIiwiaWF0IjoxNTYyMTc0MzY3LCJuYmYiOjE1NjIxNzQzNjcsImV4cCI6MTU2Mjc3OTE2NywiZGF0YSI6eyJ1c2VyIjp7ImlkIjoiMSJ9fX0.Po_qNYBF3BfuxvRU74hb1cOI02AMW-sIPBblG6aGx9E";

    let excerpt = "resumo";

    function removeSite(e) {
      let id = e.target.name;
      {
        var post = new XMLHttpRequest();
        post.open("DELETE", "http://" + URL + "/wp-json/wp/v2/sites/" + id);
        post.setRequestHeader("Authorization", "Bearer " + tokenteste3lados);
        post.send();
        post.onreadystatechange = function() {
          console.log(post);
          console.log(post.readyState);
          if (post.readyState == 4) {
            if (post.status == 200) {
              window.location = "/";
            } else {
              alert("Error - try again.");
            }
          }
        };
      }
    }

    function instance$5($$self, $$props, $$invalidate) {
    	
      
      let { url = "sites" } = $$props;

      let sites3lados = [];
      let servidores = [];
      let servselecionado = "";
      let nomesite = "";
      let urlsite = "";

      onMount(async () => {
        // const res = await fetch(`https://eurovinhos.ml/wc-api/v3/products/?per_page=20&consumer_key=ck_a232b308626bec11aae453b858b2ef36090c4b5f&consumer_secret=cs_18c14d587c2bd007f518fdb5e8c04283c7bb4956`);
        // products = await res.json();
        $$invalidate('sites3lados', sites3lados = await fetch(`http://` + URL + `/wp-json/wp/v2/sites`).then(
          r => r.json()
        ));
        $$invalidate('servidores', servidores = await fetch(
          `http://` + URL + `/wp-json/wp/v2/servidores`
        ).then(r => r.json()));
        // servidores = await fetch(
        //   `https://jsonplaceholder.typicode.com/photos?_limit=20`
        // ).then(r => r.json());
        console.log(servidores);
      });

      function addSite() {
        var ourPostData = {
          title: nomesite,
          content: urlsite,
          servidores: servselecionado,
          status: "publish",
          excerpt: excerpt
        };
        var createPost = new XMLHttpRequest();
        createPost.open("POST", "http://" + URL + "/wp-json/wp/v2/sites");
        createPost.setRequestHeader("Authorization", "Bearer " + tokenteste3lados);
        // createPost.setRequestHeader("X-WP-Nonce", nonce.nonce);
        createPost.setRequestHeader(
          "Content-Type",
          "application/json; charset=UTF-8"
        );
        // createPost.setRequestHeader("Accept", "*/*");
        // createPost.setRequestHeader("Access-Control-Allow-Headers", "*");
        // createPost.setRequestHeader("Access-Control-Allow-Origin", "*");
        // createPost.setRequestHeader("Cache-Control", "no-cache");
        // createPost.setRequestHeader("Origin", "http://localhost:5000/");
        createPost.send(JSON.stringify(ourPostData));
        createPost.onreadystatechange = function() {
          console.log(createPost);
          if (createPost.readyState == 4) {
            if (createPost.status == 201) {
              $$invalidate('nomesite', nomesite = "");
              $$invalidate('urlsite', urlsite = "");
              window.location = "/";
            } else {
              alert("Error - try again.");
            }
          }
        };
      }

    	const writable_props = ['url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Sites> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		nomesite = this.value;
    		$$invalidate('nomesite', nomesite);
    	}

    	function input1_input_handler() {
    		urlsite = this.value;
    		$$invalidate('urlsite', urlsite);
    	}

    	function select_change_handler() {
    		servselecionado = select_value(this);
    		$$invalidate('servselecionado', servselecionado);
    		$$invalidate('servidores', servidores);
    	}

    	$$self.$set = $$props => {
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	return {
    		url,
    		sites3lados,
    		servidores,
    		servselecionado,
    		nomesite,
    		urlsite,
    		addSite,
    		input0_input_handler,
    		input1_input_handler,
    		select_change_handler
    	};
    }

    class Sites extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["url"]);
    	}

    	get url() {
    		throw new Error("<Sites>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Sites>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.5.1 */

    const file$4 = "src\\App.svelte";

    // (33:4) <Link to="/">
    function create_default_slot_3(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Home");
    		},

    		l: function claim(nodes) {
    			t = claim_text(nodes, "Home");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (34:4) <Link to="sites" replace>
    function create_default_slot_2(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Sites");
    		},

    		l: function claim(nodes) {
    			t = claim_text(nodes, "Sites");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (37:4) <Route path="/">
    function create_default_slot_1(ctx) {
    	var current;

    	var home = new Home({ $$inline: true });

    	return {
    		c: function create() {
    			home.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			home.$$.fragment.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			home.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			home.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			home.$destroy(detaching);
    		}
    	};
    }

    // (31:0) <Router url="{url}">
    function create_default_slot(ctx) {
    	var nav, t0, t1, div, t2, current;

    	var link0 = new Link({
    		props: {
    		to: "/",
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var link1 = new Link({
    		props: {
    		to: "sites",
    		replace: true,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var route0 = new Route({
    		props: {
    		path: "/",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: { path: "sites", component: Sites },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			nav = element("nav");
    			link0.$$.fragment.c();
    			t0 = space();
    			link1.$$.fragment.c();
    			t1 = space();
    			div = element("div");
    			route0.$$.fragment.c();
    			t2 = space();
    			route1.$$.fragment.c();
    			this.h();
    		},

    		l: function claim(nodes) {
    			nav = claim_element(nodes, "NAV", {}, false);
    			var nav_nodes = children(nav);

    			link0.$$.fragment.l(nav_nodes);
    			t0 = claim_text(nav_nodes, "\n    ");
    			link1.$$.fragment.l(nav_nodes);
    			nav_nodes.forEach(detach);
    			t1 = claim_text(nodes, "\n  ");

    			div = claim_element(nodes, "DIV", {}, false);
    			var div_nodes = children(div);

    			route0.$$.fragment.l(div_nodes);
    			t2 = claim_text(div_nodes, "\n    ");
    			route1.$$.fragment.l(div_nodes);
    			div_nodes.forEach(detach);
    			this.h();
    		},

    		h: function hydrate() {
    			add_location(nav, file$4, 31, 2, 853);
    			add_location(div, file$4, 35, 2, 941);
    		},

    		m: function mount(target, anchor) {
    			insert(target, nav, anchor);
    			mount_component(link0, nav, null);
    			append(nav, t0);
    			mount_component(link1, nav, null);
    			insert(target, t1, anchor);
    			insert(target, div, anchor);
    			mount_component(route0, div, null);
    			append(div, t2);
    			mount_component(route1, div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var link0_changes = {};
    			if (changed.$$scope) link0_changes.$$scope = { changed, ctx };
    			link0.$set(link0_changes);

    			var link1_changes = {};
    			if (changed.$$scope) link1_changes.$$scope = { changed, ctx };
    			link1.$set(link1_changes);

    			var route0_changes = {};
    			if (changed.$$scope) route0_changes.$$scope = { changed, ctx };
    			route0.$set(route0_changes);

    			var route1_changes = {};
    			if (changed.Sites) route1_changes.component = Sites;
    			route1.$set(route1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			link0.$$.fragment.i(local);

    			link1.$$.fragment.i(local);

    			route0.$$.fragment.i(local);

    			route1.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			link0.$$.fragment.o(local);
    			link1.$$.fragment.o(local);
    			route0.$$.fragment.o(local);
    			route1.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(nav);
    			}

    			link0.$destroy();

    			link1.$destroy();

    			if (detaching) {
    				detach(t1);
    				detach(div);
    			}

    			route0.$destroy();

    			route1.$destroy();
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var current;

    	var router = new Router({
    		props: {
    		url: ctx.url,
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			router.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			router.$$.fragment.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.url) router_changes.url = ctx.url;
    			if (changed.$$scope) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			router.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			router.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			router.$destroy(detaching);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	
      // import NavLink from "./components/NavLink.svelte";
      // import { Home, About, Blog, BlogPost } from "./routes";
      let { url } = $$props;

    	const writable_props = ['url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	return { url };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["url"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.url === undefined && !('url' in props)) {
    			console.warn("<App> was created without expected prop 'url'");
    		}
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	hydrate: true,
    	props: {
    		// name: 'STARTPAGE'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
