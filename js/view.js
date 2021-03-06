/* global chrome, $ */

function domain(url) {return url.replace(/^[^:]+:\/\/(?:www\.)?([^\/]*).*$/, '$1');}

function px_val(elem, key) {return parseInt(elem.css(key).replace(/px/, ''));}

function make_link_box(url, title, favicon) {
    if ($.trim(title) === '') title = url;
    return $('<div class=link-box>')
        .append($('<div class=favicon>')
            .css('background-image', 'url(' + (favicon ? favicon : 'images/globe.svg') + ')'))
        .append($('<a>', {
                class: 'link',
                href: url,
                html: title,
                title: title
            })
            .click(function(e) {
                if (CLICK_LOCK) return false;
                chrome.tabs.create({
                    url: url,
                    active: false
                });
                if (url && !e.metaKey) PORT.postMessage({
                    type: 'delete-records',
                    keys: [url]
                });
                return false;
            })
        );
}

function make_referrer_link_box(url, title, favicon) {
    if ($.trim(title) === '') title = url;
    return $('<div class=link-box>')
        .append($('<div class=favicon>')
            .css('background-image', 'url(' + favicon + ')'))
        .append($('<a>', {
                class: 'link',
                href: url,
                html: title,
                title: title
            })
            .click(function(e) {
                if (CLICK_LOCK) return false;
                chrome.tabs.create({
                    url: url,
                    active: !e.metaKey
                });
                return false;
            }));
}

function make_delete_box(url) {
    return $('<div class=delete-link>')
        .click(function(e) {
            PORT.postMessage({
                type: 'delete-records',
                keys: [url]
            });
        });
}

function make_comment_box(url, comment, heading) {
    var cm = heading ? $('<input class=heading>').val(comment) :
        $('<input class=link-comment>').val(comment ? comment : domain(url));
    return cm.change(function() {
        PORT.postMessage({
            type: 'insert-record-without-tab',
            key: url,
            value: {comment: this.value}
        });
    });
}

function construct_new_key_list() {
    return $('.group:has(.entry)')
        .map(function(i, g) {
            return [
                $('.entry', g).map(function(j, e) {return $(e).attr('url');})
                .toArray().reverse()
            ];
        })
        .toArray();
}

var CLICK_LOCK = false;

function update(data, keyl) {
    $('#main-container').empty()
        .attr('class', '');
    keyl.forEach(function(l) {
        $('<div class="group droppable-gap">')
            .appendTo('#main-container');

        var group = $('<div class="group handleable">')
            .appendTo('#main-container');
        l.forEach(function(url) {
            var val = data[url];
            var en = $('<div class=entry>').attr('url', url)
                .append(make_delete_box(url));
            switch (val.type) {
                case 'referred_link':
                    en.append(make_link_box(url, val.text, ''))
                    .append($('<div class=seperator>'))
                    .append(make_referrer_link_box(val.referrer_url, val.referrer_title, val.referrer_favicon))
                    .append(make_comment_box(url, val.comment));
                    break;
                case 'simple_link':
                    en.append(make_link_box(url, val.text, val.referrer_favicon))
                    .append(make_comment_box(url, val.comment));
                    break;
                case 'comment':
                    en.append(make_comment_box(url, val.comment, true));
                    break;
                default:
            }
            en.prependTo(group);
        });
    });

    $('<div class="group droppable-gap">')
        .appendTo('#main-container');

    $('.group').sortable({
        connectWith: '.group',
        items: '.entry',
        axis: 'y',
        delay: 100,
        start: function() {CLICK_LOCK = true;},
        change: function(e, ui) {
            if (ui.sender === null)
                $('.group.droppable-gap').each(function() {
                    var s = $(this);
                    if ($('.entry', s).length > 0) s.addClass('visible');
                    else s.removeClass('visible');
                });
        },
        stop: function() {CLICK_LOCK = false;},
        update: function(e, ui) {
            if (ui.sender === null)
                PORT.postMessage({
                    type: 'update-key-list',
                    key_list: construct_new_key_list()
                });
        }
    });

    $('#main-container').sortable({
        axis: 'y',
        items: '.group.handleable',
        delay: 100,
        start: function() {
            $('#main-container').addClass('sorting');
            $('.group.droppable-gap').remove();
        },
        update: function(e, ui) {
            if (ui.sender === null)
                PORT.postMessage({
                    type: 'update-key-list',
                    key_list: construct_new_key_list()
                });
        }
    });
}

var PORT = chrome.runtime.connect({name: 'view'});

PORT.onMessage.addListener(function(msg) {
    if (msg.type === 'update') {
        update(msg.data, msg.key_list);
        document.title = Object.keys(msg.data).length + ' Links | miniTab';
    }
});

$('body').keypress(function(e) {
    console.log(e.which);
    if (e.which === 122) $('#reverse-button').click();
});

$('<a class="ui-button ui-button-icon-only" id=reverse-button>')
    .click(function() {
        PORT.postMessage({type: 'undo-one-step'});
    })
    .appendTo('#toolbar');

$('<a class="ui-button ui-button-icon-only" id=insert-heading-button>')
    .click(function() {
        PORT.postMessage({
            type: 'insert-record-without-tab',
            key: Math.random().toString(32).replace(/^0\./, ''),
            value: {type: 'comment'}
        });
    })
    .appendTo('#toolbar');

$('<a class="ui-button ui-button-icon-only" id=clear-all-button>')
    .click(function() {
        PORT.postMessage({type: 'truncate-all'});
    })
    .appendTo('#toolbar');

PORT.postMessage({type: 'init'});
