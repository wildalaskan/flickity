// animate

import * as utils from 'fizzy-ui-utils';

'use strict';

// -------------------------- animate -------------------------- //

const proto = {};

proto.startAnimation = function() {
  if (this.isAnimating) {
    return;
  }

  this.isAnimating = true;
  this.restingFrames = 0;
  this.animate();
};

proto.animate = function() {
  this.applyDragForce();
  this.applySelectedAttraction();

  const previousX = this.x;

  this.integratePhysics();
  this.positionSlider();
  this.settle(previousX);
  // animate next frame
  if (this.isAnimating) {
    requestAnimationFrame(() => {
      this.animate();
    });
  }
};

proto.positionSlider = function() {
  let x = this.x;
  // wrap position around
  if (this.options.wrapAround && this.cells.length > 1) {
    x = utils.modulo(x, this.slideableWidth);
    x -= this.slideableWidth;
    this.shiftWrapCells(x);
  }

  this.setTranslateX(x, this.isAnimating);
  this.dispatchScrollEvent();
};

proto.setTranslateX = function(x, is3d) {
  x += this.cursorPosition;
  // reverse if right-to-left and using transform
  x = this.options.rightToLeft ? -x : x;
  const translateX = this.getPositionValue(x);
  // use 3D transforms for hardware acceleration on iOS
  // but use 2D when settled, for better font-rendering
  this.slider.style.transform = is3d ?
    `translate3d(${translateX},0,0)` : `translateX(${translateX})`;
};

proto.dispatchScrollEvent = function() {
  const firstSlide = this.slides[0];
  if (!firstSlide) {
    return;
  }
  const positionX = -this.x - firstSlide.target;
  const progress = positionX / this.slidesWidth;
  this.dispatchEvent('scroll', null, [progress, positionX]);
};

proto.positionSliderAtSelected = function() {
  if (!this.cells.length) {
    return;
  }
  this.x = -this.selectedSlide.target;
  this.velocity = 0; // stop wobble
  this.positionSlider();
};

proto.getPositionValue = function(position) {
  if (this.options.percentPosition) {
    // percent position, round to 2 digits, like 12.34%
    return (Math.round((position / this.size.innerWidth) * 10000) * 0.01) + '%';
  } else {
    // pixel positioning
    return Math.round(position) + 'px';
  }
};

proto.settle = function(previousX) {
  // keep track of frames where x hasn't moved
  const isResting = !this.isPointerDown &&
      Math.round(this.x * 100) === Math.round(previousX * 100);
  if (isResting) {
    this.restingFrames++;
  }
  // stop animating if resting for 3 or more frames
  if (this.restingFrames > 2) {
    this.isAnimating = false;
    delete this.isFreeScrolling;
    // render position with translateX when settled
    this.positionSlider();
    this.dispatchEvent('settle', null, [this.selectedIndex]);
  }
};

proto.shiftWrapCells = function(x) {
  // shift before cells
  let beforeGap = this.cursorPosition + x;
  this._shiftCells(this.beforeShiftCells, beforeGap, -1);
  // shift after cells
  let afterGap = this.size.innerWidth - (x + this.slideableWidth + this.cursorPosition);
  this._shiftCells(this.afterShiftCells, afterGap, 1);
};

proto._shiftCells = function(cells, gap, shift) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellShift = gap > 0 ? shift : 0;
    cell.wrapShift(cellShift);
    gap -= cell.size.outerWidth;
  }
};

proto._unshiftCells = function(cells) {
  if (!cells || !cells.length) {
    return;
  }
  for (let i = 0; i < cells.length; i++) {
    cells[i].wrapShift(0);
  }
};

// -------------------------- physics -------------------------- //

proto.integratePhysics = function() {
  this.x += this.velocity;
  this.velocity *= this.getFrictionFactor();
};

proto.applyForce = function(force) {
  this.velocity += force;
};

proto.getFrictionFactor = function() {
  return 1 - this.options[this.isFreeScrolling ? 'freeScrollFriction' : 'friction'];
};

proto.getRestingPosition = function() {
  // my thanks to Steven Wittens, who simplified this math greatly
  return this.x + this.velocity / (1 - this.getFrictionFactor());
};

proto.applyDragForce = function() {
  if (!this.isDraggable || !this.isPointerDown) {
    return;
  }
  // change the position to drag position by applying force
  const dragVelocity = this.dragX - this.x;
  const dragForce = dragVelocity - this.velocity;
  this.applyForce(dragForce);
};

proto.applySelectedAttraction = function() {
  // do not attract if pointer down or no slides
  const dragDown = this.isDraggable && this.isPointerDown;
  if (dragDown || this.isFreeScrolling || !this.slides.length) {
    return;
  }
  const distance = this.selectedSlide.target * -1 - this.x;
  const force = distance * this.options.selectedAttraction;
  this.applyForce(force);
};

export default proto;
