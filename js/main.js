(function ($, soundManager, settings) {
	"use strict";

	var sounds = [],
		runAllLoaded = false,
		totalDuration = 0,
		playing = false,
		position = 0;

	function checkAllLoaded() {
		if (settings.sounds.length > sounds.length) {
			return;
		}
		for (var i in sounds) {
			if (!sounds[i].loaded) {
				return;
			}
		}
		runAllLoaded || onAllLoaded();
		return true;
	}

	/**
	 * @see http://www.schillmania.com/projects/soundmanager2/doc/
	 */
	function createSound(id, url, item, column, soundManager) {
		var data = {};
		data.item = item;
		data.loaded = false;
		data.column = column;
		data.sound = soundManager.createSound({
			id: id,
			url: url,
			autoLoad: true,
			onload: function () {
				item.removeClass('loading');
				item.data('duration', this.duration);
				data.loaded = true;
				checkAllLoaded();
			},
			onplay: function () {
				item.addClass('playing');	
			},
			onresume: function () {
				item.addClass('playing');
			},
			onpause: function () {
				item.removeClass('playing');	
			},
			onfinish: function () {
				item.removeClass('playing');	
			}
		});
		sounds.push(data);
	}

	function setHeights() {
		var avgDuration = 0,
			ratio = 1,
			defaultHeight = 60,
			minHeight = 30,
			height;
		for (var i in sounds) {
			totalDuration += sounds[i].sound.duration;
		}
		avgDuration = sounds.length ? totalDuration / sounds.length : 0;
		for (var i in sounds) {
			height = defaultHeight * (avgDuration ? sounds[i].sound.duration / avgDuration : 1);
			if (height < minHeight) {
				height = minHeight;
			}
			sounds[i].item.height(
				height
			);
		}
	}

	function togglePlay() {
		// Loop through each sound finding the playing position.
	}

	function onAllLoaded() {
		setHeights();

	}

	function onReady() {
		var players = $('.players').find('.player');
		for (var i in settings.sounds) {
			var column = players.eq(settings.sounds[i].column);
			column.append(
				$("<div class='player-item loading'>")
					.text(settings.sounds[i].name)
					.attr('id', settings.sounds[i].id)
			);
			var item = column.find('#' + settings.sounds[i].id);
			createSound(
				settings.sounds[i].id,
				settings.sounds[i].url,
				item,
				settings.sounds[i].column,
				soundManager
			);
		}

		var controls = $('.controls');
		controls.find('.play-pause').click(togglePlay);
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
