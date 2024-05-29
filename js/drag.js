// drag

import Flickity from './flickity';
import Unidragger from 'unidragger';
import * as utils from 'fizzy-ui-utils';

// ----- defaults ----- //

utils.extend(Flickity.defaults, {
  draggable: '>1',
  dragThreshold: 3,
});

// ----- create ----- //

Flickity.createMethods.push('_createDrag');

// -------------------------- drag prototype -------------------------- //

const proto = Flickity.prototype;
utils.extend(proto, Unidragger.prototype);
proto._touchActionValue = 'pan-y';

// --------------------------  -------------------------- //

proto._createDrag = function() {
  this.on('activate', this.onActivateDrag);
  this.on('uiChange', this._uiChangeDrag);
  this.on('deactivate', this.onDeactivateDrag);
  this.on('cellChange', this.updateDraggable);
  // TODO updateDraggable on resize? if groupCells & slides change
};

proto.onActivateDrag = function() {
  this.handles = [this.viewport];
  this.bindHandles();
  this.updateDraggable();
};

proto.onDeactivateDrag = function() {
  this.unbindHandles();
  this.element.classList.remove('is-draggable');
};

proto.updateDraggable = function() {
  // disable dragging if less than 2 slides. #278
  if (this.options.draggable == '>1') {
    this.isDraggable = this.slides.length > 1;
  } else {
    this.isDraggable = this.options.draggable;
  }
  if (this.isDraggable) {
    this.element.classList.add('is-draggable');
  } else {
    this.element.classList.remove('is-draggable');
  }
};

// backwards compatibility
proto.bindDrag = function() {
  this.options.draggable = true;
  this.updateDraggable();
};

proto.unbindDrag = function() {
  this.options.draggable = false;
  this.updateDraggable();
};

proto._uiChangeDrag = function() {
  delete this.isFreeScrolling;
};

// -------------------------- pointer events -------------------------- //

proto.pointerDown = function(event, pointer) {
  if (!this.isDraggable) {
    this._pointerDownDefault(event, pointer);
    return;
  }
  const isOkay = this.okayPointerDown(event);
  if (!isOkay) {
    return;
  }

  this._pointerDownPreventDefault(event);
  this.pointerDownFocus(event);
  // blur
  if (document.activeElement != this.element) {
    // do not blur if already focused
    this.pointerDownBlur();
  }

  // stop if it was moving
  this.dragX = this.x;
  this.viewport.classList.add('is-pointer-down');
  // track scrolling
  this.pointerDownScroll = getScrollPosition();
  window.addEventListener('scroll', this);

  this._pointerDownDefault(event, pointer);
};

// default pointerDown logic, used for staticClick
proto._pointerDownDefault = function(event, pointer) {
  // track start event position
  // Safari 9 overrides pageX and pageY. These values needs to be copied. #779
  this.pointerDownPointer = {
    pageX: pointer.pageX,
    pageY: pointer.pageY,
  };
  // bind move and end events
  this._bindPostStartEvents(event);
  this.dispatchEvent('pointerDown', event, [pointer]);
};

const focusNodes = {
  INPUT: true,
  TEXTAREA: true,
  SELECT: true,
};

proto.pointerDownFocus = function(event) {
  const isFocusNode = focusNodes[event.target.nodeName];
  if (!isFocusNode) {
    this.focus();
  }
};

proto._pointerDownPreventDefault = function(event) {
  const isTouchStart = event.type == 'touchstart';
  const isTouchPointer = event.pointerType == 'touch';
  const isFocusNode = focusNodes[event.target.nodeName];
  if (!isTouchStart && !isTouchPointer && !isFocusNode) {
    event.preventDefault();
  }
};

// ----- move ----- //

proto.hasDragStarted = function(moveVector) {
  return Math.abs(moveVector.x) > this.options.dragThreshold;
};

// ----- up ----- //

proto.pointerUp = function(event, pointer) {
  delete this.isTouchScrolling;
  this.viewport.classList.remove('is-pointer-down');
  this.dispatchEvent('pointerUp', event, [pointer]);
  this._dragPointerUp(event, pointer);
};

proto.pointerDone = function() {
  window.removeEventListener('scroll', this);
  delete this.pointerDownScroll;
};

// -------------------------- dragging -------------------------- //

proto.dragStart = function(event, pointer) {
  if (!this.isDraggable) {
    return;
  }
  this.dragStartPosition = this.x;
  this.startAnimation();
  window.removeEventListener('scroll', this);
  this.dispatchEvent('dragStart', event, [pointer]);
};

proto.pointerMove = function(event, pointer) {
  const moveVector = this._dragPointerMove(event, pointer);
  this.dispatchEvent('pointerMove', event, [pointer, moveVector]);
  this._dragMove(event, pointer, moveVector);
};

proto.dragMove = function(event, pointer, moveVector) {
  if (!this.isDraggable) {
    return;
  }
  event.preventDefault();

  this.previousDragX = this.dragX;
  // reverse if right-to-left
  const direction = this.options.rightToLeft ? -1 : 1;
  if (this.options.wrapAround) {
    // wrap around move. #589
    moveVector.x %= this.slideableWidth;
  }
  let dragX = this.dragStartPosition + moveVector.x * direction;

  if (!this.options.wrapAround && this.slides.length) {
    // slow drag
    const originBound = Math.max(-this.slides[0].target, this.dragStartPosition);
    dragX = dragX > originBound ? (dragX + originBound) * 0.5 : dragX;
    const endBound = Math.min(-this.getLastSlide().target, this.dragStartPosition);
    dragX = dragX < endBound ? (dragX + endBound) * 0.5 : dragX;
  }

  this.dragX = dragX;

  this.dragMoveTime = new Date();
  this.dispatchEvent('dragMove', event, [pointer, moveVector]);
};

