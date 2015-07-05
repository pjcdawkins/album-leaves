(function ($, soundManager, settings) {
    "use strict";

    var state = {
        items: {},
        runAllLoaded: false,
        playing: false,
        positions: []
    };

    function checkAllLoaded() {
        if (settings.sounds.length > state.items.length) {
            return;
        }
        for (var i in state.items) {
            if (state.items.hasOwnProperty(i) && !state.items[i].loaded) {
                return;
            }
        }
        if (!state.runAllLoaded) {
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
                    state.items[this.id].div
                        .find('.duration')
                        .text(formatTime(this.duration));
                }
                state.items[this.id].loaded = true;
                checkAllLoaded();
            },
            onplay: function () {
                state.items[this.id].div.addClass('playing');
            },
            onresume: function () {
                state.items[this.id].div.addClass('playing');
            },
            onpause: function () {
                state.items[this.id].div.removeClass('playing');
            },
            onfinish: function () {
                var div = state.items[this.id].div;
                div.removeClass('playing');
                // If we are still playing, find the next item and play it.
                if (playing) {
                    var next = div.next('.player-item');
                    if (next.length) {
                        var nextSound = state.items[next.attr('id')].sound;
                        nextSound.setPosition(0);
                        nextSound.play();
                    }
                }
            },
            whileplaying: function () {
                var item = state.items[this.id];
                state.positions[item.column] = item.durationOffset + this.position;
                item.div.find('.position').text(formatTime(this.position));
                setPlayPosition(item);
            }
        });
        state.items[id] = data;
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
        var heightMultiplier = 1, // pixels per second
            minHeight = 10,
            height;
        for (var i in state.items) {
            if (!state.items.hasOwnProperty(i)) {
                continue;
            }
            height = heightMultiplier * state.items[i].sound.duration / 1000;
            if (height < minHeight) {
                height = minHeight;
            }
            state.items[i].div.height(
                height
            );
        }
    }

    function togglePlay() {
        var button = $('.play-pause');

        if (state.playing) {
            soundManager.pauseAll();
            state.playing = false;
            button.html('<i class="fa fa-play"></i> Play');
            return;
        }

        // Loop through each sound finding the playing position.
        $('.player').each(function () {
            var durationOffset = 0,
                currentSound;

            // Use the maximum of the known playing positions.
            var position = Math.max.apply(null, state.positions) || 0;

            $(this).find('.player-item').each(function () {
                var item = state.items[$(this).attr('id')];
                if (durationOffset + item.sound.duration > position) {
                    currentSound = item;
                    item.durationOffset = durationOffset;
                    item.sound.setPosition(position - durationOffset);
                    item.sound.play();
                    state.playing = true;
                    return false;
                }
                durationOffset += item.sound.duration;
            });
        });

        if (state.playing) {
            button.html('<i class="fa fa-pause"></i> Pause');
        }
    }

    function playFromCurrentPosition() {
        soundManager.pauseAll();
        state.playing = false;
        togglePlay();
    }

    function onAllLoaded() {
        setHeights();
        $('.player-item').removeClass('loading');
        $('.players').removeClass('loading');
    }

    var ffMuteTimeout;
    function fastForward(interval) {
        interval = interval || 1000;
        if (state.playing) {
            if (typeof ffMuteTimeout !== "undefined") {
                clearTimeout(ffMuteTimeout);
            }
            soundManager.muteAll();
            for (var i in state.positions) {
                if (state.positions.hasOwnProperty(i)) {
                    if (state.positions[i] + interval <= 0) {
                        state.positions[i] = 0;
                    }
                    else {
                        state.positions[i] += interval;
                    }
                }
            }
            playFromCurrentPosition();
            ffMuteTimeout = setTimeout(soundManager.unmuteAll, 300);
        }
    }

    var ffTimeout;
    function setupFfListener($button, interval) {
        $button.mousedown(function() {
            ffTimeout = setInterval(function () {
                fastForward(interval);
            }, 100);
        }).on("mouseout mouseup", function() {
            clearInterval(ffTimeout);
        }).click(function() {
            clearInterval(ffTimeout);
            fastForward(interval);
        });
    }

    function onReady() {
        var players = $('.players').find('.player'),
            column;
        for (var i in settings.sounds) {
            column = players.eq(settings.sounds[i].column);
            column.append(
                $("<div class='player-item'>")
                    .text(settings.sounds[i].name)
                    .prepend("<div class='timing'><span class='position'>0:00</span> / <span class='duration'>0:00</span></span>")
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

        setupFfListener($('.fast-forward'), 5000);
        setupFfListener($('.rewind'), -5000);
        $('.play-pause').click(togglePlay);

        players.sortable({
            axis: "y",
            placeholder: "placeholder",
            forcePlaceholderSize: true,
            "stop": function () {
                if (playing) {
                    playFromCurrentPosition();
                }
            }
        });
    }

    soundManager.setup({
        url: "/node_modules/soundmanager2/swf",
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
                fastForward(e.which === 39 ? 1000 : -1000);
                return false;
            }
        });
    });

})(jQuery, soundManager, settings);
