define([
  'core/js/adapt',
  'core/js/views/componentView',
  'core/js/models/componentModel',
  'libraries/mediaelement-and-player',
  'libraries/mediaelement-fullscreen-hook'
], function(Adapt, ComponentView, ComponentModel) {

  var froogaloopAdded = false;
  

  // The following function is used to to prevent a memory leak in Internet Explorer
  // See: http://javascript.crockford.com/memory/leak.html
  function purge(d) {
    var a = d.attributes, i, l, n;
    if (a) {
      for (i = a.length - 1; i >= 0; i -= 1) {
        n = a[i].name;
        if (typeof d[n] === 'function') {
          d[n] = null;
        }
      }
    }
    a = d.childNodes;
    if (a) {
      l = a.length;
      for (i = 0; i < l; i += 1) {
        purge(d.childNodes[i]);
      }
    }
  }

  /*
   * Default shortcut keys trap a screen reader user inside the player once in focus. These keys are unnecessary
   * as one may traverse the player in a linear fashion without needing to know or use shortcut keys. Below is
   * the removal of the default shortcut keys.
   *
   * The default seek interval functions are passed two different data types from mejs which they handle incorrectly. One
   * is a duration integer the other is the player object. The default functions error on slider key press and so break
   * accessibility. Below is a correction.
   */
  _.extend(mejs.MepDefaults, {
    keyActions: [],
    defaultSeekForwardInterval: function(duration) {
      if (typeof duration === "object") return duration.duration*0.05;
      return duration*0.05;
    },
    defaultSeekBackwardInterval: function(duration) {
      if (typeof duration === "object") return duration.duration*0.05;
      return duration*0.05;
    }
  });

  var MediaView = ComponentView.extend({

    events: {
      "click .js-media-inline-transcript-toggle": "onToggleInlineTranscript",
      "click .js-media-external-transcript-click": "onExternalTranscriptClicked",
      "click .js-skip-to-transcript": "onSkipToTranscript",
      "click .js-media-described-toggle": "onToggleDescriptive",
      "keyup .js-media-described-toggle": "onToggleDescriptiveSR"
    },

    _mediaElement: null,
    _trackSrc: null,

    onToggleDescriptiveSR: function(event) {
      if (event.which !== 13) return;
      //<ENTER> keypress
      document.getElementById("descCheck").checked = !document.getElementById("descCheck").checked;
      this.onToggleDescriptive(event);
    },

    onToggleDescriptive: function () {

      var descOn = document.getElementById("descCheck").checked;
      //console.log(descOn);
      
      if(descOn) {
        if(this._trackSrc === null) {
          this._trackSrc = this._mediaElement.player.selectedTrack ? this._mediaElement.player.selectedTrack.srclang : 'none';
        }
        vidFile = this.model.get('_media').mp4descrptive;
        this.$('.mejs-captions-button').removeClass('mejs-captions-enabled');
        this.$('.mejs-captions-button').find('button').prop("disabled", true);
        this._mediaElement.player.setTrack('none');

        this.$('.js-media-described-toggle').attr('aria-label', "Audio Described version: on");
      } else {
        vidFile = this.model.get('_media').mp4;
        this.$('.mejs-captions-button').addClass('mejs-captions-enabled');
        this.$('.mejs-captions-button').find('button').prop("disabled", false);
        this._mediaElement.player.setTrack(this._trackSrc);

        this.$('.js-media-described-toggle').attr('aria-label', "Audio Described version: off");
        //console.log(this._trackSrc);
      }

      //console.log(vidFile);
      this.$("#videoPlayer").attr("src", vidFile);

      //this.$("#videoPlayer").load();
    },


    className: function() {
      var classes = ComponentView.prototype.className.call(this);
      var playerOptions = this.model.get('_playerOptions');
      if (playerOptions && playerOptions.toggleCaptionsButtonWhenOnlyOne) {
        classes += " toggle-captions";
      }
      return classes;
    },

    preRender: function() {
      this.listenTo(Adapt, {
        'device:resize': this.onScreenSizeChanged,
        'device:changed': this.onDeviceChanged,
        'media:stop': this.onMediaStop
      });

      _.bindAll(this, 'onMediaElementPlay', 'onMediaElementPause', 'onMediaElementEnded', 'onMediaElementTimeUpdate', 'onMediaElementSeeking');

      // set initial player state attributes
      this.model.set({
        '_isMediaEnded': false,
        '_isMediaPlaying': false
      });

      if (this.model.get('_media').source) {
        var media = this.model.get('_media');

        // Avoid loading of Mixed Content (insecure content on a secure page)
        if (window.location.protocol === 'https:' && media.source.indexOf('http:') === 0) {
          media.source = media.source.replace(/^http\:/, 'https:');
        }

        this.model.set('_media', media);
      }

      this.checkIfResetOnRevisit();
    },

    postRender: function() {
      this.setupPlayer();
      this.addMejsButtonClass();
    },

    addMejsButtonClass: function() {
      this.$('.mejs-overlay-button').addClass('icon');
    },

    setupPlayer: function() {
      if (!this.model.get('_playerOptions')) this.model.set('_playerOptions', {});

      var modelOptions = this.model.get('_playerOptions');

      if (modelOptions.pluginPath === undefined) {
        // on the off-chance anyone still needs to use the Flash-based player...
        _.extend(modelOptions, {
          pluginPath: 'https://cdnjs.cloudflare.com/ajax/libs/mediaelement/2.21.2/',
          flashName: 'flashmediaelement-cdn.swf',
          flashScriptAccess: 'always'
        });
      }

      if (modelOptions.features === undefined) {
        modelOptions.features = ['playpause','progress','current','duration'];
        if (this.model.get('_useClosedCaptions')) {
          modelOptions.features.unshift('tracks');
        }
        if (this.model.get("_allowFullScreen")) {
          modelOptions.features.push('fullscreen');
        }
        if (this.model.get('_showVolumeControl')) {
          modelOptions.features.push('volume');
        }
      }

      /*
      Unless we are on Android/iOS and using native controls, when MediaElementJS initializes the player
      it will invoke the success callback prior to performing one last call to setPlayerSize.
      This call to setPlayerSize is deferred by 50ms so we add a delay of 100ms here to ensure that
      we don't invoke setReadyStatus until the player is definitely finished rendering.
      */
      modelOptions.success = _.debounce(this.onPlayerReady.bind(this), 100);

      if (this.model.get('_useClosedCaptions')) {
        var startLanguage = this.model.get('_startLanguage') || 'en';
        if (!Adapt.offlineStorage.get('captions')) {
          Adapt.offlineStorage.set('captions', startLanguage);
        }
        modelOptions.startLanguage = this.checkForSupportedCCLanguage(Adapt.offlineStorage.get('captions'));
      }

      if (modelOptions.alwaysShowControls === undefined) {
        modelOptions.alwaysShowControls = false;
      }
      if (modelOptions.hideVideoControlsOnLoad === undefined) {
        modelOptions.hideVideoControlsOnLoad = true;
      }

      this.addMediaTypeClass();

      this.addThirdPartyFixes(modelOptions, function createPlayer() {
        // create the player
        this.$('audio, video').mediaelementplayer(modelOptions);
        this.cleanUpPlayer();

        var _media = this.model.get('_media');
        // if no media is selected - set ready now, as success won't be called
        if (!_media.mp3 && !_media.mp4 && !_media.ogv && !_media.webm && !_media.source) {
          Adapt.log.warn("ERROR! No media is selected in components.json for component " + this.model.get('_id'));
          this.setReadyStatus();
          return;
        }
        // Check if we're streaming
        if (_media.source) {
          this.$('.media-widget').addClass('external-source');
        }
      }.bind(this));
    },

    addMediaTypeClass: function() {
      var media = this.model.get("_media");
      if (media && media.type) {
        var typeClass = media.type.replace(/\//, "-");
        this.$(".media__widget").addClass(typeClass);
      }
    },

    addThirdPartyFixes: function(modelOptions, callback) {
      var media = this.model.get("_media");
      if (!media) return callback();

      switch (media.type) {
        case "video/vimeo":
          modelOptions.alwaysShowControls = false;
          modelOptions.hideVideoControlsOnLoad = true;
          modelOptions.features = [];
          if (froogaloopAdded) return callback();
          $.getScript("assets/froogaloop.js")
              .done(function() {
                froogaloopAdded = true;
                callback();
              })
              .fail(function() {
                froogaloopAdded = false;
                console.log('Could not load froogaloop.js');
              });
          break;
        default:
          callback();
      }
    },

      cleanUpPlayer: function() {
        this.$('.media__widget').children('.mejs-offscreen').remove();
        this.$('[role=application]').removeAttr('role tabindex');
        this.$('[aria-controls]').removeAttr('aria-controls');
      },

      setupEventListeners: function() {
        this.completionEvent = (this.model.get('_setCompletionOn') || 'play');

        if (this.completionEvent === 'inview') {
          this.setupInviewCompletion('.component__widget');
        }

        // wrapper to check if preventForwardScrubbing is turned on.
        if ((this.model.get('_preventForwardScrubbing')) && (!this.model.get('_isComplete'))) {
          $(this.mediaElement).on({
            'seeking': this.onMediaElementSeeking,
            'timeupdate': this.onMediaElementTimeUpdate
          });
        }

        // handle other completion events in the event Listeners
        $(this.mediaElement).on({
          'play': this.onMediaElementPlay,
          'pause': this.onMediaElementPause,
          'ended': this.onMediaElementEnded
        });

        // occasionally the mejs code triggers a click of the captions language
        // selector during setup, this slight delay ensures we skip that
        _.delay(this.listenForCaptionsChange.bind(this), 250);
      },

      /**
       * Sets up the component to detect when the user has changed the captions so that it can store the user's
       * choice in offlineStorage and notify other media components on the same page of the change
       * Also sets the component up to listen for this event from other media components on the same page
       */
      listenForCaptionsChange: function() {
        if(!this.model.get('_useClosedCaptions')) return;

        var selector = this.model.get('_playerOptions').toggleCaptionsButtonWhenOnlyOne ?
          '.mejs-captions-button button' :
          '.mejs-captions-selector';

        this.$(selector).on('click.mediaCaptionsChange', _.debounce(function() {
          var srclang = this.mediaElement.player.selectedTrack ? this.mediaElement.player.selectedTrack.srclang : 'none';
          Adapt.offlineStorage.set('captions', srclang);
          Adapt.trigger('media:captionsChange', this, srclang);
        }.bind(this), 250)); // needs debouncing because the click event fires twice

        this.listenTo(Adapt, 'media:captionsChange', this.onCaptionsChanged);
      },

      /**
       * Handles updating the captions in this instance when learner changes captions in another
       * media component on the same page
       * @param {Backbone.View} view The view instance that triggered the event
       * @param {string} lang The captions language the learner chose in the other media component
       */
      onCaptionsChanged: function(view, lang) {
        if (view && view.cid === this.cid) return; //ignore the event if we triggered it

        lang = this.checkForSupportedCCLanguage(lang);

        this.mediaElement.player.setTrack(lang);

        // because calling player.setTrack doesn't update the cc button's languages popup...
        var $inputs = this.$('.mejs-captions-selector input');
        $inputs.filter(':checked').prop('checked', false);
        $inputs.filter('[value="' + lang + '"]').prop('checked', true);
      },

      /**
       * When the learner selects a captions language in another media component, that language may not be available
       * in this instance, in which case default to the `_startLanguage` if that's set - or "none" if it's not
       * @param {string} lang The language we're being asked to switch to e.g. "de"
       * @return {string} The language we're actually going to switch to - or "none" if there's no good match
       */
      checkForSupportedCCLanguage: function (lang) {
        if (!lang || lang === 'none') return 'none';

        if(_.findWhere(this.model.get('_media').cc, {srclang: lang})) return lang;

        return this.model.get('_startLanguage') || 'none';
      },

      onMediaElementPlay: function(event) {
        this.queueGlobalEvent('play');

        Adapt.trigger("media:stop", this);
        Adapt.trigger('audio:stop');

        if (this.model.get('_pauseWhenOffScreen')) $(this.mediaElement).on('inview', this.onMediaElementInview);

        this.model.set({
          '_isMediaPlaying': true,
          '_isMediaEnded': false
        });

        if (this.completionEvent === 'play') {
          this.setCompletionStatus();
        }
      },

      onMediaElementPause: function(event) {
        this.queueGlobalEvent('pause');

        $(this.mediaElement).off('inview', this.onMediaElementInview);

        this.model.set('_isMediaPlaying', false);
      },

      onMediaElementEnded: function(event) {
        this.queueGlobalEvent('ended');

        this.model.set('_isMediaEnded', true);

        if (this.completionEvent === 'ended') {
          this.setCompletionStatus();
        }
      },

      onMediaElementInview: function(event, isInView) {
        if (!isInView && !event.currentTarget.paused) event.currentTarget.pause();
      },

      onMediaElementSeeking: function(event) {
        var maxViewed = this.model.get("_maxViewed");
        if(!maxViewed) {
          maxViewed = 0;
        }
        if (event.target.currentTime > maxViewed) {
          event.target.currentTime = maxViewed;
        }
      },

      onMediaElementTimeUpdate: function(event) {
        var maxViewed = this.model.get("_maxViewed");
        if (!maxViewed) {
          maxViewed = 0;
        }
        if (event.target.currentTime > maxViewed) {
          this.model.set("_maxViewed", event.target.currentTime);
        }
      },

      // Overrides the default play/pause functionality to stop accidental playing on touch devices
      setupPlayPauseToggle: function() {
        // bit sneaky, but we don't have a this.mediaElement.player ref on iOS devices
        var player = this.mediaElement.player;

        if (!player) {
          console.log("Media.setupPlayPauseToggle: OOPS! there's no player reference.");
          return;
        }

        // stop the player dealing with this, we'll do it ourselves
        player.options.clickToPlayPause = false;

        this.onOverlayClick = this.onOverlayClick.bind(this);
        this.onMediaElementClick = this.onMediaElementClick.bind(this);

        // play on 'big button' click
        this.$('.mejs-overlay-button').on("click", this.onOverlayClick);

        // pause on player click
        this.$('.mejs-mediaelement').on("click", this.onMediaElementClick);
      },

      onMediaStop: function(view) {

        // Make sure this view isn't triggering media:stop
        if (view && view.cid === this.cid) return;

        if (!this.mediaElement || !this.mediaElement.player) return;

        this.mediaElement.player.pause();

      },

      onOverlayClick: function() {
        var player = this.mediaElement.player;
        if (!player) return;

        player.play();
      },

      onMediaElementClick: function(event) {
        var player = this.mediaElement.player;
        if (!player) return;

        var isPaused = player.media.paused;
        if(!isPaused) player.pause();
      },

      checkIfResetOnRevisit: function() {
        var isResetOnRevisit = this.model.get('_isResetOnRevisit');

        if (isResetOnRevisit) {
          this.model.reset(isResetOnRevisit);
        }
      },

      remove: function() {
        this.$('.mejs-overlay-button').off("click", this.onOverlayClick);
        this.$('.mejs-mediaelement').off("click", this.onMediaElementClick);

        if(this.model.get('_useClosedCaptions')) {
          var selector = this.model.get('_playerOptions').toggleCaptionsButtonWhenOnlyOne ?
          '.mejs-captions-button button' :
          '.mejs-captions-selector';
          this.$(selector).off('click.mediaCaptionsChange');
        }

        var modelOptions = this.model.get('_playerOptions');
        delete modelOptions.success;

        var media = this.model.get("_media");
        if (media) {
          switch (media.type) {
          case "video/vimeo":
              this.$("iframe")[0].isRemoved = true;
          }
        }

        if (this.mediaElement && this.mediaElement.player) {
          var player_id = this.mediaElement.player.id;

          purge(this.$el[0]);
          this.mediaElement.player.remove();

          if (mejs.players[player_id]) {
              delete mejs.players[player_id];
          }
        }

        if (this.mediaElement) {
          $(this.mediaElement).off({
            'play': this.onMediaElementPlay,
            'pause': this.onMediaElementPause,
            'ended': this.onMediaElementEnded,
            'seeking': this.onMediaElementSeeking,
            'timeupdate': this.onMediaElementTimeUpdate,
            'inview': this.onMediaElementInview
          });

          this.mediaElement.src = "";
          $(this.mediaElement.pluginElement).remove();
          delete this.mediaElement;
        }

        ComponentView.prototype.remove.call(this);
      },

      onDeviceChanged: function() {
        if (this.model.get('_media').source) {
          this.$('.mejs-container').width(this.$('.component__widget').width());
        }
      },

      onPlayerReady: function (mediaElement, domObject) {
        this.mediaElement = mediaElement;
        this._mediaElement = mediaElement;

        var player = this.mediaElement.player;
        if (!player) player = mejs.players[this.$('.mejs-container').attr('id')];

        var hasTouch = mejs.MediaFeatures.hasTouch;
        if (hasTouch) {
          this.setupPlayPauseToggle();
        }

        this.addThirdPartyAfterFixes();
        this.cleanUpPlayerAfter();

        if (player && this.model.has('_startVolume')) {
          // Setting the start volume only works with the Flash-based player if you do it here rather than in setupPlayer
          player.setVolume(parseInt(this.model.get('_startVolume')) / 100);
        }

        this.setReadyStatus();
        this.setupEventListeners();
      },

      addThirdPartyAfterFixes: function() {
        var media = this.model.get("_media");
        switch (media.type) {
        case "video/vimeo":
          this.$(".mejs-container").attr("tabindex", 0);
        }
      },

      cleanUpPlayerAfter: function() {
        this.$("[aria-valuemax='NaN']").attr("aria-valuemax", 0);
      },

      onScreenSizeChanged: function() {
        this.$('audio, video').width(this.$('.component__widget').width());
      },

      onSkipToTranscript: function() {
        // need slight delay before focussing button to make it work when JAWS is running
        // see https://github.com/adaptlearning/adapt_framework/issues/2427
        _.delay(function() {
          this.$('.media__transcript-btn').a11y_focus();
        }.bind(this), 250);
      },

      onToggleInlineTranscript: function(event) {
        if (event) event.preventDefault();
        var $transcriptBodyContainer = this.$(".media__transcript-body-inline");
        var $button = this.$(".media__transcript-btn-inline");
        var $buttonText = this.$(".media__transcript-btn-inline .media__transcript-btn-text");

        if ($transcriptBodyContainer.hasClass("inline-transcript-open")) {
          $transcriptBodyContainer.stop(true,true).slideUp(function() {
            $(window).resize();
          });
          $button.attr('aria-expanded', false);
          $transcriptBodyContainer.removeClass("inline-transcript-open");
          $buttonText.html(this.model.get("_transcript").inlineTranscriptButton);
        } else {
          $transcriptBodyContainer.stop(true,true).slideDown(function() {
            $(window).resize();
          });
          $button.attr('aria-expanded', true);
          $transcriptBodyContainer.addClass("inline-transcript-open");
          $buttonText.html(this.model.get("_transcript").inlineTranscriptCloseButton);

          if (this.model.get('_transcript')._setCompletionOnView !== false) {
            this.setCompletionStatus();
          }
        }
      },

      onExternalTranscriptClicked: function(event) {
        if (this.model.get('_transcript')._setCompletionOnView !== false) {
          this.setCompletionStatus();
        }
      },

      /**
       * Queue firing a media event to prevent simultaneous events firing, and provide a better indication of how the
       * media  player is behaving
       * @param {string} eventType
       */
      queueGlobalEvent: function(eventType) {
        var t = Date.now();
        var lastEvent = this.lastEvent || { time: 0 };
        var timeSinceLastEvent = t - lastEvent.time;
        var debounceTime = 500;

        this.lastEvent = {
          time: t,
          type: eventType
        };

        // Clear any existing timeouts
        clearTimeout(this.eventTimeout);

        // Always trigger 'ended' events
        if (eventType === 'ended') {
          return this.triggerGlobalEvent(eventType);
        }

        // Fire the event after a delay, only if another event has not just been fired
        if (timeSinceLastEvent > debounceTime) {
          this.eventTimeout = setTimeout(this.triggerGlobalEvent.bind(this, eventType), debounceTime);
        }
      },

      triggerGlobalEvent: function(eventType) {
        var player = this.mediaElement.player;

        var eventObj = {
          type: eventType,
          src: this.mediaElement.src,
          platform: this.mediaElement.pluginType
        };

        if (player) eventObj.isVideo = player.isVideo;

        Adapt.trigger('media', eventObj);
      }

  });

  return Adapt.register('media', {
    model: ComponentModel.extend({}),// create a new class in the inheritance chain so it can be extended per component type if necessary later
    view: MediaView
  });

});
