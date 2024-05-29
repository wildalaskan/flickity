// Flickity main
/* eslint-disable max-params */

import EvEmitter from 'ev-emitter';
import getSize from 'get-size';
import * as utils from 'fizzy-ui-utils';
import Cell from './cell';
import Slide from './slide';
import animatePrototype from './animate';

'use strict';

// vars
let jQuery = window.jQuery;
const getComputedStyle = window.getComputedStyle;
const console = window.console;

function moveElements(elems, toElem) {
  elems = utils.makeArray(elems);
  while (elems.length) {
    toElem.appendChild(elems.shift());
  }
}

// -------------------------- Flickity -------------------------- //

// globally unique identifiers
let GUID = 0;
// internal store of all Flickity instances
const instances = {};

class Flickity extends EvEmitter {
  constructor(element, options) {
    super();
    const queryElement = utils.getQueryElement(element);
    if (!queryElement) {
      if (console) {
        console.error('Bad element for Flickity: ' + (queryElement || element));
      }
      return;
    }
    this.element = queryElement;
    // do not initialize twice on same element
    if (this.element.flickityGUID) {
      const instance = instances[this.element.flickityGUID];
      if (instance) instance.option(options);
      return instance;
    }

    // add jQuery
    if (jQuery) {
      this.$element = jQuery(this.element);
    }
    // options
    this.options = utils.extend({}, this.constructor.defaults);
    this.option(options);

    // kick things off
    this._create();
  }

  static defaults = {
    accessibility: true,
    // adaptiveHeight: false,
    cellAlign: 'center',
    // cellSelector: undefined,
    // contain: false,
    freeScrollFriction: 0.075, // friction when free-scrolling
    friction: 0.28, // friction when selecting
    namespaceJQueryEvents: true,
    // initialIndex: 0,
    percentPosition: true,
    resize: true,
    selectedAttraction: 0.025,
    setGallerySize: true,
    // watchCSS: false,
    // wrapAround: false
  };

  // hash of methods triggered on _create()
  static createMethods = [];

  _create() {
    // add id for Flickity.data
    const id = this.guid = ++GUID;
    this.element.flickityGUID = id; // expando
    instances[id] = this; // associate via id
    // initial properties
    this.selectedIndex = 0;
    // how many frames slider has been in same position
    this.restingFrames = 0;
    // initial physics properties
    this.x = 0;
    this.velocity = 0;
    this.originSide = this.options.rightToLeft ? 'right' : 'left';
    // create viewport & slider
    this.viewport = document.createElement('div');
    this.viewport.className = 'flickity-viewport';
    this._createSlider();

    if (this.options.resize || this.options.watchCSS) {
      window.addEventListener('resize', this);
    }

    // add listeners from on option
    for (const eventName in this.options.on) {
      const listener = this.options.on[eventName];
      this.on(eventName, listener);
    }

    Flickity.createMethods.forEach(function(method) {
      this[method]();
    }, this);

    if (this.options.watchCSS) {
      this.watchCSS();
    } else {
      this.activate();
    }
  }

  /**
   * set options
   * @param {Object} opts - options to extend
   */
  option(opts) {
    utils.extend(this.options, opts);
  }

  activate() {
    if (this.isActive) {
      return;
    }
    this.isActive = true;
    this.element.classList.add('flickity-enabled');
    if (this.options.rightToLeft) {
      this.element.classList.add('flickity-rtl');
    }

    this.getSize();
    // move initial cell elements so they can be loaded as cells
    const cellElems = this._filterFindCellElements(this.element.children);
    moveElements(cellElems, this.slider);
    this.viewport.appendChild(this.slider);
    this.element.appendChild(this.viewport);
    // get cells from children
    this.reloadCells();

    if (this.options.accessibility) {
      // allow element to focusable
      this.element.tabIndex = 0;
      // listen for key presses
      this.element.addEventListener('keydown', this);
    }

    this.emitEvent('activate');
    this.selectInitialIndex();
    // flag for initial activation, for using initialIndex
    this.isInitActivated = true;
    // ready event. #493
    this.dispatchEvent('ready');
  }

  /**
   * set options
   * @param {Object} opts - options to extend
   */
  option(opts) {
    utils.extend(this.options, opts);
  }

