define([
  'core/js/adapt'
], function(Adapt) {

  var SoundView = Backbone.View.extend({

    className: 'sound u-display-none',
    audio: null,
    src: null,
    transcript: null,
    _isActive: true,
    _isPlaying: false,
    _isPaused: false,
    _isTranscriptShowing: false,
    _isComplete: false,

    attributes: {
      'role': 'dialog',
      'aria-hidden': 'true'
    },

    initialize: function() {
      this._isVisible = true;
      this.setupEventListeners();
      this.render();
    },

    setupEventListeners: function() {
      this.listenTo(Adapt, {
        'navigation:toggleAudio': this.toggleAudio,
        'navigation:togglePlayAudio': this.togglePlayAudio,
        'navigation:toggleTranscriptAudio': this.toggleTranscriptAudio,
        'audio:remove': this.remove,
        'audio:play': this.onPlayAudio,
        'audio:pause': this.onPauseAudio,
        'audio:setup': this.onSetupAudio,
        'audio:partial': this.onElementAudio,
        'audio:feedback': this.onFeedbackAudio,
        'audio:stop': this.onStopAudio
      });
		//stop any audio when opening a new tab/URL
		document.addEventListener("visibilitychange", this.onStopFocusAudio, false);
    },

    render: function() {
      var template = Handlebars.templates['sound'];
      $(this.el).html(template({ _globals: Adapt.course.get('_globals') })).prependTo('body');
      // Set defer on post render
      _.defer(_.bind(function() {
        this.postRender();
      }, this));
      return this;
    },

    // Set tabindex for select elements
    postRender: function() {
      this.audio = $('#audio')[0];
      if (Adapt.config.get('_sound')._isActive === true) {
        $('.sound').removeClass('u-display-none');
        this.audio.addEventListener('ended', () => { 
          //this._isComplete = true;
          this._isPlaying = false;
          this._isPaused = true;
          //$('.js-nav-audio-playpause-btn').attr('disabled', true);
          //$('.js-nav-audio-playpause-btn').addClass('is-disabled');
          $('.js-nav-audio-playpause-btn').find('.icon').addClass('rewind');
        });
        $('.js-nav-audio-playpause-btn').attr('disabled', true);
        $('.js-nav-audio-playpause-btn').addClass('is-disabled');
        $('.js-nav-audio-transcript-btn').attr('disabled', true);
        $('.js-nav-audio-transcript-btn').addClass('is-disabled');

        if (Adapt.config.get('_sound')._playPause === false) {
          $('.js-nav-audio-playpause-btn').addClass('u-display-none');
        }

        if (Adapt.config.get('_sound')._transcript === false) {
          $('.js-nav-audio-transcript-btn').addClass('u-display-none');
        }
        this.disableAudioBtn(true);
      } else {
        $('.js-nav-audio-btn').addClass('u-display-none');
        $('.js-nav-audio-playpause-btn').addClass('u-display-none');
        $('.js-nav-audio-transcript-btn').addClass('u-display-none');
      }
    },

    onSetupAudio(audioObject) {
      console.log('onSetupAudio');
      if (!this._isPlaying) {
        this.loadAudio(audioObject);
      }
    },

    onElementAudio: function(audioObject) {
      Adapt.trigger('audio:stop');
      this.loadAudio(audioObject);
    },

    onFeedbackAudio: function(audioObject) {
      if(this.src !== audioObject.src) {
        Adapt.trigger('audio:stop');
        this.loadAudio(audioObject);
      }
    },

    loadAudio: function (audioObject) {
      this._isComplete = false;
      this._isPlaying = false;
      this._isPaused = false;

      this.src = audioObject.src;
      $('#audio-src').attr('src', this.src);
      this.audio.load();

      if(this._isActive) {
        //this.audio.currentTime = 0;
        Adapt.trigger('audio:play');
      } else {
        Adapt.trigger('audio:pause');
      }

      if(this._isTranscriptShowing) {
        $('#audio-transcript').removeClass('showing');
        setTimeout(function () {
					$('#audio-transcript').addClass('showing');
          $('.js-nav-audio-playpause-btn').addClass('showing');
				}, 50);
      }
      $('#audio-transcript').find(".transcript").html(audioObject.transcript);
      
      $('.js-nav-audio-playpause-btn').find('.icon').removeClass('rewind');

      this.disableAudioBtn(false);
    },

    toggleAudio: function() {
      //console.log('toggleAudio: ' + this._isPlaying, this._isPaused);
      if(!this._isPlaying && !this._isPaused) {
        Adapt.trigger('audio:play');
        $('.js-nav-audio-playpause-btn').find('.icon').removeClass('paused');
        $('.js-nav-audio-playpause-btn').find('.icon').removeClass('rewind');
        this._isPaused = false;
        $('.js-nav-audio-btn').find('.icon').removeClass('mute');
        $('.js-nav-audio-playpause-btn').attr('disabled', false);
        $('.js-nav-audio-playpause-btn').removeClass('is-disabled');
        this._isActive = true;
        this._isPlaying = true;
      } else {
        $('.js-nav-audio-btn').find('.icon').addClass('mute');
        $('.js-nav-audio-playpause-btn').attr('disabled', true);
        $('.js-nav-audio-playpause-btn').addClass('is-disabled');
        this._isActive = false;
        this._isPaused = false;
        if(this._isPlaying) {
          Adapt.trigger('audio:pause');
          $('.js-nav-audio-playpause-btn').find('.icon').addClass('paused');
          $('.js-nav-audio-playpause-btn').find('.icon').removeClass('rewind');
          //this._isPaused = true;
        }
        this._isPlaying = false;
      }
    },

    togglePlayAudio: function() {
      $('.js-nav-audio-playpause-btn').find('.icon').removeClass('rewind');
      //console.log('togglePlayAudio: ' + this._isPlaying, this._isPaused);
      if(!this._isPlaying) {
        Adapt.trigger('audio:play');
        $('.js-nav-audio-playpause-btn').find('.icon').removeClass('paused');
        this._isPaused = false;
        this._isPlaying = true;
      } else {
        Adapt.trigger('audio:pause');
        $('.js-nav-audio-playpause-btn').find('.icon').addClass('paused');
        this._isPaused = true;
        this._isPlaying = false;
      }
    },

    toggleTranscriptAudio: function() {
      if(this._isTranscriptShowing) {
        this._isTranscriptShowing = false;
        $('.js-nav-audio-transcript-btn').removeClass('showing');
        $('#audio-transcript').removeClass('showing');
      } else {
        this._isTranscriptShowing = true;
        $('.js-nav-audio-transcript-btn').addClass('showing');
        $('#audio-transcript').removeClass('showing');
        $('#audio-transcript').addClass('showing');
      }
    },

    onPlayAudio: function() {
      if (!this._isComplete) {
        this.audio.play();
        this._isPlaying = true;
      }
    },

    onPauseAudio: function() {
      this.audio.pause();
      this._isPlaying = false;
    },

    onStopAudio: function() {
      //console.log('stop audio');
      Adapt.trigger('audio:pause');
      this.disableAudioBtn(true);
    },
    
	  onStopFocusAudio: () => {
      //console.log('stop audio');
      Adapt.trigger('audio:pause');
      $('.js-nav-audio-playpause-btn').find('.icon').addClass('paused');
      this.disableAudioBtn(true);
    },
	
    disableAudioBtn: function(_disable) {
      if (_disable) {
        $('.js-nav-audio-btn').attr('disabled', true);
        $('.js-nav-audio-btn').addClass('is-disabled');

        $('.js-nav-audio-playpause-btn').attr('disabled', true);
        $('.js-nav-audio-playpause-btn').addClass('is-disabled');

        $('.js-nav-audio-transcript-btn').attr('disabled', true);
        $('.js-nav-audio-transcript-btn').addClass('is-disabled');
        $('#audio-transcript').removeClass('showing');
        $('.js-nav-audio-transcript-btn').removeClass('showing');
        
      } else {
        $('.js-nav-audio-btn').attr('disabled', false);
        $('.js-nav-audio-btn').removeClass('is-disabled');
        
        $('.js-nav-audio-transcript-btn').attr('disabled', false);
        $('.js-nav-audio-transcript-btn').removeClass('is-disabled');

        if(this._isTranscriptShowing) {
          $('.js-nav-audio-transcript-btn').addClass('showing');
        }

        if(this._isActive) {
          $('.js-nav-audio-playpause-btn').attr('disabled', false);
          $('.js-nav-audio-playpause-btn').removeClass('is-disabled');
          
          
          if(!this._isPaused){
            $('.js-nav-audio-playpause-btn').find('.icon').removeClass('paused');
          }

        }
      }
    },

    remove: function() {
      //Backbone.View.prototype.remove.apply(this, arguments);
      //Adapt.trigger('audio:empty');

    }

  });

  return SoundView;

});