proto.dragEnd = function(event, pointer) {
  if (!this.isDraggable) {
    return;
  }
  if (this.options.freeScroll) {
    this.isFreeScrolling = true;
  }
  // set selectedIndex based on where flick will end up
  let index = this.dragEndRestingSelect();

  if (this.options.freeScroll && !this.options.wrapAround) {
    // if free-scroll & not wrap around
    // do not free-scroll if going outside of bounding slides
    // so bounding slides can attract slider, and keep it in bounds
    const restingX = this.getRestingPosition();
    this.isFreeScrolling = -restingX > this.slides[0].target &&
      -restingX < this.getLastSlide().target;
  } else if (!this.options.freeScroll && index == this.selectedIndex) {
    // boost selection if selected index has not changed
    index += this.dragEndBoostSelect();
  }
  delete this.previousDragX;
  // apply selection
  // TODO refactor this, selecting here feels weird
  // HACK, set flag so dragging stays in correct direction
  this.isDragSelect = this.options.wrapAround;
  this.select(index);
  delete this.isDragSelect;
  this.dispatchEvent('dragEnd', event, [pointer]);
};

proto.dragEndRestingSelect = function() {
  const restingX = this.getRestingPosition();
  // how far away from selected slide
  const distance = Math.abs(this.getSlideDistance(-restingX, this.selectedIndex));
  // get closest resting going up and going down
  const positiveResting = this._getClosestResting(restingX, distance, 1);
  const negativeResting = this._getClosestResting(restingX, distance, -1);
  // use closer resting for wrap-around
  const index = positiveResting.distance < negativeResting.distance ?
    positiveResting.index : negativeResting.index;
  return index;
};

/**
 * given resting X and distance to selected cell
 * get the distance and index of the closest cell
 * @param {Number} restingX - estimated post-flick resting position
 * @param {Number} distance - distance to selected cell
 * @param {Integer} increment - +1 or -1, going up or down
 * @returns {Object} - { distance: {Number}, index: {Integer} }
 */
proto._getClosestResting = function(restingX, distance, increment) {
  let index = this.selectedIndex;
  let minDistance = Infinity;
  const condition = this.options.contain && !this.options.wrapAround ?
    // if contain, keep going if distance is equal to minDistance
    function(dist, minDist) {
      return dist <= minDist;
    } : function(dist, minDist) {
      return dist < minDist;
    };
  while (condition(distance, minDistance)) {
    // measure distance to next cell
    index += increment;
    minDistance = distance;
    distance = this.getSlideDistance(-restingX, index);
    if (distance === null) {
      break;
    }
    distance = Math.abs(distance);
  }
  return {
    distance: minDistance,
    // selected was previous index
    index: index - increment,
  };
};

/**
 * measure distance between x and a slide target
 * @param {Number} x - horizontal position
 * @param {Integer} index - slide index
 * @returns {Number} - slide distance
 */
proto.getSlideDistance = function(x, index) {
  const len = this.slides.length;
  // wrap around if at least 2 slides
  const isWrapAround = this.options.wrapAround && len > 1;
  const slideIndex = isWrapAround ? utils.modulo(index, len) : index;
  const slide = this.slides[slideIndex];
  if (!slide) {
    return null;
  }
  // add distance for wrap-around slides
  const wrap = isWrapAround ? this.slideableWidth * Math.floor(index / len) : 0;
  return x - (slide.target + wrap);
};

proto.dragEndBoostSelect = function() {
  // do not boost if no previousDragX or dragMoveTime
  if (this.previousDragX === undefined || !this.dragMoveTime ||
    // or if drag was held for 100 ms
    new Date() - this.dragMoveTime > 100) {
    return 0;
  }

  const distance = this.getSlideDistance(-this.dragX, this.selectedIndex);
  const delta = this.previousDragX - this.dragX;
  if (distance > 0 && delta > 0) {
    // boost to next if moving towards the right, and positive velocity
    return 1;
  } else if (distance < 0 && delta < 0) {
    // boost to previous if moving towards the left, and negative velocity
    return -1;
  }
  return 0;
};

// ----- staticClick ----- //

proto.staticClick = function(event, pointer) {
  // get clickedCell, if cell was clicked
  const clickedCell = this.getParentCell(event.target);
  const cellElem = clickedCell && clickedCell.element;
  const cellIndex = clickedCell && this.cells.indexOf(clickedCell);
  this.dispatchEvent('staticClick', event, [pointer, cellElem, cellIndex]);
};

// ----- scroll ----- //

proto.onscroll = function() {
  const scroll = getScrollPosition();
  const scrollMoveX = this.pointerDownScroll.x - scroll.x;
  const scrollMoveY = this.pointerDownScroll.y - scroll.y;
  // cancel click/tap if scroll is too much
  if (Math.abs(scrollMoveX) > 3 || Math.abs(scrollMoveY) > 3) {
    this._pointerDone();
  }
};

// ----- utils ----- //

function getScrollPosition() {
  return {
    x: window.scrollX,
    y: window.scrollY,
  };
}

// -----  ----- //

export default Flickity;
