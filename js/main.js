(function ($, soundManager, settings) {
    "use strict";

    var state = {
        items: {},
        runAllLoaded: false,
        playing: false,
        positions: [],
        playPauseButton: $()
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
     * Create an 'item': a sound and its visual representation.
     *
     * @param id
     *   The unique ID of the item. This is also the ID of the HTML element and
     *   of the Sound Manager 2 sound object.
     * @param url
     *   The URL of the sound file.
     * @param div
     *   The HTML div element representing the sound.
     * @param column
     *   An integer representing the column where the item is placed (0 being
     *   the left-most column).
     */
    function createItem(id, url, div, column) {
        var data = {
            durationOffset: 0,
            div: div,
            loaded: false,
            column: column
        };
        // See http://www.schillmania.com/projects/soundmanager2/doc/
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
                if (state.playing) {
                    var next = div.next('.player-item');
                    if (next.length) {
                        var nextSound = state.items[next.attr('id')].sound;
                        nextSound.setPosition(0);
                        nextSound.play();
                    }
                    else {
                        checkAllFinished();
                    }
                }
            },
            whileplaying: function () {
                var item = state.items[this.id];
                state.positions[item.column] = item.durationOffset + this.position;
                item.div.find('.position').text(formatTime(this.position) + ' / ');
                setPlayPosition(item);
            }
        });
        state.items[id] = data;
    }

    /**
     * Set the position marker of an item to its current playing position.
     */
    function setPlayPosition(item) {
        var itemHeight = item.div.height(),
            positionFraction = item.sound.position / item.sound.duration,
            playOffset = itemHeight * positionFraction;

        item.div.find('.position-marker').css('top', playOffset);
    }

    /**
     * Set the heights of all items in proportion with their durations.
     */
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

    /**
     * Play or pause.
     */
    function togglePlay() {
        state.playing ? pause() : play();
    }

    /**
     * Pause all sounds.
     */
    function pause() {
        soundManager.pauseAll();
        state.playing = false;
        state.playPauseButton.html('<i class="fa fa-play"></i> Play');
    }

    /**
     * Play all sounds in all columns matching state.positions.
     *
     * If already playing, calling this function will ensure sounds are played
     * according to their current positions (e.g. if sounds have been moved).
     */
    function play() {
        // Use the maximum of the known playing positions.
        var position = Math.max.apply(null, state.positions) || 0;

        // Pause other tracks, if necessary, before playing new tracks.
        if (state.playing) {
            soundManager.pauseAll();
        }

        var foundSound = false;
        $('.player').each(function () {
            var durationOffset = 0,
                currentSound;

            $(this).find('.player-item').each(function () {
                var item = state.items[$(this).attr('id')];
                if (durationOffset + item.sound.duration > position) {
                    currentSound = item;
                    item.durationOffset = durationOffset;
                    item.sound.setPosition(position - durationOffset);
                    item.sound.play();
                    state.playing = true;
                    foundSound = true;
                    return false;
                }
                durationOffset += item.sound.duration;
            });
        });

        if (!foundSound) {
            stop();
        }
        else if (state.playing) {
            state.playPauseButton.html('<i class="fa fa-pause"></i> Pause');
        }
    }

    function onAllLoaded() {
        setHeights();
        $('.player-item').removeClass('loading');
        $('#loading').remove();
    }

    function checkAllFinished() {
        var allFinished = true;
        $('.player').each(function () {
            var durationOffset = 0;
            var position = Math.max.apply(null, state.positions) || 0;

            $(this).find('.player-item').each(function () {
                var item = state.items[$(this).attr('id')];
                if (durationOffset + item.sound.duration > position) {
                    allFinished = false;
                }
                durationOffset += item.sound.duration;
            });
        });
        if (allFinished) {
            stop();
        }
    }

    /**
     * Stop all sounds, and reset the positions of all columns to 0.
     */
    function stop() {
        soundManager.stopAll();
        state.playing = false;
        state.playPauseButton.html('<i class="fa fa-play"></i> Play');
        $('.position-marker').css('top', 0);
        for (var i in state.positions) {
            if (state.positions.hasOwnProperty(i)) {
                state.positions[i] = 0;
            }
        }
    }

    var ffMuteTimeout;
    /**
     * Fast forward or rewind all columns.
     *
     * @param interval
     *   The time interval by which to move forward, as an integer in
     *   milliseconds (this can be negative). Defaults to 1000.
     */
    function fastForward(interval) {
        interval = interval || 1000;
        if (state.playing) {
            soundManager.muteAll();
            if (typeof ffMuteTimeout !== "undefined") {
                clearTimeout(ffMuteTimeout);
            }
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
            play();
            ffMuteTimeout = setTimeout(soundManager.unmuteAll, 500);
        }
    }

    var ffTimeout;
    /**
     * Turn a jQuery element representing a button into a fast-forward button.
     *
     * Fast-forward will continue while the mouse is held down.
     *
     * @param $button
     * @param interval
     */
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

    /**
     * React after the page is fully loaded.
     */
    function onReady() {
        var players = $('.players').find('.player'),
            column;
        for (var i in settings.sounds) {
            if (!settings.sounds.hasOwnProperty(i)) {
                continue;
            }
            column = players.eq(settings.sounds[i].column);
            column.append(
                $("<div class='player-item loading'>")
                    .html('<span class="title">' + settings.sounds[i].name + '</span>')
                    .prepend("<div class='timing'><span class='position'>0:00 / </span><span class='duration'>0:00</span></span>")
                    .prepend("<div class='handle'><i class='fa fa-sort'></i></div>")
                    .attr('id', settings.sounds[i].id)
            );
            createItem(
                settings.sounds[i].id,
                settings.sounds[i].url,
                column.find('#' + settings.sounds[i].id),
                settings.sounds[i].column
            );
        }

        $('.player-item').append('<div class="position-marker"><i class="fa fa-long-arrow-right"></i></div>');

        setupFfListener($('.fast-forward'), 5000);
        setupFfListener($('.rewind'), -5000);
        state.playPauseButton = $('.play-pause');
        state.playPauseButton.click(togglePlay);

        players.sortable({
            axis: "y",
            handle: ".handle",
            items: '.player-item',
            placeholder: "placeholder",
            forcePlaceholderSize: true,
            "stop": function () {
                if (state.playing) {
                    play();
                }
            }
        });
    }

    // Set up Sound Manager 2.
    soundManager.setup({
        url: "/node_modules/soundmanager2/swf",
        preferFlash: false,
        debugMode: false
    });

    /**
     * React when the page has been fully loaded.
     */
    $(document).ready(function () {
        $('body').append('<div class="dialog" id="loading">Loading...</div>');

        soundManager.onready(onReady);

        // Set up keyboard shortcuts.
        $(document).keydown(function (e) {
            // The space bar will pause or resume playing.
            if (e.which === 32) {
                togglePlay();
                return false;
            }
            // The right and left arrow keys will fast-forward and rewind.
            else if (e.which === 39 || e.which === 37) {
                fastForward(e.which === 39 ? 1000 : -1000);
                return false;
            }
        });
    });

})(jQuery, soundManager, settings);
