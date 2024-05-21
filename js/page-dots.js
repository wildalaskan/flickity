// Import necessary modules
import Flickity from './core';
import utils from 'fizzy-ui-utils';

// -------------------------- PageDots -------------------------- //

class PageDots {
  constructor() {
    // create holder element
    this.holder = document.createElement('div');
    this.holder.className = 'flickity-page-dots';
    // create dots, array of elements
    this.dots = [];
  }

  setDots( slidesLength ) {
    // get difference between number of slides and number of dots
    let delta = slidesLength - this.dots.length;
    if ( delta > 0 ) {
      this.addDots( delta );
    } else if ( delta < 0 ) {
      this.removeDots( -delta );
    }
  }

  addDots( count ) {
    let newDots = new Array( count ).fill()
      .map( ( item, i ) => {
        let dot = document.createElement('li');
        dot.setAttribute( 'aria-label', 'Page dot ' + ( i + 1 ) );
        dot.className = 'dot';
        return dot;
      } );

    this.holder.append( ...newDots );
    this.dots = this.dots.concat( newDots );
  }

  removeDots( count ) {
    // remove from this.dots collection
    let removeDots = this.dots.splice( this.dots.length - count, count );
    // remove from DOM
    removeDots.forEach( ( dot ) => dot.remove() );
  }

  updateSelected( index ) {
    // remove selected class on previous
    if ( this.selectedDot ) {
      this.selectedDot.classList.remove('is-selected');
      this.selectedDot.removeAttribute('aria-current');
    }
    // don't proceed if no dots
    if ( !this.dots.length ) return;

    this.selectedDot = this.dots[ index ];
    this.selectedDot.classList.add('is-selected');
    this.selectedDot.setAttribute( 'aria-current', 'step' );
  }
}

Flickity.PageDots = PageDots;

// -------------------------- Flickity -------------------------- //

Object.assign( Flickity.defaults, {
  pageDots: true,
} );

Flickity.create.pageDots = function() {
  if ( !this.options.pageDots ) return;

  this.pageDots = new PageDots();
  this.handlePageDotsClick = this.onPageDotsClick.bind( this );
  // events
  this.on( 'activate', this.activatePageDots );
  this.on( 'select', this.updateSelectedPageDots );
  this.on( 'cellChange', this.updatePageDots );
  this.on( 'resize', this.updatePageDots );
  this.on( 'deactivate', this.deactivatePageDots );
};

let proto = Flickity.prototype;

proto.activatePageDots = function() {
  this.pageDots.setDots( this.slides.length );
  this.focusableElems.push( ...this.pageDots.dots );
  this.pageDots.holder.addEventListener( 'click', this.handlePageDotsClick );
  this.element.insertBefore( this.pageDots.holder, this.viewport );
};

proto.onPageDotsClick = function( event ) {
  let index = this.pageDots.dots.indexOf( event.target );
  if ( index === -1 ) return; // only dot clicks

  this.uiChange();
  this.select( index );
};

proto.updateSelectedPageDots = function() {
  this.pageDots.updateSelected( this.selectedIndex );
};

proto.updatePageDots = function() {
  this.pageDots.dots.forEach( ( dot ) => {
    utils.removeFrom( this.focusableElems, dot );
  } );
  this.pageDots.setDots( this.slides.length );
  this.focusableElems.push( ...this.pageDots.dots );
};

proto.deactivatePageDots = function() {
  this.pageDots.holder.remove();
  this.pageDots.holder.removeEventListener( 'click', this.handlePageDotsClick );
};

// Export the Flickity class
export default Flickity;
