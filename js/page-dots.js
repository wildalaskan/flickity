// page dots

import Flickity from './flickity';
import Unipointer from 'unipointer';
import * as utils from 'fizzy-ui-utils';

// -------------------------- PageDots -------------------------- //

class PageDots extends Unipointer {
  constructor(parent) {
    super();
    this.parent = parent;
    this._create();
  }

  _create() {
    // create holder element
    this.holder = document.createElement('ol');
    this.holder.className = 'flickity-page-dots';
    // create dots, array of elements
    this.dots = [];
    // events
    this.handleClick = this.onClick.bind(this);
    this.on('pointerDown', this.parent.childUIPointerDown.bind(this.parent));
  }

  activate() {
    this.setDots();
    this.holder.addEventListener('click', this.handleClick);
    this.bindStartEvent(this.holder);
    // add to DOM
    this.parent.element.appendChild(this.holder);
  }

  deactivate() {
    this.holder.removeEventListener('click', this.handleClick);
    this.unbindStartEvent(this.holder);
    // remove from DOM
    this.parent.element.removeChild(this.holder);
  }

  setDots() {
    // get difference between number of slides and number of dots
    const delta = this.parent.slides.length - this.dots.length;
    if (delta > 0) {
      this.addDots(delta);
    } else if (delta < 0) {
      this.removeDots(-delta);
    }
  }

  addDots(count) {
    const fragment = document.createDocumentFragment();
    const newDots = [];
    const length = this.dots.length;
    const max = length + count;

    for (let i = length; i < max; i++) {
      const dot = document.createElement('li');
      dot.className = 'dot';
      dot.setAttribute('aria-label', 'Page dot ' + (i + 1));
      fragment.appendChild(dot);
      newDots.push(dot);
    }

    this.holder.appendChild(fragment);
    this.dots = this.dots.concat(newDots);
  }

  removeDots(count) {
    // remove from this.dots collection
    const removeDots = this.dots.splice(this.dots.length - count, count);
    // remove from DOM
    removeDots.forEach((dot) => {
      this.holder.removeChild(dot);
    });
  }

  updateSelected() {
    // remove selected class on previous
    if (this.selectedDot) {
      this.selectedDot.className = 'dot';
      this.selectedDot.removeAttribute('aria-current');
    }
    // don't proceed if no dots
    if (!this.dots.length) {
      return;
    }
    this.selectedDot = this.dots[this.parent.selectedIndex];
    this.selectedDot.className = 'dot is-selected';
    this.selectedDot.setAttribute('aria-current', 'step');
  }

  onClick(event) {
    const target = event.target;
    // only care about dot clicks
    if (target.nodeName != 'LI') {
      return;
    }

    this.parent.uiChange();
    const index = this.dots.indexOf(target);
    this.parent.select(index);
  }

  destroy() {
    this.deactivate();
    this.allOff();
  }
}

Flickity.PageDots = PageDots;

// -------------------------- Flickity -------------------------- //

utils.extend(Flickity.defaults, {
  pageDots: true,
});

Flickity.createMethods.push('_createPageDots');

const proto = Flickity.prototype;

proto._createPageDots = function() {
  if (!this.options.pageDots) {
    return;
  }
  this.pageDots = new PageDots(this);
  // events
  this.on('activate', this.activatePageDots);
  this.on('select', this.updateSelectedPageDots);
  this.on('cellChange', this.updatePageDots);
  this.on('resize', this.updatePageDots);
  this.on('deactivate', this.deactivatePageDots);
};

proto.activatePageDots = function() {
  this.pageDots.activate();
};

proto.updateSelectedPageDots = function() {
  this.pageDots.updateSelected();
};

proto.updatePageDots = function() {
  this.pageDots.setDots();
};

proto.deactivatePageDots = function() {
  this.pageDots.deactivate();
};

// -----  ----- //

Flickity.PageDots = PageDots;

export default Flickity;
