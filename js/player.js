// Import necessary modules
import Flickity from './core';

// -------------------------- Player -------------------------- //

class Player {
  constructor( autoPlay, onTick ) {
    this.autoPlay = autoPlay;
    this.onTick = onTick;
    this.state = 'stopped';
    // visibility change event handler
    this.onVisibilityChange = this.visibilityChange.bind( this );
    this.onVisibilityPlay = this.visibilityPlay.bind( this );
  }

  // start play
  play() {
    if ( this.state === 'playing' ) return;

    // do not play if page is hidden, start playing when page is visible
    let isPageHidden = document.hidden;
    if ( isPageHidden ) {
      document.addEventListener( 'visibilitychange', this.onVisibilityPlay );
      return;
    }

    this.state = 'playing';
    // listen to visibility change
    document.addEventListener( 'visibilitychange', this.onVisibilityChange );
    // start ticking
    this.tick();
  }

  tick() {
    // do not tick if not playing
    if ( this.state !== 'playing' ) return;

    // default to 3 seconds
    let time = typeof this.autoPlay == 'number' ? this.autoPlay : 3000;
    // HACK: reset ticks if stopped and started within interval
    this.clear();
    this.timeout = setTimeout( () => {
      this.onTick();
      this.tick();
    }, time );
  }

  stop() {
    this.state = 'stopped';
    this.clear();
    // remove visibility change event
    document.removeEventListener( 'visibilitychange', this.onVisibilityChange );
  }

  clear() {
    clearTimeout( this.timeout );
  }

  pause() {
    if ( this.state === 'playing' ) {
      this.state = 'paused';
      this.clear();
    }
  }

  unpause() {
    // re-start play if paused
    if ( this.state === 'paused' ) this.play();
  }

  // pause if page visibility is hidden, unpause if visible
  visibilityChange() {
    let isPageHidden = document.hidden;
    this[ isPageHidden ? 'pause' : 'unpause' ]();
  }

  visibilityPlay() {
    this.play();
    document.removeEventListener( 'visibilitychange', this.onVisibilityPlay );
  }
}

// -------------------------- Flickity -------------------------- //

Object.assign( Flickity.defaults, {
  pauseAutoPlayOnHover: true,
} );

Flickity.create.player = function() {
  this.player = new Player( this.options.autoPlay, () => {
    this.next( true );
  } );

  this.on( 'activate', this.activatePlayer );
  this.on( 'uiChange', this.stopPlayer );
  this.on( 'pointerDown', this.stopPlayer );
  this.on( 'deactivate', this.deactivatePlayer );
};

let proto = Flickity.prototype;

proto.activatePlayer = function() {
  if ( !this.options.autoPlay ) return;

  this.player.play();
  this.element.addEventListener( 'mouseenter', this );
};

// Player API

proto.playPlayer = function() {
  this.player.play();
};

proto.stopPlayer = function() {
  this.player.stop();
};

proto.pausePlayer = function() {
  this.player.pause();
};

proto.unpausePlayer = function() {
  this.player.unpause();
};

proto.deactivatePlayer = function() {
  this.player.stop();
  this.element.removeEventListener( 'mouseenter', this );
};

// ----- mouseenter/leave ----- //

// pause auto-play on hover
proto.onmouseenter = function() {
  if ( !this.options.pauseAutoPlayOnHover ) return;

  this.player.pause();
  this.element.addEventListener( 'mouseleave', this );
};

// resume auto-play on hover off
proto.onmouseleave = function() {
  this.player.unpause();
  this.element.removeEventListener( 'mouseleave', this );
};

// Export the Flickity class
export default Flickity;
