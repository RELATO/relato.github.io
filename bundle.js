
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
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

    const file = "src\\Editor.svelte";

    // (41:0) {#if mostrar}
    function create_if_block(ctx) {
    	var div7, ul, li0, a0, t1, div1, div0, span0, t2, input0, t3, input1, t4, li1, a1, t6, div3, div2, span1, t7, input2, t8, li2, a2, t10, div5, div4, span2, t11, input3, t12, div6, button, t14, div7_transition, current, dispose;

    	var if_block = (ctx.selecionado) && create_if_block_1(ctx);

    	return {
    		c: function create() {
    			div7 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Nome";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "URL";
    			t6 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span1 = element("span");
    			t7 = space();
    			input2 = element("input");
    			t8 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Link";
    			t10 = space();
    			div5 = element("div");
    			div4 = element("div");
    			span2 = element("span");
    			t11 = space();
    			input3 = element("input");
    			t12 = space();
    			div6 = element("div");
    			button = element("button");
    			button.textContent = "Adicionar";
    			t14 = space();
    			if (if_block) if_block.c();
    			a0.className = "uk-accordion-title";
    			a0.href = "#";
    			add_location(a0, file, 45, 16, 1181);
    			span0.className = "uk-form-icon";
    			attr(span0, "uk-icon", "icon: comment");
    			add_location(span0, file, 48, 24, 1351);
    			input0.className = "uk-input uk-width-2-3";
    			attr(input0, "type", "text");
    			input0.placeholder = "nome";
    			add_location(input0, file, 49, 24, 1435);
    			input1.className = "uk-input uk-width-1-4";
    			attr(input1, "type", "text");
    			input1.placeholder = "";
    			input1.disabled = true;
    			add_location(input1, file, 50, 24, 1550);
    			div0.className = "uk-inline";
    			add_location(div0, file, 47, 20, 1302);
    			div1.className = "uk-accordion-content";
    			add_location(div1, file, 46, 16, 1246);
    			li0.className = "uk-open";
    			add_location(li0, file, 44, 12, 1143);
    			a1.className = "uk-accordion-title";
    			a1.href = "#";
    			add_location(a1, file, 55, 16, 1748);
    			span1.className = "uk-form-icon";
    			attr(span1, "uk-icon", "icon: link");
    			add_location(span1, file, 58, 24, 1917);
    			input2.className = "uk-input uk-width-1-1";
    			attr(input2, "type", "text");
    			input2.placeholder = "url do link";
    			add_location(input2, file, 59, 24, 1998);
    			div2.className = "uk-inline";
    			add_location(div2, file, 57, 20, 1868);
    			div3.className = "uk-accordion-content";
    			add_location(div3, file, 56, 16, 1812);
    			add_location(li1, file, 54, 12, 1726);
    			a2.className = "uk-accordion-title";
    			a2.href = "#";
    			add_location(a2, file, 64, 16, 2201);
    			span2.className = "uk-form-icon";
    			attr(span2, "uk-icon", "icon: link");
    			add_location(span2, file, 67, 24, 2371);
    			input3.className = "uk-input uk-width-1-1";
    			attr(input3, "type", "text");
    			input3.placeholder = "url da imagem";
    			add_location(input3, file, 68, 24, 2452);
    			div4.className = "uk-inline";
    			add_location(div4, file, 66, 20, 2322);
    			div5.className = "uk-accordion-content";
    			add_location(div5, file, 65, 16, 2266);
    			add_location(li2, file, 63, 12, 2179);
    			attr(ul, "uk-accordion", "");
    			ul.className = "svelte-33u3kr";
    			add_location(ul, file, 43, 8, 1112);
    			attr(button, "uk-icon", "icon: plus-circle");
    			button.className = "uk-button uk-button-body uk-width-1-3";
    			add_location(button, file, 75, 12, 2748);
    			div6.className = "uk-grid-small uk-child-width-expand@s uk-text-center uk-margin svelte-33u3kr";
    			attr(div6, "uk-grid", "");
    			add_location(div6, file, 74, 8, 2650);
    			div7.className = "uk-card uk-card-primary uk-padding svelte-33u3kr";
    			add_location(div7, file, 41, 4, 1034);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(input3, "input", ctx.input3_input_handler),
    				listen(button, "click", ctx.gravar)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div7, anchor);
    			append(div7, ul);
    			append(ul, li0);
    			append(li0, a0);
    			append(li0, t1);
    			append(li0, div1);
    			append(div1, div0);
    			append(div0, span0);
    			append(div0, t2);
    			append(div0, input0);

    			input0.value = ctx.nome;

    			append(div0, t3);
    			append(div0, input1);

    			input1.value = ctx.id;

    			append(ul, t4);
    			append(ul, li1);
    			append(li1, a1);
    			append(li1, t6);
    			append(li1, div3);
    			append(div3, div2);
    			append(div2, span1);
    			append(div2, t7);
    			append(div2, input2);

    			input2.value = ctx.link;

    			append(ul, t8);
    			append(ul, li2);
    			append(li2, a2);
    			append(li2, t10);
    			append(li2, div5);
    			append(div5, div4);
    			append(div4, span2);
    			append(div4, t11);
    			append(div4, input3);

    			input3.value = ctx.imagem;

    			append(div7, t12);
    			append(div7, div6);
    			append(div6, button);
    			append(div6, t14);
    			if (if_block) if_block.m(div6, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.nome && (input0.value !== ctx.nome)) input0.value = ctx.nome;
    			if (changed.id && (input1.value !== ctx.id)) input1.value = ctx.id;
    			if (changed.link && (input2.value !== ctx.link)) input2.value = ctx.link;
    			if (changed.imagem && (input3.value !== ctx.imagem)) input3.value = ctx.imagem;

    			if (ctx.selecionado) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div6, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!div7_transition) div7_transition = create_bidirectional_transition(div7, slide, {}, true);
    				div7_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!div7_transition) div7_transition = create_bidirectional_transition(div7, slide, {}, false);
    			div7_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div7);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				if (div7_transition) div7_transition.end();
    			}

    			run_all(dispose);
    		}
    	};
    }

    // (77:12) {#if selecionado}
    function create_if_block_1(ctx) {
    	var button0, t_1, button1, dispose;

    	return {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Editar";
    			t_1 = space();
    			button1 = element("button");
    			button1.textContent = "Remover";
    			attr(button0, "uk-icon", "icon: file-edit");
    			button0.className = "uk-button  uk-width-1-3";
    			set_style(button0, "background-color", "green");
    			add_location(button0, file, 77, 12, 2925);
    			attr(button1, "uk-icon", "icon: minus-circle");
    			button1.className = "uk-button uk-button-danger uk-width-1-3";
    			add_location(button1, file, 78, 12, 3072);

    			dispose = [
    				listen(button0, "click", ctx.editar),
    				listen(button1, "click", ctx.remover)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, button0, anchor);
    			insert(target, t_1, anchor);
    			insert(target, button1, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button0);
    				detach(t_1);
    				detach(button1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div, t, button, current, dispose;

    	var if_block = (ctx.mostrar) && create_if_block(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			button = element("button");
    			attr(button, "uk-icon", "icon: plus-circle");
    			button.className = "uk-button";
    			add_location(button, file, 84, 0, 3274);
    			div.className = "uk-scope svelte-33u3kr";
    			add_location(div, file, 39, 0, 991);
    			dispose = listen(button, "click", ctx.toggleMostrar);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
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
    					if_block = create_if_block(ctx);
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

    function instance($$self, $$props, $$invalidate) {
    	
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
    		id = this.value;
    		$$invalidate('id', id);
    	}

    	function input2_input_handler() {
    		link = this.value;
    		$$invalidate('link', link);
    	}

    	function input3_input_handler() {
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
    		input2_input_handler,
    		input3_input_handler
    	};
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["link", "imagem", "nome", "id", "selecionado", "itemsTab1"]);

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

    /* src\App.svelte generated by Svelte v3.5.1 */

    const file$1 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.server = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.site = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.each_value_2 = list;
    	child_ctx.item_index = i;
    	return child_ctx;
    }

    // (166:14) {#each itemsTab1 as item}
    function create_each_block_2(ctx) {
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
    			input.className = "uk-checkbox";
    			attr(input, "type", "checkbox");
    			add_location(input, file$1, 167, 18, 5331);
    			img.src = img_src_value = ctx.item.img;
    			img.alt = "";
    			add_location(img, file$1, 173, 20, 5558);
    			a.href = a_href_value = ctx.item.link;
    			add_location(a, file$1, 171, 18, 5484);
    			add_location(label, file$1, 166, 16, 5288);
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

    // (199:12) {#each sites3lados as site}
    function create_each_block_1(ctx) {
    	var label, a, t_value = ctx.site.title.rendered, t, label_transition, current;

    	return {
    		c: function create() {
    			label = element("label");
    			a = element("a");
    			t = text(t_value);
    			a.href = "#";
    			add_location(a, file$1, 200, 16, 6720);
    			add_location(label, file$1, 199, 14, 6679);
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, a);
    			append(a, t);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.sites3lados) && t_value !== (t_value = ctx.site.title.rendered)) {
    				set_data(t, t_value);
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
    		}
    	};
    }

    // (205:12) {#each servidores as server}
    function create_each_block(ctx) {
    	var label, img, img_src_value, img_alt_value, t0, a, t1_value = ctx.server.title, t1, label_transition, current;

    	return {
    		c: function create() {
    			label = element("label");
    			img = element("img");
    			t0 = space();
    			a = element("a");
    			t1 = text(t1_value);
    			img.src = img_src_value = ctx.server.thumbnailUrl;
    			img.alt = img_alt_value = ctx.server.title;
    			add_location(img, file$1, 206, 16, 6931);
    			a.href = "#";
    			add_location(a, file$1, 207, 16, 6998);
    			add_location(label, file$1, 205, 14, 6890);
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, img);
    			append(label, t0);
    			append(label, a);
    			append(a, t1);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.servidores) && img_src_value !== (img_src_value = ctx.server.thumbnailUrl)) {
    				img.src = img_src_value;
    			}

    			if ((!current || changed.servidores) && img_alt_value !== (img_alt_value = ctx.server.title)) {
    				img.alt = img_alt_value;
    			}

    			if ((!current || changed.servidores) && t1_value !== (t1_value = ctx.server.title)) {
    				set_data(t1, t1_value);
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
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var t0, div21, div1, div0, img0, t1, div14, div7, ul, li0, a0, t3, div3, div2, t4, li1, a1, t6, div6, h20, t8, fieldset, div4, input0, t9, input1, t10, div5, select, option0, option1, t13, button, t15, t16, h21, t18, t19, div8, h10, t21, a2, t22, img1, t23, a3, t24, img2, t25, a4, t26, img3, t27, a5, t29, h22, t31, a6, t33, a7, t35, h23, t37, a8, t39, a9, t41, a10, t43, a11, t45, a12, t47, a13, t49, a14, t51, h24, t53, a15, t55, a16, t57, a17, t59, a18, t61, div13, h11, t63, h25, t65, h30, t66, b0, t68, div9, a19, t70, a20, t72, h31, t73, b1, t75, div10, a21, t77, a22, t79, h32, t80, b2, t81, div11, a23, t83, a24, t85, h33, t86, b3, t87, div12, a25, t89, a26, t91, h26, t93, a27, t95, h27, t97, a28, t99, a29, t101, div20, div15, t103, div16, t105, div17, t107, div18, t109, div19, current, dispose;

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

    	var each_value_2 = ctx.itemsTab1;

    	var each_blocks_2 = [];

    	for (var i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	function outro_block(i, detaching, local) {
    		if (each_blocks_2[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks_2[i].d(detaching);
    					each_blocks_2[i] = null;
    				});
    			}

    			each_blocks_2[i].o(local);
    		}
    	}

    	var each_value_1 = ctx.sites3lados;

    	var each_blocks_1 = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	function outro_block_1(i, detaching, local) {
    		if (each_blocks_1[i]) {
    			if (detaching) {
    				on_outro(() => {
    					each_blocks_1[i].d(detaching);
    					each_blocks_1[i] = null;
    				});
    			}

    			each_blocks_1[i].o(local);
    		}
    	}

    	var each_value = ctx.servidores;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function outro_block_2(i, detaching, local) {
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
    			editor.$$.fragment.c();
    			t0 = space();
    			div21 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t1 = space();
    			div14 = element("div");
    			div7 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Links";
    			t3 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (var i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t4 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Sites";
    			t6 = space();
    			div6 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Sites";
    			t8 = space();
    			fieldset = element("fieldset");
    			div4 = element("div");
    			input0 = element("input");
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div5 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Contabo 6";
    			option1 = element("option");
    			option1.textContent = "Contabo 8";
    			t13 = space();
    			button = element("button");
    			button.textContent = "Adicionar";
    			t15 = space();

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t16 = space();
    			h21 = element("h2");
    			h21.textContent = "Servidores";
    			t18 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t19 = space();
    			div8 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Links";
    			t21 = space();
    			a2 = element("a");
    			t22 = text("/pol/\n        ");
    			img1 = element("img");
    			t23 = space();
    			a3 = element("a");
    			t24 = text("/wg/\n        ");
    			img2 = element("img");
    			t25 = space();
    			a4 = element("a");
    			t26 = text("/gd/\n        ");
    			img3 = element("img");
    			t27 = space();
    			a5 = element("a");
    			a5.textContent = "Asana";
    			t29 = space();
    			h22 = element("h2");
    			h22.textContent = "Sites de Imagens";
    			t31 = space();
    			a6 = element("a");
    			a6.textContent = "PXHere";
    			t33 = space();
    			a7 = element("a");
    			a7.textContent = "Pexels";
    			t35 = space();
    			h23 = element("h2");
    			h23.textContent = "CSS";
    			t37 = space();
    			a8 = element("a");
    			a8.textContent = "Animista - presets de animações";
    			t39 = space();
    			a9 = element("a");
    			a9.textContent = "Loading.io";
    			t41 = space();
    			a10 = element("a");
    			a10.textContent = "Coolors - cores, paletas";
    			t43 = space();
    			a11 = element("a");
    			a11.textContent = "Clippy - SVG formas geometricas";
    			t45 = space();
    			a12 = element("a");
    			a12.textContent = "SVG Backgrounds";
    			t47 = space();
    			a13 = element("a");
    			a13.textContent = "Triangulos backgrounds";
    			t49 = space();
    			a14 = element("a");
    			a14.textContent = "Keyframes.app";
    			t51 = space();
    			h24 = element("h2");
    			h24.textContent = "Inspiração";
    			t53 = space();
    			a15 = element("a");
    			a15.textContent = "Evernote Design";
    			t55 = space();
    			a16 = element("a");
    			a16.textContent = "Webframe";
    			t57 = space();
    			a17 = element("a");
    			a17.textContent = "Dribble";
    			t59 = space();
    			a18 = element("a");
    			a18.textContent = "Dribble 2";
    			t61 = space();
    			div13 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Work";
    			t63 = space();
    			h25 = element("h2");
    			h25.textContent = "Servidores";
    			t65 = space();
    			h30 = element("h3");
    			t66 = text("Contabo  \n        ");
    			b0 = element("b");
    			b0.textContent = "6";
    			t68 = space();
    			div9 = element("div");
    			a19 = element("a");
    			a19.textContent = "Rancher";
    			t70 = space();
    			a20 = element("a");
    			a20.textContent = "PMA";
    			t72 = space();
    			h31 = element("h3");
    			t73 = text("Contabo  \n        ");
    			b1 = element("b");
    			b1.textContent = "8";
    			t75 = space();
    			div10 = element("div");
    			a21 = element("a");
    			a21.textContent = "Rancher";
    			t77 = space();
    			a22 = element("a");
    			a22.textContent = "PMA";
    			t79 = space();
    			h32 = element("h3");
    			t80 = text("Hetzner  \n        ");
    			b2 = element("b");
    			t81 = space();
    			div11 = element("div");
    			a23 = element("a");
    			a23.textContent = "Rancher";
    			t83 = space();
    			a24 = element("a");
    			a24.textContent = "PMA";
    			t85 = space();
    			h33 = element("h3");
    			t86 = text("Hetzner  2\n        ");
    			b3 = element("b");
    			t87 = space();
    			div12 = element("div");
    			a25 = element("a");
    			a25.textContent = "Rancher";
    			t89 = space();
    			a26 = element("a");
    			a26.textContent = "PMA";
    			t91 = space();
    			h26 = element("h2");
    			h26.textContent = "Github";
    			t93 = space();
    			a27 = element("a");
    			a27.textContent = "Github relato";
    			t95 = space();
    			h27 = element("h2");
    			h27.textContent = "Mautic";
    			t97 = space();
    			a28 = element("a");
    			a28.textContent = "Guia Powertic";
    			t99 = space();
    			a29 = element("a");
    			a29.textContent = "Luizeof";
    			t101 = space();
    			div20 = element("div");
    			div15 = element("div");
    			div15.textContent = "424964";
    			t103 = space();
    			div16 = element("div");
    			div16.textContent = "1A1423";
    			t105 = space();
    			div17 = element("div");
    			div17.textContent = "E26D5A";
    			t107 = space();
    			div18 = element("div");
    			div18.textContent = "FFC857";
    			t109 = space();
    			div19 = element("div");
    			div19.textContent = "1F2041";
    			img0.src = "images/pdp.svg";
    			img0.width = "50px";
    			img0.alt = "";
    			add_location(img0, file$1, 152, 6, 4914);
    			add_location(div0, file$1, 151, 4, 4902);
    			div1.className = "sidebar esquerda";
    			add_location(div1, file$1, 150, 2, 4867);
    			a0.className = "uk-accordion-title";
    			a0.href = "#";
    			add_location(a0, file$1, 162, 10, 5105);
    			div2.className = "nested";
    			add_location(div2, file$1, 164, 12, 5211);
    			div3.className = "uk-accordion-content";
    			add_location(div3, file$1, 163, 10, 5164);
    			li0.className = "uk-open";
    			add_location(li0, file$1, 161, 8, 5074);
    			a1.className = "uk-accordion-title";
    			a1.href = "#";
    			add_location(a1, file$1, 181, 10, 5731);
    			add_location(h20, file$1, 183, 12, 5837);
    			input0.className = "uk-input";
    			attr(input0, "type", "text");
    			input0.placeholder = "Nome";
    			add_location(input0, file$1, 186, 24, 5967);
    			input1.className = "uk-input";
    			attr(input1, "type", "text");
    			input1.placeholder = "URL";
    			add_location(input1, file$1, 187, 24, 6072);
    			div4.className = "uk-margin";
    			add_location(div4, file$1, 185, 20, 5919);
    			option0.__value = "36";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 191, 28, 6302);
    			option1.__value = "Contabo 8";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 192, 28, 6368);
    			select.className = "uk-select";
    			add_location(select, file$1, 190, 24, 6247);
    			div5.className = "uk-margin";
    			add_location(div5, file$1, 189, 20, 6199);
    			fieldset.className = "uk-fieldset";
    			add_location(fieldset, file$1, 184, 16, 5868);
    			attr(button, "uk-icon", "icon: plus-circle");
    			button.className = "uk-button uk-button-body uk-width-1-3";
    			add_location(button, file$1, 196, 16, 6500);
    			add_location(h21, file$1, 203, 12, 6815);
    			div6.className = "uk-accordion-content";
    			add_location(div6, file$1, 182, 10, 5790);
    			add_location(li1, file$1, 180, 8, 5716);
    			attr(ul, "uk-accordion", "");
    			add_location(ul, file$1, 160, 6, 5048);
    			div7.className = "colunas nested";
    			add_location(div7, file$1, 158, 4, 5012);
    			add_location(h10, file$1, 216, 6, 7161);
    			img1.src = "images/icons/4chan.png";
    			add_location(img1, file$1, 219, 8, 7245);
    			a2.href = "https://boards.4chan.org/pol/";
    			add_location(a2, file$1, 217, 6, 7182);
    			img2.src = "images/icons/4chan.png";
    			add_location(img2, file$1, 223, 8, 7360);
    			a3.href = "https://boards.4chan.org/wg/";
    			add_location(a3, file$1, 221, 6, 7299);
    			img3.src = "images/icons/4chan.png";
    			add_location(img3, file$1, 227, 8, 7475);
    			a4.href = "https://boards.4chan.org/gd/";
    			add_location(a4, file$1, 225, 6, 7414);
    			a5.href = "https://app.asana.com/";
    			add_location(a5, file$1, 229, 6, 7529);
    			add_location(h22, file$1, 230, 6, 7578);
    			a6.href = "https://pxhere.com/pt/";
    			add_location(a6, file$1, 231, 6, 7610);
    			a7.href = "https://www.pexels.com/";
    			add_location(a7, file$1, 232, 6, 7660);
    			h23.className = "tracking-in-contract";
    			add_location(h23, file$1, 233, 6, 7711);
    			a8.href = "http://animista.net/play/background/ken-burns/kenburns-bottom-left";
    			add_location(a8, file$1, 234, 6, 7759);
    			a9.href = "https://loading.io/";
    			add_location(a9, file$1, 238, 6, 7902);
    			a10.href = "https://coolors.co/424964-1a1423-e26d5a-ffc857-1f2041";
    			add_location(a10, file$1, 239, 6, 7953);
    			a11.href = "https://bennettfeely.com/clippy/";
    			add_location(a11, file$1, 242, 6, 8068);
    			a12.href = "https://www.svgbackgrounds.com/";
    			add_location(a12, file$1, 245, 6, 8169);
    			a13.href = "http://alssndro.github.io/trianglify-background-generator/";
    			add_location(a13, file$1, 246, 6, 8237);
    			a14.href = "https://keyframes.app/editor/";
    			add_location(a14, file$1, 249, 6, 8355);
    			add_location(h24, file$1, 250, 6, 8419);
    			a15.href = "https://www.evernote.design/";
    			add_location(a15, file$1, 251, 6, 8445);
    			a16.href = "https://webframe.xyz/";
    			add_location(a16, file$1, 252, 6, 8510);
    			a17.href = "https://dribbble.com/fantasy";
    			add_location(a17, file$1, 253, 6, 8561);
    			a18.href = "https://dribbble.com/fantasy";
    			add_location(a18, file$1, 254, 6, 8618);
    			div8.className = "colunas";
    			add_location(div8, file$1, 215, 4, 7133);
    			add_location(h11, file$1, 257, 6, 8714);
    			h25.className = "tracking-in-contract";
    			add_location(h25, file$1, 258, 6, 8734);
    			add_location(b0, file$1, 261, 8, 8820);
    			add_location(h30, file$1, 259, 6, 8789);
    			a19.href = "http://contabo6.oncloud.net.br:10001/env/1a5/apps/stacks";
    			add_location(a19, file$1, 264, 8, 8876);
    			a20.href = "http://phpmyadmin6.3lados.com.br/";
    			add_location(a20, file$1, 267, 8, 8983);
    			div9.className = "nested";
    			add_location(div9, file$1, 263, 6, 8847);
    			add_location(b1, file$1, 271, 8, 9085);
    			add_location(h31, file$1, 269, 6, 9054);
    			a21.href = "http://contabo8.3lados.com.br:10001/";
    			add_location(a21, file$1, 274, 8, 9141);
    			a22.href = "http://phpmyadmin8.3lados.com.br/";
    			add_location(a22, file$1, 275, 8, 9208);
    			div10.className = "nested";
    			add_location(div10, file$1, 273, 6, 9112);
    			add_location(b2, file$1, 279, 8, 9310);
    			add_location(h32, file$1, 277, 6, 9279);
    			a23.href = "http://116.203.114.19:10001";
    			add_location(a23, file$1, 282, 8, 9363);
    			a24.href = "http://phpmyadminhetzner.3lados.com.br";
    			add_location(a24, file$1, 283, 8, 9421);
    			div11.className = "nested";
    			add_location(div11, file$1, 281, 6, 9334);
    			add_location(b3, file$1, 287, 8, 9529);
    			add_location(h33, file$1, 285, 6, 9497);
    			a25.href = "http://hetzner2.3lados.com.br:10001/";
    			add_location(a25, file$1, 290, 8, 9582);
    			a26.href = "http://pmahetzner2.3lados.com.br/";
    			add_location(a26, file$1, 291, 8, 9649);
    			div12.className = "nested";
    			add_location(div12, file$1, 289, 6, 9553);
    			h26.className = "tracking-in-contract";
    			add_location(h26, file$1, 294, 6, 9721);
    			a27.href = "https://github.com/RELATO";
    			add_location(a27, file$1, 295, 6, 9772);
    			h27.className = "tracking-in-contract";
    			add_location(h27, file$1, 296, 6, 9832);
    			a28.href = "https://powertic.com/pt-br/guia-para-iniciantes-em-mautic/";
    			add_location(a28, file$1, 297, 6, 9883);
    			a29.href = "https://luizeof.com.br/";
    			add_location(a29, file$1, 300, 6, 9992);
    			div13.className = "colunas";
    			add_location(div13, file$1, 256, 4, 8686);
    			div14.className = "centro";
    			add_location(div14, file$1, 156, 2, 4986);
    			set_style(div15, "background-color", "#424964");
    			add_location(div15, file$1, 304, 4, 10094);
    			set_style(div16, "background-color", "#1A1423");
    			add_location(div16, file$1, 305, 4, 10150);
    			set_style(div17, "background-color", "#E26D5A");
    			add_location(div17, file$1, 306, 4, 10206);
    			set_style(div18, "background-color", "#FFC857");
    			add_location(div18, file$1, 307, 4, 10262);
    			set_style(div19, "background-color", "#1F2041");
    			add_location(div19, file$1, 308, 4, 10318);
    			div20.className = "sidebar direita";
    			add_location(div20, file$1, 303, 2, 10060);
    			div21.className = "main";
    			add_location(div21, file$1, 149, 0, 4846);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(button, "click", ctx.addSite)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(editor, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div21, anchor);
    			append(div21, div1);
    			append(div1, div0);
    			append(div0, img0);
    			append(div21, t1);
    			append(div21, div14);
    			append(div14, div7);
    			append(div7, ul);
    			append(ul, li0);
    			append(li0, a0);
    			append(li0, t3);
    			append(li0, div3);
    			append(div3, div2);

    			for (var i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div2, null);
    			}

    			append(ul, t4);
    			append(ul, li1);
    			append(li1, a1);
    			append(li1, t6);
    			append(li1, div6);
    			append(div6, h20);
    			append(div6, t8);
    			append(div6, fieldset);
    			append(fieldset, div4);
    			append(div4, input0);

    			input0.value = ctx.nomesite;

    			append(div4, t9);
    			append(div4, input1);

    			input1.value = ctx.urlsite;

    			append(fieldset, t10);
    			append(fieldset, div5);
    			append(div5, select);
    			append(select, option0);
    			append(select, option1);
    			append(div6, t13);
    			append(div6, button);
    			append(div6, t15);

    			for (var i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div6, null);
    			}

    			append(div6, t16);
    			append(div6, h21);
    			append(div6, t18);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append(div14, t19);
    			append(div14, div8);
    			append(div8, h10);
    			append(div8, t21);
    			append(div8, a2);
    			append(a2, t22);
    			append(a2, img1);
    			append(div8, t23);
    			append(div8, a3);
    			append(a3, t24);
    			append(a3, img2);
    			append(div8, t25);
    			append(div8, a4);
    			append(a4, t26);
    			append(a4, img3);
    			append(div8, t27);
    			append(div8, a5);
    			append(div8, t29);
    			append(div8, h22);
    			append(div8, t31);
    			append(div8, a6);
    			append(div8, t33);
    			append(div8, a7);
    			append(div8, t35);
    			append(div8, h23);
    			append(div8, t37);
    			append(div8, a8);
    			append(div8, t39);
    			append(div8, a9);
    			append(div8, t41);
    			append(div8, a10);
    			append(div8, t43);
    			append(div8, a11);
    			append(div8, t45);
    			append(div8, a12);
    			append(div8, t47);
    			append(div8, a13);
    			append(div8, t49);
    			append(div8, a14);
    			append(div8, t51);
    			append(div8, h24);
    			append(div8, t53);
    			append(div8, a15);
    			append(div8, t55);
    			append(div8, a16);
    			append(div8, t57);
    			append(div8, a17);
    			append(div8, t59);
    			append(div8, a18);
    			append(div14, t61);
    			append(div14, div13);
    			append(div13, h11);
    			append(div13, t63);
    			append(div13, h25);
    			append(div13, t65);
    			append(div13, h30);
    			append(h30, t66);
    			append(h30, b0);
    			append(div13, t68);
    			append(div13, div9);
    			append(div9, a19);
    			append(div9, t70);
    			append(div9, a20);
    			append(div13, t72);
    			append(div13, h31);
    			append(h31, t73);
    			append(h31, b1);
    			append(div13, t75);
    			append(div13, div10);
    			append(div10, a21);
    			append(div10, t77);
    			append(div10, a22);
    			append(div13, t79);
    			append(div13, h32);
    			append(h32, t80);
    			append(h32, b2);
    			append(div13, t81);
    			append(div13, div11);
    			append(div11, a23);
    			append(div11, t83);
    			append(div11, a24);
    			append(div13, t85);
    			append(div13, h33);
    			append(h33, t86);
    			append(h33, b3);
    			append(div13, t87);
    			append(div13, div12);
    			append(div12, a25);
    			append(div12, t89);
    			append(div12, a26);
    			append(div13, t91);
    			append(div13, h26);
    			append(div13, t93);
    			append(div13, a27);
    			append(div13, t95);
    			append(div13, h27);
    			append(div13, t97);
    			append(div13, a28);
    			append(div13, t99);
    			append(div13, a29);
    			append(div21, t101);
    			append(div21, div20);
    			append(div20, div15);
    			append(div20, t103);
    			append(div20, div16);
    			append(div20, t105);
    			append(div20, div17);
    			append(div20, t107);
    			append(div20, div18);
    			append(div20, t109);
    			append(div20, div19);
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
    				each_value_2 = ctx.itemsTab1;

    				for (var i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(changed, child_ctx);
    						each_blocks_2[i].i(1);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].i(1);
    						each_blocks_2[i].m(div2, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks_2.length; i += 1) outro_block(i, 1, 1);
    				check_outros();
    			}

    			if (changed.nomesite && (input0.value !== ctx.nomesite)) input0.value = ctx.nomesite;
    			if (changed.urlsite && (input1.value !== ctx.urlsite)) input1.value = ctx.urlsite;

    			if (changed.sites3lados) {
    				each_value_1 = ctx.sites3lados;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    						each_blocks_1[i].i(1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].i(1);
    						each_blocks_1[i].m(div6, t16);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks_1.length; i += 1) outro_block_1(i, 1, 1);
    				check_outros();
    			}

    			if (changed.servidores) {
    				each_value = ctx.servidores;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						each_blocks[i].i(1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].i(1);
    						each_blocks[i].m(div6, null);
    					}
    				}

    				group_outros();
    				for (; i < each_blocks.length; i += 1) outro_block_2(i, 1, 1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			editor.$$.fragment.i(local);

    			for (var i = 0; i < each_value_2.length; i += 1) each_blocks_2[i].i();

    			for (var i = 0; i < each_value_1.length; i += 1) each_blocks_1[i].i();

    			for (var i = 0; i < each_value.length; i += 1) each_blocks[i].i();

    			current = true;
    		},

    		o: function outro(local) {
    			editor.$$.fragment.o(local);

    			each_blocks_2 = each_blocks_2.filter(Boolean);
    			for (let i = 0; i < each_blocks_2.length; i += 1) outro_block(i, 0, 0);

    			each_blocks_1 = each_blocks_1.filter(Boolean);
    			for (let i = 0; i < each_blocks_1.length; i += 1) outro_block_1(i, 0, 0);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) outro_block_2(i, 0, 0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			editor.$destroy(detaching);

    			if (detaching) {
    				detach(t0);
    				detach(div21);
    			}

    			destroy_each(each_blocks_2, detaching);

    			destroy_each(each_blocks_1, detaching);

    			destroy_each(each_blocks, detaching);

    			run_all(dispose);
    		}
    	};
    }

    let URL = "localhost:8000";

    let excerpt = "resumo";

    function instance$1($$self, $$props, $$invalidate) {

      let sites3lados = [];
      let servidores = [];
      let nomesite = "";
      let urlsite = "";

      let link = "url";
      let imagem = "images/icons/youtube.svg";
      let nome = "Nome";
      let id = 0;

        onMount(async () => {
          // const res = await fetch(`https://eurovinhos.ml/wc-api/v3/products/?per_page=20&consumer_key=ck_a232b308626bec11aae453b858b2ef36090c4b5f&consumer_secret=cs_18c14d587c2bd007f518fdb5e8c04283c7bb4956`);
          // products = await res.json();
          $$invalidate('sites3lados', sites3lados = await fetch(
            `http://`+ URL +`/wp-json/wp/v2/sites`
          ).then(r => r.json()));
          // servidores = await fetch(
          //   `http://`+ URL +`/wp-json/wp/v2/servidores`
          // ).then(r => r.json());
          $$invalidate('servidores', servidores = await fetch(
            `https://jsonplaceholder.typicode.com/photos?_limit=20`
          ).then(r => r.json()));
          console.log(servidores);
        });

        function addSite () {

            var ourPostData = {
                "title": nomesite,
                "content": urlsite,
                "status": "publish",
                "excerpt": excerpt
            };
            let tokendocker = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9sb2NhbGhvc3Q6ODAwMCIsImlhdCI6MTU2MTkzNTYwMiwibmJmIjoxNTYxOTM1NjAyLCJleHAiOjE1NjI1NDA0MDIsImRhdGEiOnsidXNlciI6eyJpZCI6IjEifX19.3gpSb8VBYgNRc9c_wjPdYX6WF1uUJWZ6vX_mtX-QWco";

            var createPost = new XMLHttpRequest();
            createPost.open("POST", "http://"+ URL +"/wp-json/wp/v2/sites");
            createPost.setRequestHeader("Authorization", "Bearer "+tokendocker);
            // createPost.setRequestHeader("X-WP-Nonce", nonce.nonce);
            createPost.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
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
                        $$invalidate('nomesite', nomesite = '');
                        $$invalidate('urlsite', urlsite = '');
                        location.reload();
                    } else {
                        alert("Error - try again.");
                    }
                }
            };

        }

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

    	function input_change_handler({ item, each_value_2, item_index }) {
    		each_value_2[item_index].selected = this.checked;
    		$$invalidate('itemsTab1', itemsTab1);
    	}

    	function input0_input_handler() {
    		nomesite = this.value;
    		$$invalidate('nomesite', nomesite);
    	}

    	function input1_input_handler() {
    		urlsite = this.value;
    		$$invalidate('urlsite', urlsite);
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
    		sites3lados,
    		servidores,
    		nomesite,
    		urlsite,
    		link,
    		imagem,
    		nome,
    		id,
    		addSite,
    		itemsTab1,
    		remove,
    		salvar,
    		editar,
    		selecionado,
    		input_change_handler,
    		input0_input_handler,
    		input1_input_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		// name: 'STARTPAGE'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
