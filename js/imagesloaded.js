// Import necessary modules
import Flickity from './core';
import imagesLoaded from 'imagesloaded';

Flickity.create.imagesLoaded = function() {
  this.on( 'activate', this.imagesLoaded );
};

Flickity.prototype.imagesLoaded = function() {
  if ( !this.options.imagesLoaded ) return;

  let onImagesLoadedProgress = ( instance, image ) => {
    let cell = this.getParentCell( image.img );
    this.cellSizeChange( cell && cell.element );
    if ( !this.options.freeScroll ) this.positionSliderAtSelected();
  };

  imagesLoaded( this.slider ).on( 'progress', onImagesLoadedProgress );
};

export default Flickity;
