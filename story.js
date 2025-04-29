// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = '_default';
squiffy.story.id = 'c36fe79c94';
squiffy.story.sections = {
	'_default': {
		'text': "<p>Your name is Wren. </p>\n<p>You are twenty-five years old. </p>\n<p>Your interests include: the deep and joyous wonder of being alive, slime ASMR, and The Mountain Goats (the midwest emo band).</p>\n<p>You are all alone in your childhood bedroom. What&#39;s up with that? You aren&#39;t a kid anymore. It&#39;s time to get going.</p>\n<p><a class=\"squiffy-link link-passage\" data-passage=\"Inspect door\" role=\"link\" tabindex=\"0\">Inspect door</a>. </p>",
		'passages': {
			'Inspect door': {
				'text': "<p>That bitch is closed. </p>\n<p>You can <a class=\"squiffy-link link-passage\" data-passage=\"jiggle the knob\" role=\"link\" tabindex=\"0\">jiggle the knob</a>, <a class=\"squiffy-link link-passage\" data-passage=\"peer out the window\" role=\"link\" tabindex=\"0\">peer out the window</a>, or <a class=\"squiffy-link link-passage\" data-passage=\"do a silly little dance\" role=\"link\" tabindex=\"0\">do a silly little dance</a>. </p>",
			},
			'jiggle the knob': {
				'text': "<p>The knob jiggles. Are you happy now?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you do now?\" role=\"link\" tabindex=\"0\">What do you do now?</a></p>",
			},
			'peer out the window': {
				'text': "<p>Looks like a mild day outside. You can see the mountain in the distance. There are two or three houses around you; they all look the same. It is a suburb, after all.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you do now?\" role=\"link\" tabindex=\"0\">What do you do now?</a></p>",
			},
			'do a silly little dance': {
				'text': "<p>You do a silly little dance. Nothing happens, but you feel better.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you do now?\" role=\"link\" tabindex=\"0\">What do you do now?</a></p>",
			},
		},
	},
	'What do you do now?': {
		'text': "<p>You can <a class=\"squiffy-link link-passage\" data-passage=\"touch\" role=\"link\" tabindex=\"0\">touch</a>, <a class=\"squiffy-link link-passage\" data-passage=\"hear\" role=\"link\" tabindex=\"0\">hear</a>, <a class=\"squiffy-link link-passage\" data-passage=\"see\" role=\"link\" tabindex=\"0\">see</a>, or <a class=\"squiffy-link link-passage\" data-passage=\"smell\" role=\"link\" tabindex=\"0\">smell</a>.</p>",
		'passages': {
			'touch': {
				'text': "<p>There are lots of plushies on the bed. Aren&#39;t you getting a little old for those?</p>\n<p>Well, I guess you&#39;ve got no choice but to break the fucking door down. <a class=\"squiffy-link link-section\" data-section=\"Such is life.\" role=\"link\" tabindex=\"0\">Such is life.</a></p>",
			},
			'hear': {
				'text': "<p>There&#39;s - a weird sound. It&#39;s like... a deep howling?</p>\n<p>Probably just your neighbor&#39;s old lawnmower. </p>\n<p>Well, I guess you&#39;ve got no choice but to break the fucking door down. <a class=\"squiffy-link link-section\" data-section=\"Such is life.\" role=\"link\" tabindex=\"0\">Such is life.</a></p>",
			},
			'see': {
				'text': "<p>The room is more or less the same way you remember it. </p>\n<p>Well, I guess you&#39;ve got no choice but to break the fucking door down. <a class=\"squiffy-link link-section\" data-section=\"Such is life.\" role=\"link\" tabindex=\"0\">Such is life.</a></p>",
			},
			'smell': {
				'text': "<p>It smells like cucumber melon Bath and Body Works lotion. They just rereleased the soap last month. You&#39;re a sucker for nostalgia.</p>\n<p>Well, I guess you&#39;ve got no choice but to break the fucking door down. <a class=\"squiffy-link link-section\" data-section=\"Such is life.\" role=\"link\" tabindex=\"0\">Such is life.</a></p>",
			},
		},
	},
	'Such is life.': {
		'text': "<p>You break the fucking door down. </p>\n<p>The hallway looks different.</p>\n<p>There were... stairs, right? Yeah, there definitely used to be stairs out here. That&#39;s how you got to the kitchen.</p>\n<p>No one in their right mind would design a building with an unreachable third floor.</p>\n<p>In the place of everything else, you see a <a class=\"squiffy-link link-section\" data-section=\"red door\" role=\"link\" tabindex=\"0\">red door</a>, a <a class=\"squiffy-link link-section\" data-section=\"pink door\" role=\"link\" tabindex=\"0\">pink door</a>, and a <a class=\"squiffy-link link-section\" data-section=\"blue door\" role=\"link\" tabindex=\"0\">blue door</a>. </p>",
		'passages': {
		},
	},
	'red door': {
		'text': "<p>Your name is Wren. </p>\n<p>You are fifteen years old. </p>\n<p>Your interests include: bad music, a worse attitude, and slime ASMR.</p>\n<p>You are all alone in your bedroom.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Good.\" role=\"link\" tabindex=\"0\">Good.</a></p>",
		'passages': {
		},
	},
	'Good.': {
		'text': "<p>You can <a class=\"squiffy-link link-passage\" data-passage=\"touch\" role=\"link\" tabindex=\"0\">touch</a>, <a class=\"squiffy-link link-passage\" data-passage=\"hear\" role=\"link\" tabindex=\"0\">hear</a>, <a class=\"squiffy-link link-passage\" data-passage=\"see\" role=\"link\" tabindex=\"0\">see</a>, or <a class=\"squiffy-link link-passage\" data-passage=\"smell\" role=\"link\" tabindex=\"0\">smell</a>.</p>",
		'passages': {
			'touch': {
				'text': "<p>There are some plushies on the bed. Aren&#39;t you getting a little old for those?</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Continue\" role=\"link\" tabindex=\"0\">Continue</a>?</p>",
			},
			'hear': {
				'text': "<p>There&#39;s music playing through your earbuds, drowning out the deafening sound of wailing and howling outside your window. You try to ignore it as much as you&#39;re able. </p>\n<p>The cords of your earbuds are all knotted and gray. You&#39;re listening to Brendon Urie, because he&#39;s the greatest lyrical genius of your generation. He <em>gets</em> you. <em>And</em> he makes those high heels work.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Continue\" role=\"link\" tabindex=\"0\">Continue</a>?</p>",
			},
			'see': {
				'text': "<p>The room is fine. It&#39;s, like, whatever. There are some band posters up and some band tees in the closet next to the ripped skinny jeans. Next to the lamp you&#39;ve had since you were born is a drawing your best friend Jordan made you. You smile every time you see it, and you don&#39;t smile about much. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Continue\" role=\"link\" tabindex=\"0\">Continue</a>?</p>",
			},
			'smell': {
				'text': "<p>It smells like AXE body spray and self-loathing. Your mom likes to tell Grandma that you&#39;re &quot;trying some things out&quot;. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Continue\" role=\"link\" tabindex=\"0\">Continue</a>?</p>",
			},
		},
	},
	'Continue': {
		'text': "<p>You have this strange feeling that there&#39;s somewhere you need to be. As the song playing through your earbuds switches to Twenty One Pilots - with a line through the &#39;o&#39;, of course - you open your bedroom door. </p>\n<p>The stairs are gone.</p>\n<p>In the place where they should be, you see a <a class=\"squiffy-link link-section\" data-section=\"pink door\" role=\"link\" tabindex=\"0\">pink door</a> and a <a class=\"squiffy-link link-section\" data-section=\"blue door\" role=\"link\" tabindex=\"0\">blue door</a>. There is also a <a class=\"squiffy-link link-section\" data-section=\"white door\" role=\"link\" tabindex=\"0\">white door</a>, but you really feel like you should go in there last. The other two might have more to see first.</p>\n<p>(If you&#39;ve <strong>gone in all the other rooms</strong>, you feel a strange pull to enter the white door.)</p>",
		'passages': {
		},
	},
	'pink door': {
		'text': "<p>Your name is Wren. </p>\n<p>You are seven years old. </p>\n<p>Your interests include: Littlest Pet Shops, tea parties, and your mama.</p>\n<p>You are all alone in your bedroom. Your dolls, Laura and Elsa, would love to have a tea party with you until Jordan comes over later. So you have one.</p>\n<p>You can <a class=\"squiffy-link link-passage\" data-passage=\"touch\" role=\"link\" tabindex=\"0\">touch</a>, <a class=\"squiffy-link link-passage\" data-passage=\"hear\" role=\"link\" tabindex=\"0\">hear</a>, <a class=\"squiffy-link link-passage\" data-passage=\"see\" role=\"link\" tabindex=\"0\">see</a>, or <a class=\"squiffy-link link-passage\" data-passage=\"smell\" role=\"link\" tabindex=\"0\">smell</a>.</p>",
		'passages': {
			'touch': {
				'text': "<p>There are so many things in here to touch! You only keep things in your room that are good to touch. You have a wooden cube that&#39;s the perfect weight in your hand. You have a blanket that makes you feel all cozy and warm. It&#39;s like getting a hug. You also have a small container of slime that your mama won&#39;t let you play with on the carpet, but sometimes you do anyway. Elsa promises not to tell. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you want to do now?\" role=\"link\" tabindex=\"0\">What do you want to do now?</a></p>",
			},
			'hear': {
				'text': "<p>The clink of cups. The sounds of polite conversation between friends. Laura is set to be engaged to a prince soon, and it&#39;s very exciting. You worry about how she will manage being the court wizard, the mother to seventeen orphans, <em>and</em> a princess - but if anyone can manage, it&#39;s Laura. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you want to do now?\" role=\"link\" tabindex=\"0\">What do you want to do now?</a></p>",
			},
			'see': {
				'text': "<p>There is a Strawberry Shortcake playset in the corner. It&#39;s got the toys from the last time you played. The Evil Queen Balthazar is about to boil Princess Medina and Princess Celeste alive - and that was as far as you got before Jordan had to go home for the night.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you want to do now?\" role=\"link\" tabindex=\"0\">What do you want to do now?</a></p>",
			},
			'smell': {
				'text': "<p>Your room smells like the shampoo and detergent your mom uses. It makes you feel safe. The tea in the cups tastes like sink water, but that&#39;s okay. Laura and Elsa don&#39;t mind.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you want to do now?\" role=\"link\" tabindex=\"0\">What do you want to do now?</a></p>",
			},
		},
	},
	'What do you want to do now?': {
		'text': "<p>Jordan should be here by now. </p>\n<p>You leave the party and go out into the hallway, checking both ways before swinging the door open all the way. </p>\n<p>You want to check with your mama, but she isn&#39;t out there.</p>\n<p>The only things you can see are a <a class=\"squiffy-link link-section\" data-section=\"red door\" role=\"link\" tabindex=\"0\">red door</a> and a <a class=\"squiffy-link link-section\" data-section=\"blue door\" role=\"link\" tabindex=\"0\">blue door</a>.</p>\n<p>There is also a <a class=\"squiffy-link link-section\" data-section=\"white door\" role=\"link\" tabindex=\"0\">white door</a>, but you really feel like you should go in there last. The other two might have more to see first.</p>\n<p>(If you&#39;ve <strong>gone in all the other rooms</strong>, you feel a strange pull to enter the white door.)</p>",
		'passages': {
		},
	},
	'blue door': {
		'text': "<p>Your name is Wren. </p>\n<p>You are twelve years old. </p>\n<p>Your interests include: bad music that you think is good, Littlest Pet Shops, and mountain goats (the animal).</p>\n<p>You are all alone in your bedroom. The wolf isn&#39;t here with you right now. </p>\n<p>You can <a class=\"squiffy-link link-passage\" data-passage=\"touch\" role=\"link\" tabindex=\"0\">touch</a>, <a class=\"squiffy-link link-passage\" data-passage=\"hear\" role=\"link\" tabindex=\"0\">hear</a>, <a class=\"squiffy-link link-passage\" data-passage=\"see\" role=\"link\" tabindex=\"0\">see</a>, or <a class=\"squiffy-link link-passage\" data-passage=\"smell\" role=\"link\" tabindex=\"0\">smell</a>.</p>",
		'passages': {
			'touch': {
				'text': "<p>Your left wrist hurts. You&#39;ve been trying not to move it very much. You hurt it last week, a dark ring of bruises purpling around it in the shape of -</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Don't Worry About It.\" role=\"link\" tabindex=\"0\">Don&#39;t Worry About It.</a></p>",
			},
			'hear': {
				'text': "<p>There&#39;s a sound outside, like some sort of loud dog. Or maybe voices. Maybe one voice that you keep hearing in the middle of the night, while you&#39;re trying to sleep -</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Don't Worry About It.\" role=\"link\" tabindex=\"0\">Don&#39;t Worry About It.</a></p>",
			},
			'Don\'t Worry About It.': {
				'text': "",
			},
			'see': {
				'text': "<p>On the wall - next to a Polaroid of you and Jordan from camp last summer - is a poster you bought at the zoo, showing a large, fluffy mountain goat perched on a cliffside. Did you know the horns of both males and females can grow up to 12 inches long? </p>\n<p>Sometimes you wish you were a mountain goat, that you could go to the top of a tall cliff and feel the wind in your little goat beard, and then no one would be able to find you ever again, no one would be able to - </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Don't Worry About It.\" role=\"link\" tabindex=\"0\">Don&#39;t Worry About It.</a></p>",
			},
			'smell': {
				'text': "<p>It smells like the cucumber melon Bath and Body Works lotion you got for your birthday last month, as well as the similarly scented candle joyfully sputtering away on your nightstand. </p>\n<p>Your mom said you could have fire in your room as long as you kept an eye on it and put it out before you left. It makes you feel grown-up, but you&#39;re not really sure you want to be all grown-up. After all, there are some things grown-ups have to do that you - </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Don't Worry About It.\" role=\"link\" tabindex=\"0\">Don&#39;t Worry About It.</a></p>",
			},
		},
	},
	'Don\'t Worry About It.': {
		'text': "<p><a class=\"squiffy-link link-section\" data-section=\"What now?\" role=\"link\" tabindex=\"0\">What now?</a></p>",
		'passages': {
		},
	},
	'What now?': {
		'text': "<p>Your head hurts. Your wrist hurts. You want to <em>go home</em>, but you <em>are</em> home, and your head <em>really hurts</em>, and - </p>\n<p>Whatever. Don&#39;t worry about it.</p>\n<p>Pick another door.</p>\n<p>The only things you can see are a <a class=\"squiffy-link link-section\" data-section=\"red door\" role=\"link\" tabindex=\"0\">red door</a> and a <a class=\"squiffy-link link-section\" data-section=\"blue door\" role=\"link\" tabindex=\"0\">blue door</a>.</p>\n<p>There is also a <a class=\"squiffy-link link-section\" data-section=\"white door\" role=\"link\" tabindex=\"0\">white door</a>, but you really feel like you should go in there last. The other two might have more to see first. </p>\n<p>(If you&#39;ve <strong>gone in all the other rooms</strong>, you feel a strange pull to enter the white door.)</p>",
		'passages': {
		},
	},
	'white door': {
		'text': "<p>Your name is Wren. </p>\n<p>You are nine years old. </p>\n<p>You are not alone in your bedroom.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"You can feel.\" role=\"link\" tabindex=\"0\">You can feel.</a></p>",
		'passages': {
		},
	},
	'You can feel.': {
		'text': "<p><strong>It hurts.</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you do?\" role=\"link\" tabindex=\"0\">What do you do?</a></p>",
		'passages': {
		},
	},
	'What do you do?': {
		'text': "<p><strong>Nothing.</strong></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"...\" role=\"link\" tabindex=\"0\">...</a></p>",
		'passages': {
		},
	},
	'...': {
		'text': "<p>Your name is Wren. </p>\n<p>You are nine years old. </p>\n<p>There is a wolf outside your window; </p>\n<p>you can see him shadowed against the pine tree. </p>\n<p>Sometimes your mama allows him inside. </p>\n<p>Sometimes he comes into your room and </p>\n<p>tells you he wants to play, </p>\n<p>but it&#39;s not the way you play with Jordan. </p>\n<p>It&#39;s something new, </p>\n<p>and he tells you it makes you </p>\n<p>all grown-up now, </p>\n<p>but you don&#39;t like it.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Wait.\" role=\"link\" tabindex=\"0\">Wait.</a></p>",
		'passages': {
		},
	},
	'Wait.': {
		'text': "<p>That&#39;s not right. </p>\n<p>You aren&#39;t at home anymore. </p>\n<p>You aren&#39;t fifteen, or twelve or seven or nine. </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Your name is Wren.\" role=\"link\" tabindex=\"0\">Your name is Wren.</a></p>",
		'passages': {
		},
	},
	'Your name is Wren.': {
		'text': "<p><em>My name is Wren.</em> </p>\n<p><a class=\"squiffy-link link-section\" data-section=\"You are twenty-five years old.\" role=\"link\" tabindex=\"0\">You are twenty-five years old.</a></p>",
		'passages': {
		},
	},
	'You are twenty-five years old.': {
		'text': "<p><em>I am twenty-five years old.</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"You aren't a kid anymore.\" role=\"link\" tabindex=\"0\">You aren&#39;t a kid anymore.</a></p>",
		'passages': {
		},
	},
	'You aren\'t a kid anymore.': {
		'text': "<p><em>I&#39;m not a kid anymore.</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"There is one more door.\" role=\"link\" tabindex=\"0\">There is one more door.</a></p>",
		'passages': {
		},
	},
	'There is one more door.': {
		'text': "<p>Try the knob.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"It opens.\" role=\"link\" tabindex=\"0\">It opens.</a></p>",
		'passages': {
		},
	},
	'It opens.': {
		'text': "<p><em>Hey. Are you okay?</em></p>\n<p>You can&#39;t touch, hear, see, or smell.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"There is a hand on yours. It feels safe.\" role=\"link\" tabindex=\"0\">There is a hand on yours. It feels safe.</a></p>",
		'passages': {
		},
	},
	'There is a hand on yours. It feels safe.': {
		'text': "<p><em>Sweetheart? Do you know where you are?</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"You don't.\" role=\"link\" tabindex=\"0\">You don&#39;t.</a></p>",
		'passages': {
		},
	},
	'You don\'t.': {
		'text': "<p><em>It&#39;s me. It&#39;s Jordan. You&#39;re here with me, in our apartment.</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"Jordan?\" role=\"link\" tabindex=\"0\">Jordan?</a></p>",
		'passages': {
		},
	},
	'Jordan?': {
		'text': "<p><em>Yeah. Yeah, sweetheart, I&#39;m right here.</em> </p>\n<p><em>Do you want to talk about something else? Calm down a little?</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"What do you want to talk about?\" role=\"link\" tabindex=\"0\">What do you want to talk about?</a></p>",
		'passages': {
		},
	},
	'What do you want to talk about?': {
		'text': "<p><a class=\"squiffy-link link-passage\" data-passage=\"Mountain goats (the animal);\" role=\"link\" tabindex=\"0\">Mountain goats (the animal);</a></p>\n<p><a class=\"squiffy-link link-passage\" data-passage=\"The Mountain Goats (the midwest emo band);\" role=\"link\" tabindex=\"0\">The Mountain Goats (the midwest emo band);</a></p>\n<p><a class=\"squiffy-link link-passage\" data-passage=\"Slime ASMR (neither an animal nor a band);\" role=\"link\" tabindex=\"0\">Slime ASMR (neither an animal nor a band);</a></p>\n<p>or: <a class=\"squiffy-link link-passage\" data-passage=\"the deep and joyous wonder of being alive.\" role=\"link\" tabindex=\"0\">the deep and joyous wonder of being alive.</a></p>",
		'passages': {
			'Mountain goats (the animal);': {
				'text': "<p><em>Mountain goats mate for life,</em> you say. <em>Did you know that?</em></p>\n<p>She smiles at you. You smile back. You smile about a lot of things these days, even when it&#39;s hard.</p>\n<p><em>And,</em> you say, because you really do want to talk about mountain goats, <em>they have a four-chambered stomach. That&#39;s how they eat so much shit.</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"She kisses the back of your hand.\" role=\"link\" tabindex=\"0\">She kisses the back of your hand.</a></p>",
			},
			'The Mountain Goats (the midwest emo band);': {
				'text': "<p><em>I am gonna make it through this year,</em> you say, <em>if it kills me.</em></p>\n<p>She smiles at you. You smile back. You smile about a lot of things these days, even when it&#39;s hard.</p>\n<p><em>Oh, John Darnielle, we&#39;re really in it now,</em> she replies.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"She kisses the back of your hand.\" role=\"link\" tabindex=\"0\">She kisses the back of your hand.</a></p>",
			},
			'Slime ASMR (neither an animal nor a band);': {
				'text': "<p><em>I wish ASMR didn&#39;t scare the cats,</em> you tell her. </p>\n<p>She smiles at you. You smile back. You smile about a lot of things these days, even when it&#39;s hard.</p>\n<p>She tells you, <em>We raised some weak bitch ass cats.</em></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"She kisses the back of your hand.\" role=\"link\" tabindex=\"0\">She kisses the back of your hand.</a></p>",
			},
			'the deep and joyous wonder of being alive.': {
				'text': "<p><em>I&#39;m good,</em> you say. <em>I&#39;m just. Really glad you&#39;re here.</em></p>\n<p>She smiles at you. You smile back. You smile about a lot of things these days, even when it&#39;s hard.</p>\n<p><em>I love you,</em> she says, and you know it&#39;s true, because you feel the exact same way.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"She kisses the back of your hand.\" role=\"link\" tabindex=\"0\">She kisses the back of your hand.</a></p>",
			},
		},
	},
	'She kisses the back of your hand.': {
		'text': "<p>Your name is Wren. </p>\n<p>You are twenty-five years old. </p>\n<p>You are not in your childhood bedroom. Your mom sold the house, after the court case was over, after the story was told all wrong, after the pigs helped the wolf. She didn&#39;t want to live there anymore. </p>\n<p>The apartment you live in now has three cats, fifteen fish, and your very own childhood-friends-to-lovers trope. Thanks, <a class=\"squiffy-link link-passage\" data-passage=\"Jordan.\" role=\"link\" tabindex=\"0\">Jordan.</a></p>",
		'passages': {
			'Jordan.': {
				'text': "<p>Your interests include: </p>\n<p>a container of Littlest Pet Shops in the bottom of your closet; </p>\n<p>a slowly growing horde of plushies on the bed that you are <em>not</em> too old for; </p>\n<p>mountain goats of all sorts and varieties;</p>\n<p>the scheduled FaceTime call with your mom once a week; </p>\n<p>the deep and joyous wonder of being alive; </p>\n<p>trying to forgive all the versions of yourself, the blue and pink and white doors, the edgy ones and the terrified ones and the ones who had tea parties with tap water;</p>\n<p>and slime ASMR.</p>\n<p>FIN.</p>",
			},
		},
	},
}
})();