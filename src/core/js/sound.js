define([
  'core/js/adapt',
  'core/js/views/SoundView'
], function(Adapt, SoundView) {
  
  Adapt.on({
    'adapt:start': function() {
      new SoundView();
    }
  });

  // Adapt.sound = Sound;

});
