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
            if (items.hasOwnProperty(i) && !items[i].loaded) {
                return;
            }
        }
        if (!runAllLoaded) {
            onAllLoaded();
        }
        return true;
    }

    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
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
            durationOffset: 0,
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
                    items[this.id].div
                        .find('.duration')
                        .text(formatTime(this.duration));
                }
                items[this.id].loaded = true;
                checkAllLoaded();
            },
            onplay: function () {
                items[this.id].div.addClass('playing');
            },
            onresume: function () {
                items[this.id].div.addClass('playing');
            },
            onpause: function () {
                items[this.id].div.removeClass('playing');
            },
            onfinish: function () {
                var div = items[this.id].div;
                div.removeClass('playing');
                // If we are still playing, find the next item and play it.
                if (playing) {
                    var next = div.next('.player-item');
                    if (next.length) {
                        var nextSound = items[next.attr('id')].sound;
                        nextSound.setPosition(0);
                        nextSound.play();
                    }
                }
            },
            whileplaying: function () {
                var item = items[this.id];
                positions[item.column] = item.durationOffset + this.position;
                item.div.find('.position').text(formatTime(this.position));
                setPlayPosition(item);
            }
        });
        items[id] = data;
    }

    function calculatePlayOffset(item) {
        var itemHeight = item.div.height(),
            positionFraction = item.sound.position / item.sound.duration;

        return itemHeight * positionFraction;
    }

    function setPlayPosition(item) {
        item.div.find('.position-marker').css('top', calculatePlayOffset(item));
    }

    function setHeights() {
        var avgDuration = 0,
            defaultHeight = 200,
            minHeight = 10,
            height,
            count = 0;
        for (var i in items) {
            if (items.hasOwnProperty(i)) {
                ++count;
                totalDuration += items[i].sound.duration;
            }
        }
        avgDuration = count ? totalDuration / count : 0;
        for (i in items) {
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
        var button = $('.play-pause');

        if (playing) {
            soundManager.pauseAll();
            playing = false;
            button.html('<i class="fa fa-play"></i> Play');
            return;
        }

        // Loop through each sound finding the playing position.
        $('.player').each(function () {
            var durationOffset = 0,
                currentSound;

            // Use the maximum of the known playing positions.
            var position = Math.max.apply(null, positions) || 0;

            $(this).find('.player-item').each(function () {
                var item = items[$(this).attr('id')];
                if (durationOffset + item.sound.duration > position) {
                    currentSound = item;
                    item.durationOffset = durationOffset;
                    item.sound.setPosition(position - durationOffset);
                    item.sound.play();
                    playing = true;
                    return false;
                }
                durationOffset += item.sound.duration;
            });
        });

        if (playing) {
            button.html('<i class="fa fa-pause"></i> Pause');
        }
    }

    function playFromCurrentPosition() {
        soundManager.pauseAll();
        playing = false;
        togglePlay();
    }

    function onAllLoaded() {
        setHeights();
        $('.player-item').removeClass('loading');
        $('.players').removeClass('loading');
    }

    var ffMuteTimeout;
    function fastForward(ms) {
        ms = ms || 1000;
        if (playing) {
            if (typeof ffMuteTimeout !== "undefined") {
                clearTimeout(ffMuteTimeout);
            }
            soundManager.muteAll();
            for (var i in positions) {
                if (positions.hasOwnProperty(i)) {
                    if (positions[i] + ms <= 0) {
                        positions[1] = 0;
                    }
                    else {
                        positions[i] += ms;
                    }
                }
            }
            playFromCurrentPosition();
            ffMuteTimeout = setTimeout(soundManager.unmuteAll, 300);
        }
    }

    function onReady() {
        var players = $('.players').find('.player'),
            column;
        for (var i in settings.sounds) {
            column = players.eq(settings.sounds[i].column);
            column.append(
                $("<div class='player-item'>")
                    .text(settings.sounds[i].name)
                    .append("<div class='timing'><span class='position'>0:00</span> / <span class='duration'>0:00</span></span>")
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

        $('.player-item').append('<div class="position-marker"><i class="fa fa-long-arrow-right"></i></div>');

        var controls = $('.controls');
        controls.html(
            '<button class="play-pause"><i class="fa fa-play"></i> Play</button>'
            + ' <button class="rewind" title="Rewind"><i class="fa fa-fast-backward"></i></button>'
            + ' <button class="fast-forward" title="Fast forward"><i class="fa fa-fast-forward"></i></button>'
        );
        $('.fast-forward').click(function () {
            fastForward(5000);
        });
        $('.rewind').click(function () {
            fastForward(-5000);
        });
        $('.play-pause').click(togglePlay);

        players.sortable({
            axis: "y",
            "stop": function () {
                if (playing) {
                    playFromCurrentPosition();
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

        $(document).keydown(function (e) {
            if (e.which === 32) {
                togglePlay();
                return false;
            }
            else if (e.which === 39 || e.which === 37) {
                if (playing) {
                    fastForward(e.which === 39 ? 1000 : -1000);
                    return false;
                }
            }
        });
    });

})(jQuery, soundManager, settings);