  _createSlider() {
    // slider element does all the positioning
    const slider = document.createElement('div');
    slider.className = 'flickity-slider';
    slider.style[this.originSide] = 0;
    this.slider = slider;
  }

  _filterFindCellElements(elems) {
    return utils.filterFindElements(elems, this.options.cellSelector);
  }

  reloadCells() {
    // collection of item elements
    this.cells = this._makeCells(this.slider.children);
    this.positionCells();
    this._getWrapShiftCells();
    this.setGallerySize();
  }

  _makeCells(elems) {
    const cellElems = this._filterFindCellElements(elems);

    // create new Flickity for collection
    const cells = cellElems.map(function(cellElem) {
      return new Cell(cellElem, this);
    }, this);

    return cells;
  }

  getLastCell() {
    return this.cells[this.cells.length - 1];
  }

  getLastSlide() {
    return this.slides[this.slides.length - 1];
  }

  positionCells() {
    // size all cells
    this._sizeCells(this.cells);
    // position all cells
    this._positionCells(0);
  }

  _positionCells(index) {
    index = index || 0;
    // also measure maxCellHeight
    // start 0 if positioning all cells
    this.maxCellHeight = index ? this.maxCellHeight || 0 : 0;
    let cellX = 0;
    // get cellX
    if (index > 0) {
      const startCell = this.cells[index - 1];
      cellX = startCell.x + startCell.size.outerWidth;
    }
    const len = this.cells.length;
    for (let i = index; i < len; i++) {
      const cell = this.cells[i];
      cell.setPosition(cellX);
      cellX += cell.size.outerWidth;
      this.maxCellHeight = Math.max(cell.size.outerHeight, this.maxCellHeight);
    }
    // keep track of cellX for wrap-around
    this.slideableWidth = cellX;
    // slides
    this.updateSlides();
    // contain slides target
    this._containSlides();
    // update slidesWidth
    this.slidesWidth = len ? this.getLastSlide().target - this.slides[0].target : 0;
  }

  _sizeCells(cells) {
    cells.forEach(function(cell) {
      cell.getSize();
    });
  }

  updateSlides() {
    this.slides = [];
    if (!this.cells.length) {
      return;
    }

    let slide = new Slide(this);
    this.slides.push(slide);
    const isOriginLeft = this.originSide == 'left';
    const nextMargin = isOriginLeft ? 'marginRight' : 'marginLeft';

    const canCellFit = this._getCanCellFit();

    this.cells.forEach(function(cell, i) {
      // just add cell if first cell in slide
      if (!slide.cells.length) {
        slide.addCell(cell);
        return;
      }

      const slideWidth = (slide.outerWidth - slide.firstMargin) +
        (cell.size.outerWidth - cell.size[nextMargin]);

      if (canCellFit.call(this, i, slideWidth)) {
        slide.addCell(cell);
      } else {
        // doesn't fit, new slide
        slide.updateTarget();

        slide = new Slide(this);
        this.slides.push(slide);
        slide.addCell(cell);
      }
    }, this);
    // last slide
    slide.updateTarget();
    // update .selectedSlide
    this.updateSelectedSlide();
  }

  _getCanCellFit() {
    const groupCells = this.options.groupCells;
    if (!groupCells) {
      return function() {
        return false;
      };
    } else if (typeof groupCells == 'number') {
      // group by number. 3 -> [0,1,2], [3,4,5], ...
      const number = parseInt(groupCells, 10);
      return function(i) {
        return (i % number) !== 0;
      };
    }
    // default, group by width of slide
    // parse '75%
    const percentMatch = typeof groupCells == 'string' &&
      groupCells.match(/^(\d+)%$/);
    const percent = percentMatch ? parseInt(percentMatch[1], 10) / 100 : 1;
    return function(i, slideWidth) {
      return slideWidth <= (this.size.innerWidth + 1) * percent;
    };
  }

  // alias _init for jQuery plugin .flickity()
  _init = this.reposition = function() {
    this.positionCells();
    this.positionSliderAtSelected();
  }

  getSize() {
    this.size = getSize(this.element);
    this.setCellAlign();
    this.cursorPosition = this.size.innerWidth * this.cellAlign;
  }

  setCellAlign() {
    const shorthand = cellAlignShorthands[this.options.cellAlign];
    this.cellAlign = shorthand ? shorthand[this.originSide] : this.options.cellAlign;
  }

