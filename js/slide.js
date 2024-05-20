class Slide {
  constructor( beginMargin, endMargin, cellAlign ) {
    this.beginMargin = beginMargin;
    this.endMargin = endMargin;
    this.cellAlign = cellAlign;
    this.cells = [];
    this.outerWidth = 0;
    this.height = 0;
  }

  addCell( cell ) {
    this.cells.push( cell );
    this.outerWidth += cell.size.outerWidth;
    this.height = Math.max( cell.size.outerHeight, this.height );
    // first cell stuff
    if ( this.cells.length === 1 ) {
      this.x = cell.x; // x comes from first cell
      this.firstMargin = cell.size[ this.beginMargin ];
    }
  }

  updateTarget() {
    let lastCell = this.getLastCell();
    let lastMargin = lastCell ? lastCell.size[ this.endMargin ] : 0;
    let slideWidth = this.outerWidth - ( this.firstMargin + lastMargin );
    this.target = this.x + this.firstMargin + slideWidth * this.cellAlign;
  }

  getLastCell() {
    return this.cells[ this.cells.length - 1 ];
  }

  select() {
    this.cells.forEach( ( cell ) => cell.select() );
  }

  unselect() {
    this.cells.forEach( ( cell ) => cell.unselect() );
  }

  getCellElements() {
    return this.cells.map( ( cell ) => cell.element );
  }
}

// Export the Slide class as the default export
export default Slide;
