// add, remove cell

import Flickity from './flickity';
import * as utils from 'fizzy-ui-utils';

'use strict';

// append cells to a document fragment
function getCellsFragment(cells) {
  const fragment = document.createDocumentFragment();
  cells.forEach(function(cell) {
    fragment.appendChild(cell.element);
  });
  return fragment;
}

// -------------------------- add/remove cell prototype -------------------------- //

const proto = Flickity.prototype;

/**
 * Insert, prepend, or append cells
 * @param {[Element, Array, NodeList]} elems - Elements to insert
 * @param {Integer} index - Zero-based number to insert
 */
proto.insert = function(elems, index) {
  const cells = this._makeCells(elems);
  if (!cells || !cells.length) {
    return;
  }
  const len = this.cells.length;
  // default to append
  index = index === undefined ? len : index;
  // add cells with document fragment
  const fragment = getCellsFragment(cells);
  // append to slider
  const isAppend = index == len;
  if (isAppend) {
    this.slider.appendChild(fragment);
  } else {
    const insertCellElement = this.cells[index].element;
    this.slider.insertBefore(fragment, insertCellElement);
  }
  // add to this.cells
  if (index === 0) {
    // prepend, add to start
    this.cells = cells.concat(this.cells);
  } else if (isAppend) {
    // append, add to end
    this.cells = this.cells.concat(cells);
  } else {
    // insert in this.cells
    const endCells = this.cells.splice(index, len - index);
    this.cells = this.cells.concat(cells).concat(endCells);
  }

  this._sizeCells(cells);
  this.cellChange(index, true);
};

proto.append = function(elems) {
  this.insert(elems, this.cells.length);
};

proto.prepend = function(elems) {
  this.insert(elems, 0);
};

/**
 * Remove cells
 * @param {[Element, Array, NodeList]} elems - Elements to remove
 */
proto.remove = function(elems) {
  const cells = this.getCells(elems);
  if (!cells || !cells.length) {
    return;
  }

  let minCellIndex = this.cells.length - 1;
  // remove cells from collection & DOM
  cells.forEach(function(cell) {
    cell.remove();
    const index = this.cells.indexOf(cell);
    minCellIndex = Math.min(index, minCellIndex);
    utils.removeFrom(this.cells, cell);
  }, this);

  this.cellChange(minCellIndex, true);
};

/**
 * logic to be run after a cell's size changes
 * @param {Element} elem - cell's element
 */
proto.cellSizeChange = function(elem) {
  const cell = this.getCell(elem);
  if (!cell) {
    return;
  }
  cell.getSize();

  const index = this.cells.indexOf(cell);
  this.cellChange(index);
};

/**
 * logic any time a cell is changed: added, removed, or size changed
 * @param {Integer} changedCellIndex - index of the changed cell, optional
 * @param {Boolean} isPositioningSlider - Positions slider after selection
 */
proto.cellChange = function(changedCellIndex, isPositioningSlider) {
  const prevSelectedElem = this.selectedElement;
  this._positionCells(changedCellIndex);
  this._getWrapShiftCells();
  this.setGallerySize();
  // update selectedIndex
  // try to maintain position & select previous selected element
  const cell = this.getCell(prevSelectedElem);
  if (cell) {
    this.selectedIndex = this.getCellSlideIndex(cell);
  }
  this.selectedIndex = Math.min(this.slides.length - 1, this.selectedIndex);

  this.emitEvent('cellChange', [changedCellIndex]);
  // position slider
  this.select(this.selectedIndex);
  // do not position slider after lazy load
  if (isPositioningSlider) {
    this.positionSliderAtSelected();
  }
};

export default Flickity;
