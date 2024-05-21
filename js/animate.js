// Import necessary modules
import utils from 'fizzy-ui-utils';

export default function animatePrototype( Flickity ) {
  // -------------------------- animate -------------------------- //
  Flickity.prototype.startAnimation = function() {
    if ( this.isAnimating ) return;

    this.isAnimating = true;
    this.restingFrames = 0;
    this.animate();
  };

  Flickity.prototype.animate = function() {
    this.applyDragForce();
    this.applySelectedAttraction();

    let previousX = this.x;

    this.integratePhysics();
    this.positionSlider();
    this.settle( previousX );
    // animate next frame
    if ( this.isAnimating ) requestAnimationFrame( () => this.animate() );
  };

  Flickity.prototype.positionSlider = function() {
    let x = this.x;
    // wrap position around
    if ( this.isWrapping ) {
      x = utils.modulo( x, this.slideableWidth ) - this.slideableWidth;
      this.shiftWrapCells( x );
    }

    this.setTranslateX( x, this.isAnimating );
    this.dispatchScrollEvent();
  };

  Flickity.prototype.setTranslateX = function( x, is3d ) {
    x += this.cursorPosition;
    // reverse if right-to-left and using transform
    if ( this.options.rightToLeft ) x = -x;
    let translateX = this.getPositionValue( x );
    // use 3D transforms for hardware acceleration on iOS
    // but use 2D when settled, for better font-rendering
    this.slider.style.transform = is3d ?
      `translate3d(${translateX},0,0)` :
      `translateX(${translateX})`;
  };

  Flickity.prototype.dispatchScrollEvent = function() {
    let firstSlide = this.slides[0];
    if ( !firstSlide ) return;

    let positionX = -this.x - firstSlide.target;
    let progress = positionX / this.slidesWidth;
    this.dispatchEvent( 'scroll', null, [ progress, positionX ] );
  };

  Flickity.prototype.positionSliderAtSelected = function() {
    if ( !this.cells.length ) return;

    this.x = -this.selectedSlide.target;
    this.velocity = 0; // stop wobble
    this.positionSlider();
  };

  Flickity.prototype.getPositionValue = function( position ) {
    if ( this.options.percentPosition ) {
      // percent position, round to 2 digits, like 12.34%
      return Math.round( ( position / this.size.innerWidth ) * 10000 ) * 0.01 + '%';
    } else {
      // pixel positioning
      return Math.round( position ) + 'px';
    }
  };

  Flickity.prototype.settle = function( previousX ) {
    // keep track of frames where x hasn't moved
    let isResting =
      !this.isPointerDown &&
      Math.round( this.x * 100 ) === Math.round( previousX * 100 );
    if ( isResting ) this.restingFrames++;
    // stop animating if resting for 3 or more frames
    if ( this.restingFrames > 2 ) {
      this.isAnimating = false;
      delete this.isFreeScrolling;
      // render position with translateX when settled
      this.positionSlider();
      this.dispatchEvent( 'settle', null, [ this.selectedIndex ] );
    }
  };

  Flickity.prototype.shiftWrapCells = function( x ) {
    // shift before cells
    let beforeGap = this.cursorPosition + x;
    this._shiftCells( this.beforeShiftCells, beforeGap, -1 );
    // shift after cells
    let afterGap =
      this.size.innerWidth - ( x + this.slideableWidth + this.cursorPosition );
    this._shiftCells( this.afterShiftCells, afterGap, 1 );
  };

  Flickity.prototype._shiftCells = function( cells, gap, shift ) {
    cells.forEach( ( cell ) => {
      let cellShift = gap > 0 ? shift : 0;
      this._wrapShiftCell( cell, cellShift );
      gap -= cell.size.outerWidth;
    } );
  };

  Flickity.prototype._unshiftCells = function( cells ) {
    if ( !cells || !cells.length ) return;

    cells.forEach( ( cell ) => this._wrapShiftCell( cell, 0 ) );
  };

  // @param {Integer} shift - 0, 1, or -1
  Flickity.prototype._wrapShiftCell = function( cell, shift ) {
    this._renderCellPosition( cell, cell.x + this.slideableWidth * shift );
  };

  // -------------------------- physics -------------------------- //

  Flickity.prototype.integratePhysics = function() {
    this.x += this.velocity;
    this.velocity *= this.getFrictionFactor();
  };

  Flickity.prototype.applyForce = function( force ) {
    this.velocity += force;
  };

  Flickity.prototype.getFrictionFactor = function() {
    return 1 - +this.options[ this.isFreeScrolling ? 'freeScrollFriction' : 'friction' ];
  };

  Flickity.prototype.getRestingPosition = function() {
    // my thanks to Steven Wittens, who simplified this math greatly
    return this.x + this.velocity / ( 1 - this.getFrictionFactor() );
  };

  Flickity.prototype.applyDragForce = function() {
    if ( !this.isDraggable || !this.isPointerDown ) return;

    // change the position to drag position by applying force
    let dragVelocity = this.dragX - this.x;
    let dragForce = dragVelocity - this.velocity;
    this.applyForce( dragForce );
  };

  Flickity.prototype.applySelectedAttraction = function() {
    // do not attract if pointer down or no slides
    let dragDown = this.isDraggable && this.isPointerDown;
    if ( dragDown || this.isFreeScrolling || !this.slides.length ) return;

    let distance = this.selectedSlide.target * -1 - this.x;
    let force = distance * this.options.selectedAttraction;
    this.applyForce( force );
  };
}
