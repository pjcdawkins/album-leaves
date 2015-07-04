(function ($, soundManager, settings) {
    "use strict";

    var items = {},
        runAllLoaded = false,
        totalDuration = 0,
        playing = false,
        positions = [];

    function checkAllLoaded() {
        if (settings.sounds.length > items.length) {
            return;
        }
        for (var i in items) {
            if (!items[i].loaded) {
                return;
            }
        }
        runAllLoaded || onAllLoaded();
        return true;
    }

    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length-size);
    }

    function formatTime(ms) {
        var date = new Date(ms);

        return date.getMinutes() + ":" + pad(date.getSeconds(), 2);
    }

    /**
     * @see http://www.schillmania.com/projects/soundmanager2/doc/
     */
    function createItem(id, url, div, column, soundManager) {
        var data = {
            offset: 0,
            div: div,
            loaded: false,
            column: column
        };
        data.sound = soundManager.createSound({
            id: id,
            url: url,
            autoLoad: true,
            onload: function () {
                if (this.duration) {
                    div.addClass('loaded');
                    div.find('.duration').text(formatTime(this.duration));
                }
                items[this.id].loaded = true;
                checkAllLoaded();
            },
            onplay: function () {
                div.addClass('playing');
                var item = items[this.id];
                positions[item.column] = item.offset + this.position;
            },
            onresume: function () {
                div.addClass('playing');
            },
            onpause: function () {
                div.removeClass('playing');
            },
            onfinish: function () {
                div.removeClass('playing');
                // If we are still playing, find the next item and play it.
                if (playing) {
                    var next = div.next('.player-item');
                    if (!next.length) {
                        next = div.parent().find('.player-item').eq(0);
                    }
                    if (next.length) {
                        var nextSound = items[next.attr('id')].sound;
                        nextSound.setPosition(0);
                        nextSound.play();
                    }
                }
            },
            whileplaying: function() {
                var item = items[this.id];
                positions[item.column] = item.offset + this.position;
                item.div.find('.position').text(formatTime(this.position))
                item.div.siblings('.position-marker').css('top', calculatePlayheadOffset(item));
            }
        });
        items[id] = data;
    }

    function calculatePlayheadOffset(item) {
        var itemTop = item.div.offset().top + 1,
            itemHeight = item.div.height(),
            positionFraction = item.sound.position / item.sound.duration;

        return itemHeight * positionFraction + itemTop - item.div.parent().offset().top;
    }

    function setHeights() {
        var avgDuration = 0,
            defaultHeight = 200,
            minHeight = 10,
            height,
            count = 0;
        for (var i in items) {
            if (!items.hasOwnProperty(i)) {
                continue;
            }
            ++count;
            totalDuration += items[i].sound.duration;
        }
        avgDuration = count ? totalDuration / count : 0;
        for (var i in items) {
            if (!items.hasOwnProperty(i)) {
                continue;
            }
            height = defaultHeight * (avgDuration ? items[i].sound.duration / avgDuration : 1);
            if (height < minHeight) {
                height = minHeight;
            }
            items[i].div.height(
                height
            );
        }
    }

    function togglePlay() {
        var button = $(this);

        if (playing) {
            soundManager.pauseAll();
            playing = false;
            button.html('<i class="fa fa-play"></i> Play');
            return;
        }

        // Loop through each sound finding the playing position.
        $('.player').each(function (column) {
            var offset = 0,
                currentSound,
                position = Math.max.apply(null, positions) || 0;
            $(this).find('.player-item').each (function () {
                var item = items[$(this).attr('id')];
                if (offset + item.sound.duration > position) {
                    currentSound = item;
                    item.offset = offset;
                    item.sound.setPosition(position - offset);
                    item.sound.play();
                    playing = true;
                    return false;
                }
                offset += item.sound.duration;
            });
        });

        if (playing) {
            button.html('<i class="fa fa-pause"></i> Pause');
        }
    }

    function onAllLoaded() {
        setHeights();
        $('.players').addClass('loaded');
    }

    function onReady() {
        var players = $('.players').find('.player');
        for (var i in settings.sounds) {
            var column = players.eq(settings.sounds[i].column);
            column.append(
                $("<div class='player-item'>")
                    .text(settings.sounds[i].name)
                    .append("<div class='timing'><span class='position'>0:00</span> / <span class='duration'></span></span>")
                    .attr('id', settings.sounds[i].id)
            );
            createItem(
                settings.sounds[i].id,
                settings.sounds[i].url,
                column.find('#' + settings.sounds[i].id),
                settings.sounds[i].column,
                soundManager
            );
        }

        players.append('<div class="position-marker"></div>');

        var controls = $('.controls');
        controls.html('<button class="play-pause"><i class="fa fa-play"></i> Play</button>');
        var playPause = controls.find('.play-pause');
        playPause.click(togglePlay);

        players.sortable({
          axis: "y",
          "stop": function(event, ui) {
            if (playing) {
                soundManager.pauseAll();
                playing = false;
                togglePlay();
            }
          }
        });
    }

    soundManager.setup({
        url: "node_modules/soundmanager2/swf",
        preferFlash: false,
        debugMode: false
    });

    $(document).ready(function () {
        soundManager.onready(onReady);
    });

})(jQuery, soundManager, settings);