  setGallerySize() {
    if (this.options.setGallerySize) {
      const height = this.options.adaptiveHeight && this.selectedSlide ?
        this.selectedSlide.height : this.maxCellHeight;
      this.viewport.style.height = height + 'px';
    }
  }

  _getWrapShiftCells() {
    // only for wrap-around
    if (!this.options.wrapAround) {
      return;
    }
    // unshift previous cells
    this._unshiftCells(this.beforeShiftCells);
    this._unshiftCells(this.afterShiftCells);
    // get before cells
    // initial gap
    let gapX = this.cursorPosition;
    let cellIndex = this.cells.length - 1;
    this.beforeShiftCells = this._getGapCells(gapX, cellIndex, -1);
    // get after cells
    // ending gap between last cell and end of gallery viewport
    gapX = this.size.innerWidth - this.cursorPosition;
    // start cloning at first cell, working forwards
    this.afterShiftCells = this._getGapCells(gapX, 0, 1);
  }

  _getGapCells(gapX, cellIndex, increment) {
    // keep adding cells until the cover the initial gap
    const cells = [];
    while (gapX > 0) {
      const cell = this.cells[cellIndex];
      if (!cell) {
        break;
      }
      cells.push(cell);
      cellIndex += increment;
      gapX -= cell.size.outerWidth;
    }
    return cells;
  }

  _containSlides() {
    if (!this.options.contain || this.options.wrapAround || !this.cells.length) {
      return;
    }
    const isRightToLeft = this.options.rightToLeft;
    const beginMargin = isRightToLeft ? 'marginRight' : 'marginLeft';
    const endMargin = isRightToLeft ? 'marginLeft' : 'marginRight';
    const contentWidth = this.slideableWidth - this.getLastCell().size[endMargin];
    // content is less than gallery size
    const isContentSmaller = contentWidth < this.size.innerWidth;
    // bounds
    const beginBound = this.cursorPosition + this.cells[0].size[beginMargin];
    const endBound = contentWidth - this.size.innerWidth * (1 - this.cellAlign);
    // contain each cell target
    this.slides.forEach(function(slide) {
      if (isContentSmaller) {
        // all cells fit inside gallery
        slide.target = contentWidth * this.cellAlign;
      } else {
        // contain to bounds
        slide.target = Math.max(slide.target, beginBound);
        slide.target = Math.min(slide.target, endBound);
      }
    }, this);
  }

  dispatchEvent(type, event, args) {
    const emitArgs = event ? [event].concat(args) : args;
    this.emitEvent(type, emitArgs);

    if (jQuery && this.$element) {
      // default trigger with type if no event
      type += this.options.namespaceJQueryEvents ? '.flickity' : '';
      let $event = type;
      if (event) {
        // create jQuery event
        const jQEvent = new jQuery.Event(event);
        jQEvent.type = type;
        $event = jQEvent;
      }
      this.$element.trigger($event, args);
    }
  }

  select(index, isWrap, isInstant) {
    if (!this.isActive) {
      return;
    }
    index = parseInt(index, 10);
    this._wrapSelect(index);

    if (this.options.wrapAround || isWrap) {
      index = utils.modulo(index, this.slides.length);
    }
    // bail if invalid index
    if (!this.slides[index]) {
      return;
    }
    const prevIndex = this.selectedIndex;
    this.selectedIndex = index;
    this.updateSelectedSlide();
    if (isInstant) {
      this.positionSliderAtSelected();
    } else {
      this.startAnimation();
    }
    if (this.options.adaptiveHeight) {
      this.setGallerySize();
    }
    // events
    this.dispatchEvent('select', null, [index]);
    // change event if new index
    if (index != prevIndex) {
      this.dispatchEvent('change', null, [index]);
    }
    // old v1 event name, remove in v3
    this.dispatchEvent('cellSelect');
  }

