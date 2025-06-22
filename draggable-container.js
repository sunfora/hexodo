"use strict"

// @type{HTMLElement}
const grid_container = document.querySelector('.hex-grid-draggable-container');

let grid_container_data = {
    resizing: false,
    pageX : 0,
    pageY : 0,
    width : 0,
    height: 0,
    animationFrame: null
}

grid_container.addEventListener('mousedown', (event) => {
  if (event.target === event.currentTarget) {
    grid_container.style.cursor = 'crosshair';
    grid_container_data.pageX = event.pageX;
    grid_container_data.pageY = event.pageY;
    grid_container_data.resizing = true;
    grid_container_data.width = grid_container.clientWidth;
    grid_container_data.height = grid_container.clientHeight;
  }
});

document.addEventListener('mousemove', (event) => {
  if (grid_container_data.resizing) {

    const diffX = grid_container_data.pageX - event.pageX;
    const diffY = grid_container_data.pageY - event.pageY;

    if (grid_container_data.animationFrame) {
      cancelAnimationFrame(grid_container_data.animationFrame);
    } 
    grid_container_data.animationFrame = requestAnimationFrame( () => {
      grid_container.style.width = `${Math.max(grid_container_data.width - diffX,  0)}px`;
      grid_container.style.height = `${Math.max(grid_container_data.height - diffY,  0)}px`;
    });
  }
});

document.addEventListener('mouseup', (event) => {
  grid_container.style.cursor = 'grab';
  if (grid_container_data.resizing) {
    grid_container_data.resizing = false;
    grid_container_data.animationFrame = null;
  }
});
