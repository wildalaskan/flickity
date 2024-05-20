// Import necessary modules
import getSize from 'get-size';

const cellClassName = 'flickity-cell';

class Cell {
  constructor( elem ) {
    this.element = elem;
    this.element.classList.add( cellClassName );

    this.x = 0;
    this.unselect();
  }

  destroy() {
    // reset style
    this.unselect();
    this.element.classList.remove( cellClassName );
    this.element.style.transform = '';
    this.element.removeAttribute('aria-hidden');
  }

  getSize() {
    this.size = getSize( this.element );
  }

  select() {
    this.element.classList.add('is-selected');
    this.element.removeAttribute('aria-hidden');
  }

  unselect() {
    this.element.classList.remove('is-selected');
    this.element.setAttribute( 'aria-hidden', 'true' );
  }

  remove() {
    this.element.remove();
  }
}

export default Cell;