  _wrapSelect(index) {
    const len = this.slides.length;
    const isWrapping = this.options.wrapAround && len > 1;
    if (!isWrapping) {
      return index;
    }
    const wrapIndex = utils.modulo(index, len);
    // go to shortest
    const delta = Math.abs(wrapIndex - this.selectedIndex);
    const backWrapDelta = Math.abs((wrapIndex + len) - this.selectedIndex);
    const forewardWrapDelta = Math.abs((wrapIndex - len) - this.selectedIndex);
    if (!this.isDragSelect && backWrapDelta < delta) {
      index += len;
    } else if (!this.isDragSelect && forewardWrapDelta < delta) {
      index -= len;
    }
    // wrap position so slider is within normal area
    if (index < 0) {
      this.x -= this.slideableWidth;
    } else if (index >= len) {
      this.x += this.slideableWidth;
    }
  }

  previous(isWrap, isInstant) {
    this.select(this.selectedIndex - 1, isWrap, isInstant);
  }

  next(isWrap, isInstant) {
    this.select(this.selectedIndex + 1, isWrap, isInstant);
  }

  updateSelectedSlide() {
    const slide = this.slides[this.selectedIndex];
    // selectedIndex could be outside of slides, if triggered before resize()
    if (!slide) {
      return;
    }
    // unselect previous selected slide
    this.unselectSelectedSlide();
    // update new selected slide
    this.selectedSlide = slide;
    slide.select();
    this.selectedCells = slide.cells;
    this.selectedElements = slide.getCellElements();
    // HACK: selectedCell & selectedElement is first cell in slide, backwards compatibility
    // Remove in v3?
    this.selectedCell = slide.cells[0];
    this.selectedElement = this.selectedElements[0];
  }

  unselectSelectedSlide() {
    if (this.selectedSlide) {
      this.selectedSlide.unselect();
    }
  }

  selectInitialIndex() {
    const initialIndex = this.options.initialIndex;
    // already activated, select previous selectedIndex
    if (this.isInitActivated) {
      this.select(this.selectedIndex, false, true);
      return;
    }
    // select with selector string
    if (initialIndex && typeof initialIndex == 'string') {
      const cell = this.queryCell(initialIndex);
      if (cell) {
        this.selectCell(initialIndex, false, true);
        return;
      }
    }

    let index = 0;
    // select with number
    if (initialIndex && this.slides[initialIndex]) {
      index = initialIndex;
    }
    // select instantly
    this.select(index, false, true);
  }

  selectCell(value, isWrap, isInstant) {
    // get cell
    const cell = this.queryCell(value);
    if (!cell) {
      return;
    }

    const index = this.getCellSlideIndex(cell);
    this.select(index, isWrap, isInstant);
  }

  getCellSlideIndex(cell) {
    // get index of slides that has cell
    for (let i = 0; i < this.slides.length; i++) {
      const slide = this.slides[i];
      const index = slide.cells.indexOf(cell);
      if (index != -1) {
        return i;
      }
    }
  }

  getCell(elem) {
    // loop through cells to get the one that matches
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.element == elem) {
        return cell;
      }
    }
  }

  getCells(elems) {
    elems = utils.makeArray(elems);
    const cells = [];
    elems.forEach(function(elem) {
      const cell = this.getCell(elem);
      if (cell) {
        cells.push(cell);
      }
    }, this);
    return cells;
  }

  getCellElements() {
    return this.cells.map(function(cell) {
      return cell.element;
    });
  }

  getParentCell(elem) {
    // first check if elem is cell
    let cell = this.getCell(elem);
    if (cell) {
      return cell;
    }
    // try to get parent cell elem
    elem = utils.getParent(elem, '.flickity-slider > *');
    return this.getCell(elem);
  }

  getAdjacentCellElements(adjCount, index) {
    if (!adjCount) {
      return this.selectedSlide.getCellElements();
    }
    index = index === undefined ? this.selectedIndex : index;

    const len = this.slides.length;
    if (1 + (adjCount * 2) >= len) {
      return this.getCellElements();
    }

    let cellElems = [];
    for (let i = index - adjCount; i <= index + adjCount; i++) {
      const slideIndex = this.options.wrapAround ? utils.modulo(i, len) : i;
      const slide = this.slides[slideIndex];
      if (slide) {
        cellElems = cellElems.concat(slide.getCellElements());
      }
    }
    return cellElems;
  }

  queryCell(selector) {
    if (typeof selector == 'number') {
      // use number as index
      return this.cells[selector];
    }
    if (typeof selector == 'string') {
      // do not select invalid selectors from hash: #123, #/. #791
      if (selector.match(/^[#.]?[\d/]/)) {
        return;
      }
      // use string as selector, get element
      selector = this.element.querySelector(selector);
    }
    // get cell from element
    return this.getCell(selector);
  }

  uiChange() {
    this.emitEvent('uiChange');
  }

  childUIPointerDown(event) {
    // HACK iOS does not allow touch events to bubble up?!
    if (event.type != 'touchstart') {
      event.preventDefault();
    }
    this.focus();
  }

  onresize() {
    this.watchCSS();
    this.resize();
  }

  resize() {
    // #1177 disable resize behavior when animating or dragging for iOS 15
    if (!this.isActive || this.isAnimating || this.isDragging) {
      return;
    }
    this.getSize();
    // wrap values
    if (this.options.wrapAround) {
      this.x = utils.modulo(this.x, this.slideableWidth);
    }
    this.positionCells();
    this._getWrapShiftCells();
    this.setGallerySize();
    this.emitEvent('resize');
    // update selected index for group slides, instant
    // TODO: position can be lost between groups of various numbers
    const selectedElement = this.selectedElements && this.selectedElements[0];
    this.selectCell(selectedElement, false, true);
  }

  watchCSS() {
    const watchOption = this.options.watchCSS;
    if (!watchOption) {
      return;
    }

    const afterContent = getComputedStyle(this.element, ':after').content;
    // activate if :after { content: 'flickity' }
    if (afterContent.indexOf('flickity') != -1) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  onkeydown(event) {
    // only work if element is in focus
    const isNotFocused = document.activeElement && document.activeElement != this.element;
    if (!this.options.accessibility || isNotFocused) {
      return;
    }

    const handler = Flickity.keyboardHandlers[event.keyCode];
    if (handler) {
      handler.call(this);
    }
  }

  focus() {
    // TODO remove scrollTo once focus options gets more support
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus ...
    //    #Browser_compatibility
    const prevScrollY = window.pageYOffset;
    this.element.focus({ preventScroll: true });
    // hack to fix scroll jump after focus, #76
    if (window.pageYOffset != prevScrollY) {
      window.scrollTo(window.pageXOffset, prevScrollY);
    }
  }

  deactivate() {
    if (!this.isActive) {
      return;
    }
    this.element.classList.remove('flickity-enabled');
    this.element.classList.remove('flickity-rtl');
    this.unselectSelectedSlide();
    // destroy cells
    this.cells.forEach(function(cell) {
      cell.destroy();
    });
    this.element.removeChild(this.viewport);
    // move child elements back into element
    moveElements(this.slider.children, this.element);
    if (this.options.accessibility) {
      this.element.removeAttribute('tabIndex');
      this.element.removeEventListener('keydown', this);
    }
    // set flags
    this.isActive = false;
    this.emitEvent('deactivate');
  }

  destroy() {
    this.deactivate();
    window.removeEventListener('resize', this);
    this.allOff();
    this.emitEvent('destroy');
    if (jQuery && this.$element) {
      jQuery.removeData(this.element, 'flickity');
    }
    delete this.element.flickityGUID;
    delete instances[this.guid];
  }
}

// -------------------------- prototype -------------------------- //

utils.extend(Flickity.prototype, animatePrototype);

// -------------------------- extras -------------------------- //

Flickity.data = function(elem) {
  elem = utils.getQueryElement(elem);
  const id = elem && elem.flickityGUID;
  return id && instances[id];
};

utils.htmlInit(Flickity, 'flickity');

if (jQuery && jQuery.bridget) {
  jQuery.bridget('flickity', Flickity);
}

Flickity.setJQuery = function(jq) {
  jQuery = jq;
};

Flickity.Cell = Cell;
Flickity.Slide = Slide;

Flickity.keyboardHandlers = {
  // left arrow
  37: function() {
    const leftMethod = this.options.rightToLeft ? 'next' : 'previous';
    this.uiChange();
    this[leftMethod]();
  },
  // right arrow
  39: function() {
    const rightMethod = this.options.rightToLeft ? 'previous' : 'next';
    this.uiChange();
    this[rightMethod]();
  },
};

const cellAlignShorthands = {
  // cell align, then based on origin side
  center: {
    left: 0.5,
    right: 0.5,
  },
  left: {
    left: 0,
    right: 1,
  },
  right: {
    right: 0,
    left: 1,
  },
};

export default Flickity;

