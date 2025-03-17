document.addEventListener("DOMContentLoaded", function () {
    // Initialize all interactive components
    initPixelCreator();
    initResizingDemo();
    
    // Only initialize sampling and color depth demos if their elements exist
    if (document.getElementById("sampling-canvas") && document.getElementById("continuous-canvas")) {
      initSamplingDemo();
    }
    
    if (document.getElementById("depth-source-image") && document.getElementById("depth-canvas")) {
      initColorDepthDemo();
    }
  
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute("href")).scrollIntoView({
          behavior: "smooth",
        });
      });
    });
  });
  
  function setupGridContainers() {
    // Style for main grid container
    const pixelGridContainer = document.querySelector(".pixel-grid-container");
    if (pixelGridContainer) {
      pixelGridContainer.style.overflow = "hidden";
      pixelGridContainer.style.position = "relative";
      pixelGridContainer.style.width = "440px"; // Accounting for axes
      pixelGridContainer.style.height = "440px";
    }
    
    // Style for binary grid container
    const binaryGridWrapper = document.querySelector(".binary-grid-wrapper");
    if (binaryGridWrapper) {
      binaryGridWrapper.style.overflow = "hidden";
      binaryGridWrapper.style.position = "relative";
      binaryGridWrapper.style.width = "440px"; // Accounting for axes
      binaryGridWrapper.style.height = "440px";
    }
  }
  
  // Call this function after creating both grids
  setupGridContainers();


  // ===== Pixel Creator Section =====
  function initPixelCreator() {
    const gridContainer = document.getElementById("pixel-grid");
    const gridSizeSelect = document.getElementById("grid-size");
    const colorPicker = document.getElementById("pixel-color");
    const clearButton = document.getElementById("clear-grid");
    const downloadButton = document.getElementById("download-image");
    
    // New buttons for undo/redo
    const undoButton = document.getElementById("undo-button");
    const redoButton = document.getElementById("redo-button");
    
    // New buttons for zoom/pan
    const zoomInButton = document.getElementById("zoom-in");
    const zoomOutButton = document.getElementById("zoom-out");
    const resetViewButton = document.getElementById("reset-view");
    
    let isDrawing = false;
    let currentSize = parseInt(gridSizeSelect.value);
    let currentColor = colorPicker.value;
    
    // History for undo/redo
    let history = [];
    let historyIndex = -1;
    
    // Zoom/pan state for main grid
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    
    // Separate zoom/pan state for binary grid
    let binaryScale = 1;
    let binaryPanX = 0;
    let binaryPanY = 0;
    let isBinaryPanning = false;
    let startBinaryPanX = 0;
    let startBinaryPanY = 0;
    
    // Unique colors for file size calculation
    let uniqueColors = new Set(["white"]);
  
    // Create initial grid
    createGrid(currentSize);
  
    // Event Listeners
    gridSizeSelect.addEventListener("change", () => {
      if (confirm("Changing grid size will clear your current work. Continue?")) {
        currentSize = parseInt(gridSizeSelect.value);
        createGrid(currentSize);
        resetHistory();
      } else {
        gridSizeSelect.value = currentSize;
      }
    });
  
    colorPicker.addEventListener("input", () => {
      currentColor = colorPicker.value;
    });
  
    clearButton.addEventListener("click", () => {
      if (confirm("Clear the entire grid?")) {
        createGrid(currentSize);
        resetHistory();
      }
    });
  
    downloadButton.addEventListener("click", downloadPixelArt);
  
    gridContainer.addEventListener("mousedown", (e) => {
      // Only start drawing on left click without space modifier
      if (e.button === 0 && !e.getModifierState("Space")) {
        isDrawing = true;
      }
      
      // For panning with middle mouse or space+left click
      if (e.button === 1 || (e.button === 0 && e.getModifierState("Space"))) {
        e.preventDefault();
        e.stopPropagation();
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        gridContainer.style.cursor = "grabbing";
        
        // Add temporary event listeners for this panning session
        document.addEventListener("mousemove", handleMainPanMove);
        document.addEventListener("mouseup", handleMainPanEnd);
      }
    });
    
    // Add back the drawing event listeners that were lost
    gridContainer.addEventListener("mouseup", stopDrawing);
    gridContainer.addEventListener("mouseleave", stopDrawing);
    
    // Undo/Redo buttons
    undoButton.addEventListener("click", undo);
    redoButton.addEventListener("click", redo);
    
    // Keyboard shortcuts for undo/redo
    document.addEventListener("keydown", (e) => {
      // Check if focus is not in an input field
      if (document.activeElement.tagName !== "INPUT") {
        if (e.ctrlKey && e.key === "z") {
          e.preventDefault();
          undo();
        } else if (e.ctrlKey && e.key === "y") {
          e.preventDefault();
          redo();
        }
      }
    });
    
    // Zoom/Pan buttons
    zoomInButton.addEventListener("click", () => {
      zoomGrid(1.2, true);
    });
    
    zoomOutButton.addEventListener("click", () => {
      zoomGrid(0.8, true);
    });
    
    resetViewButton.addEventListener("click", () => {
      resetView(true);
    });
    
    // Mouse wheel zoom for both grids
    gridContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomGrid(zoomFactor, true);
    });
    
    // Pan functionality
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        // Prevent default scrolling behavior with capture phase
        e.preventDefault();
        e.stopPropagation();
        
        gridContainer.style.cursor = "grab";
        
        // Also update cursor for binary grid
        const binaryGridWithAxes = document.querySelector('.binary-grid-with-axes');
        if (binaryGridWithAxes) {
          binaryGridWithAxes.style.cursor = "grab";
        }
      }
    });
    
    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        gridContainer.style.cursor = "default";
        
        // Also update cursor for binary grid
        const binaryGridWithAxes = document.querySelector('.binary-grid-with-axes');
        if (binaryGridWithAxes) {
          binaryGridWithAxes.style.cursor = "default";
        }
      }
    });
    
    // Helper function for main grid panning - mousemove
    function handleMainPanMove(e) {
      if (isPanning) {
        e.preventDefault();
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyTransform();
      }
    }
    
    // Helper function for main grid panning - mouseup
    function handleMainPanEnd(e) {
      if (isPanning) {
        e.preventDefault();
        isPanning = false;
        gridContainer.style.cursor = e.getModifierState("Space") ? "grab" : "default";
        
        // Remove the temporary event listeners
        document.removeEventListener("mousemove", handleMainPanMove);
        document.removeEventListener("mouseup", handleMainPanEnd);
      }
    }
  
    // Pan functionality for binary grid will be added after the grid is created
  
    function createGrid(size) {
      gridContainer.innerHTML = "";
      gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    
      // Fixed size container
      gridContainer.style.width = "400px";
      gridContainer.style.height = "400px";
      
      // Reset uniqueColors
      uniqueColors = new Set(["white"]);
      
      // Get the parent container and interactive area
      const pixelGridContainer = document.querySelector(".pixel-grid-container");
      const interactiveArea = pixelGridContainer.closest(".interactive-area");
      
      // Clear existing content
      pixelGridContainer.innerHTML = "";
      
      // Remove any existing binary grid
      const existingBinaryGrid = interactiveArea.querySelector(".binary-section");
      if (existingBinaryGrid) {
        existingBinaryGrid.remove();
      }
      
      // Create x-axis labels (top)
      const xAxisTop = document.createElement("div");
      xAxisTop.className = "axis x-axis-top";
      xAxisTop.style.display = "grid";
      xAxisTop.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      xAxisTop.style.width = "400px";
      xAxisTop.style.height = "20px";
      
      for (let i = 0; i < size; i++) {
        const label = document.createElement("div");
        label.className = "axis-label";
        label.textContent = i;
        xAxisTop.appendChild(label);
      }
      
      // Create y-axis labels (left)
      const yAxisLeft = document.createElement("div");
      yAxisLeft.className = "axis y-axis-left";
      yAxisLeft.style.display = "grid";
      yAxisLeft.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      yAxisLeft.style.width = "20px";
      yAxisLeft.style.height = "400px";
      
      for (let i = 0; i < size; i++) {
        const label = document.createElement("div");
        label.className = "axis-label";
        label.textContent = i;
        yAxisLeft.appendChild(label);
      }
      
      // Create grid with axes
      const gridWithAxes = document.createElement("div");
      gridWithAxes.className = "grid-with-axes";
      
      const gridRow = document.createElement("div");
      gridRow.style.display = "flex";
      gridRow.style.flexDirection = "row";
      
      // Add the elements to the DOM
      gridRow.appendChild(yAxisLeft);
      gridRow.appendChild(gridContainer);
      
      gridWithAxes.appendChild(xAxisTop);
      gridWithAxes.appendChild(gridRow);
      
      // Add the grid with axes to the pixel grid container
      pixelGridContainer.appendChild(gridWithAxes);
      
      // Create binary representation grid
      const binaryGridContainer = document.createElement("div");
      binaryGridContainer.id = "binary-grid";
      binaryGridContainer.className = "binary-grid pixel-grid";
      binaryGridContainer.style.width = "400px";
      binaryGridContainer.style.height = "400px";
      binaryGridContainer.style.display = "grid";
      binaryGridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      binaryGridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      binaryGridContainer.style.gap = "1px";
      binaryGridContainer.style.backgroundColor = "#ddd";
      binaryGridContainer.style.border = "1px solid #ccc";
      
      // First, create a container for both title, controls and grid
      const binarySection = document.createElement("div");
      binarySection.className = "binary-section";
      binarySection.style.marginTop = "30px";
      binarySection.style.display = "flex";
      binarySection.style.flexDirection = "column";
      binarySection.style.alignItems = "center";
      
      // Add binary grid title (outside the wrapper)
      const binaryTitle = document.createElement("div");
      binaryTitle.textContent = "Binary Representation";
      binaryTitle.style.fontWeight = "bold";
      binaryTitle.style.marginBottom = "10px";
      binaryTitle.style.textAlign = "center";
      binarySection.appendChild(binaryTitle);
      
      // Create binary controls div (will be populated later)
      const binaryControls = document.createElement("div");
      binaryControls.className = "binary-controls";
      binaryControls.style.display = "flex";
      binaryControls.style.gap = "0.5rem";
      binaryControls.style.marginBottom = "10px";
      binaryControls.style.justifyContent = "center";
      binarySection.appendChild(binaryControls);
      
      // Create x-axis labels for binary grid
      const binaryXAxisTop = document.createElement("div");
      binaryXAxisTop.className = "axis x-axis-top";
      binaryXAxisTop.style.display = "grid";
      binaryXAxisTop.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      binaryXAxisTop.style.width = "400px";
      binaryXAxisTop.style.height = "20px";
      
      for (let i = 0; i < size; i++) {
        const label = document.createElement("div");
        label.className = "axis-label";
        label.textContent = i;
        binaryXAxisTop.appendChild(label);
      }
      
      // Create y-axis labels for binary grid
      const binaryYAxisLeft = document.createElement("div");
      binaryYAxisLeft.className = "axis y-axis-left";
      binaryYAxisLeft.style.display = "grid";
      binaryYAxisLeft.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      binaryYAxisLeft.style.width = "20px";
      binaryYAxisLeft.style.height = "400px";
      
      for (let i = 0; i < size; i++) {
        const label = document.createElement("div");
        label.className = "axis-label";
        label.textContent = i;
        binaryYAxisLeft.appendChild(label);
      }
      
      // Create grid with axes for binary grid
      const binaryGridWithAxes = document.createElement("div");
      binaryGridWithAxes.className = "grid-with-axes binary-grid-with-axes";
      
      const binaryGridRow = document.createElement("div");
      binaryGridRow.style.display = "flex";
      binaryGridRow.style.flexDirection = "row";
      
      // Add the elements to the DOM
      binaryGridRow.appendChild(binaryYAxisLeft);
      binaryGridRow.appendChild(binaryGridContainer);
      
      binaryGridWithAxes.appendChild(binaryXAxisTop);
      binaryGridWithAxes.appendChild(binaryGridRow);
      
      // Now create the wrapper that will only contain the grid
      const binaryGridWrapper = document.createElement("div");
      binaryGridWrapper.className = "binary-grid-wrapper pixel-grid-container";
      binaryGridWrapper.style.width = "440px";
      binaryGridWrapper.style.height = "440px";
      binaryGridWrapper.style.overflow = "hidden";
      binaryGridWrapper.style.position = "relative";
      binaryGridWrapper.style.margin = "0 auto";
      
      // Add the binary grid with axes to the wrapper
      binaryGridWrapper.appendChild(binaryGridWithAxes);
      
      // Add the wrapper to the binary section
      binarySection.appendChild(binaryGridWrapper);
      
      // Add the complete binary section to the interactive area
      interactiveArea.appendChild(binarySection);
      
      // Now that the binary grid is created, add panning event listeners
      addBinaryPanningEventListeners(document.querySelector('.binary-grid-with-axes'));
      
      // Create pixels for both grids
      for (let i = 0; i < size * size; i++) {
        // Create pixel for main grid
        const pixel = document.createElement("div");
        pixel.classList.add("pixel");
        pixel.dataset.index = i;
        pixel.style.backgroundColor = "white";
        pixel.addEventListener("mousedown", (e) => {
          // Only draw on left click
          if (e.button === 0 && !e.getModifierState("Space")) {
            colorPixel(e);
          }
        });
        pixel.addEventListener("mouseover", (e) => {
          if (isDrawing) colorPixel(e);
        });
        gridContainer.appendChild(pixel);
        
        // Create corresponding binary pixel
        const binaryPixel = document.createElement("div");
        binaryPixel.classList.add("binary-pixel");
        binaryPixel.dataset.index = i;
        binaryPixel.style.backgroundColor = "white";
        binaryPixel.style.fontSize = "8px";
        binaryPixel.style.overflow = "hidden";
        binaryPixel.style.display = "flex";
        binaryPixel.style.justifyContent = "center";
        binaryPixel.style.alignItems = "center";
        binaryPixel.style.textAlign = "center";
        binaryPixel.style.wordBreak = "break-all";
        binaryPixel.textContent = "00000000";
        binaryGridContainer.appendChild(binaryPixel);
      }
      
      // Add binary zoom controls
      addBinaryGridControls();
      
      // Fix: Store a direct reference to the binary grid with axes
      const binaryGridAxesElement = binaryGridWithAxes;
      
      // Fix: Directly add panning functionality to the binary grid
      if (binaryGridAxesElement) {
        // Add wheel zoom
        binaryGridAxesElement.addEventListener("wheel", (e) => {
          e.preventDefault();
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          zoomGrid(zoomFactor, false);
        });
        
        // Add middle mouse button and space+left button panning
        binaryGridAxesElement.addEventListener("mousedown", (e) => {
          // Prevent default for middle mouse button (important!)
          if (e.button === 1) {
            e.preventDefault();
          }
          
          if (e.button === 1 || (e.button === 0 && e.getModifierState("Space"))) {
            e.preventDefault();
            e.stopPropagation();
            
            isBinaryPanning = true;
            startBinaryPanX = e.clientX - binaryPanX;
            startBinaryPanY = e.clientY - binaryPanY;
            binaryGridAxesElement.style.cursor = "grabbing";
            
            // Define the handlers so we can remove them later
            const mouseMoveHandler = (e) => {
              if (isBinaryPanning) {
                e.preventDefault();
                binaryPanX = e.clientX - startBinaryPanX;
                binaryPanY = e.clientY - startBinaryPanY;
                applyBinaryTransform();
              }
            };
            
            const mouseUpHandler = () => {
              if (isBinaryPanning) {
                isBinaryPanning = false;
                binaryGridAxesElement.style.cursor = e.getModifierState("Space") ? "grab" : "default";
                
                // Remove the event listeners when we're done panning
                document.removeEventListener("mousemove", mouseMoveHandler);
                document.removeEventListener("mouseup", mouseUpHandler);
              }
            };
            
            // Add listeners for panning
            document.addEventListener("mousemove", mouseMoveHandler);
            document.addEventListener("mouseup", mouseUpHandler);
          }
        });
      }
      
      resetView(true);  // Reset main grid view
      resetView(false); // Reset binary grid view
    }
    
    function addBinaryGridControls() {
      // Find the binary controls container
      const binaryControls = document.querySelector(".binary-controls");
      if (binaryControls) {
        // Clear existing controls if needed
        binaryControls.innerHTML = '';
        
        // Create binary grid zoom buttons
        const binaryZoomInButton = document.createElement("button");
        binaryZoomInButton.textContent = "Zoom In";
        binaryZoomInButton.className = "button";
        binaryZoomInButton.addEventListener("click", () => {
          zoomGrid(1.2, false);
        });
        
        const binaryZoomOutButton = document.createElement("button");
        binaryZoomOutButton.textContent = "Zoom Out";
        binaryZoomOutButton.className = "button";
        binaryZoomOutButton.addEventListener("click", () => {
          zoomGrid(0.8, false);
        });
        
        const binaryResetViewButton = document.createElement("button");
        binaryResetViewButton.textContent = "Reset View";
        binaryResetViewButton.className = "button";
        binaryResetViewButton.addEventListener("click", () => {
          resetView(false);
        });
        
        // Add buttons to the controls
        binaryControls.appendChild(binaryZoomInButton);
        binaryControls.appendChild(binaryZoomOutButton);
        binaryControls.appendChild(binaryResetViewButton);
      }
    }
    
    function startDrawing(e) {
      // Only start drawing on left click
      if (e.button === 0 && !e.getModifierState("Space")) {
        isDrawing = true;
      }
    }
    
    function stopDrawing() {
      isDrawing = false;
    }
  
    function colorPixel(e) {
      const oldColor = e.target.style.backgroundColor;
      if (oldColor === currentColor) return; // No change
      
      // Add to history
      addToHistory({
        index: parseInt(e.target.dataset.index),
        oldColor: oldColor || "white",
        newColor: currentColor
      });
      
      e.target.style.backgroundColor = currentColor;
      uniqueColors.add(currentColor);
      
      // Update binary representation
      updateBinaryPixel(parseInt(e.target.dataset.index), currentColor);
    }
    
    function updateBinaryPixel(index, color) {
      const binaryPixel = document.querySelector(`.binary-pixel[data-index="${index}"]`);
      if (!binaryPixel) return;
      
      // Convert color to binary
      let binaryValue = "";
      
      if (color === "white" || color === "") {
        binaryValue = "00000000";
        // For white pixels, show 0s as black text on white background
        binaryPixel.style.backgroundColor = "white";
        binaryPixel.style.color = "black";
      } else {
        // Parse the color to get RGB values
        let r, g, b;
        
        if (color.startsWith("rgb")) {
          // Parse rgb(r, g, b) format
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
          }
        } else {
          // Parse hex format by creating a temporary element
          const tempElem = document.createElement("div");
          tempElem.style.color = color;
          document.body.appendChild(tempElem);
          const computedColor = getComputedStyle(tempElem).color;
          document.body.removeChild(tempElem);
          
          // Now parse the computed rgb value
          const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            r = parseInt(match[1]);
            g = parseInt(match[2]);
            b = parseInt(match[3]);
          }
        }
        
        // Convert to binary (simplified to 8 bits total)
        if (r !== undefined && g !== undefined && b !== undefined) {
          // Use 3 bits for red, 3 bits for green, 2 bits for blue (8 bits total)
          const rBinary = Math.round(r / 255 * 7).toString(2).padStart(3, '0');
          const gBinary = Math.round(g / 255 * 7).toString(2).padStart(3, '0');
          const bBinary = Math.round(b / 255 * 3).toString(2).padStart(2, '0');
          binaryValue = rBinary + gBinary + bBinary;
        } else {
          binaryValue = "00000000";
        }
        
        // For colored pixels, set text color for readability
        binaryPixel.style.backgroundColor = color;
        binaryPixel.style.color = isColorDark(color) ? "white" : "black";
      }
      
      // Display 0s as black and 1s in highlighted color
      let formattedBinary = "";
      for (let i = 0; i < binaryValue.length; i++) {
        const bit = binaryValue[i];
        if (bit === "1") {
          formattedBinary += `<span style="font-weight:bold;color:${binaryPixel.style.color === "white" ? "white" : "blue"}">1</span>`;
        } else {
          formattedBinary += `<span>0</span>`;
        }
      }
      
      binaryPixel.innerHTML = formattedBinary;
    }
    
    function isColorDark(color) {
      // Create a temporary element to compute the color
      const tempElem = document.createElement("div");
      tempElem.style.color = color;
      document.body.appendChild(tempElem);
      const computedColor = getComputedStyle(tempElem).color;
      document.body.removeChild(tempElem);
      
      // Parse the RGB values
      const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        
        // Calculate relative luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        return luminance < 128;
      }
      
      return false;
    }
    
    function undo() {
      if (historyIndex >= 0) {
        const action = history[historyIndex];
        const pixel = gridContainer.children[action.index];
        pixel.style.backgroundColor = action.oldColor;
        
        // Update binary representation
        updateBinaryPixel(action.index, action.oldColor);
        
        historyIndex--;
        updateUndoRedoButtons();
        updateColorSet();
      }
    }
    
    function redo() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const action = history[historyIndex];
        const pixel = gridContainer.children[action.index];
        pixel.style.backgroundColor = action.newColor;
        
        // Update binary representation
        updateBinaryPixel(action.index, action.newColor);
        
        updateUndoRedoButtons();
        updateColorSet();
      }
    }
    
    function addToHistory(action) {
      // If we did some undos and then a new action, discard the "future" actions
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      
      history.push(action);
      historyIndex = history.length - 1;
      updateUndoRedoButtons();
    }
    
    function resetHistory() {
      history = [];
      historyIndex = -1;
      updateUndoRedoButtons();
    }
    
    function updateUndoRedoButtons() {
      undoButton.disabled = historyIndex < 0;
      redoButton.disabled = historyIndex >= history.length - 1;
    }
    
    function updateColorSet() {
      // Recalculate unique colors after undo/redo
      uniqueColors = new Set();
      for (let i = 0; i < gridContainer.children.length; i++) {
        const color = gridContainer.children[i].style.backgroundColor || "white";
        uniqueColors.add(color);
      }
    }
    
    function zoomGrid(factor, isMainGrid) {
      if (isMainGrid) {
        scale *= factor;
        scale = Math.min(Math.max(scale, 0.2), 5); // Limit zoom between 0.2x and 5x
        applyTransform();
      } else {
        binaryScale *= factor;
        binaryScale = Math.min(Math.max(binaryScale, 0.2), 5); // Limit zoom between 0.2x and 5x
        applyBinaryTransform();
      }
    }
    
    function applyTransform() {
      // Find the grid-with-axes element that contains the grid
      const gridWithAxes = gridContainer.closest('.grid-with-axes');
      if (gridWithAxes) {
        gridWithAxes.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        gridWithAxes.style.transformOrigin = "center";
      } else {
        // Fallback to the old behavior if grid-with-axes is not found
        gridContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        gridContainer.style.transformOrigin = "center";
      }
    }
    
    function applyBinaryTransform() {
      // Apply transform to binary grid with axes
      const binaryGridWithAxes = document.querySelector('.binary-grid-with-axes');
      if (binaryGridWithAxes) {
        binaryGridWithAxes.style.transform = `translate(${binaryPanX}px, ${binaryPanY}px) scale(${binaryScale})`;
        binaryGridWithAxes.style.transformOrigin = "center";
        
        // Set the overflow on the parent container to ensure it doesn't expand
        const binaryGridWrapper = binaryGridWithAxes.closest('.binary-grid-wrapper');
        if (binaryGridWrapper) {
          binaryGridWrapper.style.overflow = "hidden";
          binaryGridWrapper.style.position = "relative";
        }
      }
    }
    
    
    function resetView(isMainGrid) {
      if (isMainGrid) {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform();
      } else {
        binaryScale = 1;
        binaryPanX = 0;
        binaryPanY = 0;
        applyBinaryTransform();
      }
    }
  
    function downloadPixelArt() {
      // Create a canvas of the pixel art
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = currentSize;
      const pixelSize = 400 / size;
  
      canvas.width = 400;
      canvas.height = 400;
  
      // Fill canvas with white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Draw each pixel
      const pixels = document.querySelectorAll(".pixel");
      pixels.forEach((pixel, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        ctx.fillStyle = pixel.style.backgroundColor || "white";
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      });
  
      // Create download link
      const link = document.createElement("a");
      link.download = "pixel-art.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  }
  
  // ===== Resizing Demo Section =====
  function initResizingDemo() {
    const originalCanvas = document.getElementById("original-canvas");
    const enlargedCanvas = document.getElementById("enlarged-canvas");
    const reducedCanvas = document.getElementById("reduced-canvas");
    const colorPicker = document.getElementById("resize-color-picker");
    const clearButton = document.getElementById("clear-original");
  
    const originalCtx = originalCanvas.getContext("2d");
    const enlargedCtx = enlargedCanvas.getContext("2d");
    const reducedCtx = reducedCanvas.getContext("2d");
  
    // Initialize canvases
    originalCtx.fillStyle = "white";
    originalCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
  
    enlargedCtx.fillStyle = "white";
    enlargedCtx.fillRect(0, 0, enlargedCanvas.width, enlargedCanvas.height);
  
    reducedCtx.fillStyle = "white";
    reducedCtx.fillRect(0, 0, reducedCanvas.width, reducedCanvas.height);
  
    // Variables for drawing
    let isDrawing = false;
    let currentColor = colorPicker.value;
    let lastX = 0;
    let lastY = 0;
  
    // Event listeners
    colorPicker.addEventListener("input", () => {
      currentColor = colorPicker.value;
    });
  
    clearButton.addEventListener("click", clearCanvas);
  
    originalCanvas.addEventListener("mousedown", startDrawing);
    originalCanvas.addEventListener("mousemove", draw);
    originalCanvas.addEventListener("mouseup", stopDrawing);
    originalCanvas.addEventListener("mouseout", stopDrawing);
  
    function startDrawing(e) {
      isDrawing = true;
      [lastX, lastY] = getMousePos(originalCanvas, e);
    }
  
    function draw(e) {
      if (!isDrawing) return;
  
      const [x, y] = getMousePos(originalCanvas, e);
  
      // Draw on original canvas
      originalCtx.strokeStyle = currentColor;
      originalCtx.lineWidth = 3;
      originalCtx.lineCap = "round";
      originalCtx.beginPath();
      originalCtx.moveTo(lastX, lastY);
      originalCtx.lineTo(x, y);
      originalCtx.stroke();
  
      lastX = x;
      lastY = y;
  
      // Update resized versions
      updateResizedCanvases();
    }
  
    function stopDrawing() {
      isDrawing = false;
    }
  
    function getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      return [
        ((evt.clientX - rect.left) / (rect.right - rect.left)) * canvas.width,
        ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height,
      ];
    }
  
    function clearCanvas() {
      originalCtx.fillStyle = "white";
      originalCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
      updateResizedCanvases();
    }
  
    function updateResizedCanvases() {
      // Clear enlarged canvas
      enlargedCtx.fillStyle = "white";
      enlargedCtx.fillRect(0, 0, enlargedCanvas.width, enlargedCanvas.height);
  
      // Draw enlarged version
      enlargedCtx.drawImage(
        originalCanvas,
        0,
        0,
        enlargedCanvas.width,
        enlargedCanvas.height
      );
  
      // Draw pixel grid on enlarged version to show pixelation
      const pixelSize = 8;
      enlargedCtx.strokeStyle = "rgba(200, 200, 200, 0.3)";
      enlargedCtx.lineWidth = 1;
  
      for (let x = 0; x < enlargedCanvas.width; x += pixelSize) {
        enlargedCtx.beginPath();
        enlargedCtx.moveTo(x, 0);
        enlargedCtx.lineTo(x, enlargedCanvas.height);
        enlargedCtx.stroke();
      }
  
      for (let y = 0; y < enlargedCanvas.height; y += pixelSize) {
        enlargedCtx.beginPath();
        enlargedCtx.moveTo(0, y);
        enlargedCtx.lineTo(enlargedCanvas.width, y);
        enlargedCtx.stroke();
      }
  
      // Clear reduced canvas
      reducedCtx.fillStyle = "white";
      reducedCtx.fillRect(0, 0, reducedCanvas.width, reducedCanvas.height);
  
      // Draw reduced version
      reducedCtx.drawImage(
        originalCanvas,
        0,
        0,
        reducedCanvas.width,
        reducedCanvas.height
      );
    }
  }
  
  // ===== Sampling Demo Section =====
  function initSamplingDemo() {
    const samplingCanvas = document.getElementById("sampling-canvas");
    const continuousCanvas = document.getElementById("continuous-canvas");
    const resolutionSlider = document.getElementById("resolution-slider");
    const resolutionValue = document.getElementById("resolution-value");
    const samplingTechnique = document.getElementById("sampling-technique");
    const functionSelect = document.getElementById("function-select");
    const animationToggle = document.getElementById("animation-toggle");
    const showFilterInfo = document.getElementById("show-filter-info");
    
    // Check if all required elements exist
    if (!samplingCanvas || !continuousCanvas || !resolutionSlider || 
        !resolutionValue || !samplingTechnique || !functionSelect || 
        !animationToggle || !showFilterInfo) {
      console.error("Some required elements for the sampling demo are missing");
      return;
    }
    
    // Set up canvas contexts
    const samplingCtx = samplingCanvas.getContext("2d");
    const continuousCtx = continuousCanvas.getContext("2d");
    
    // Set up resolution slider
    resolutionSlider.min = 8;
    resolutionSlider.max = 128;
    resolutionSlider.value = 32;
    
    // Animation variables
    let isAnimating = false;
    let animationId = null;
    let currentResolution = parseInt(resolutionSlider.value);
    
    // Initial render
    drawContinuousFunction(continuousCtx, continuousCanvas.width, continuousCanvas.height, functionSelect.value);
    renderSampledImage(currentResolution, samplingTechnique.value);
    
    // Event listeners
    resolutionSlider.addEventListener("input", () => {
      currentResolution = parseInt(resolutionSlider.value);
      resolutionValue.textContent = `${currentResolution}×${currentResolution}`;
      renderSampledImage(currentResolution, samplingTechnique.value);
    });
    
    samplingTechnique.addEventListener("change", () => {
      renderSampledImage(currentResolution, samplingTechnique.value);
    });
    
    functionSelect.addEventListener("change", () => {
      drawContinuousFunction(continuousCtx, continuousCanvas.width, continuousCanvas.height, functionSelect.value);
      renderSampledImage(currentResolution, samplingTechnique.value);
    });
    
    animationToggle.addEventListener("click", () => {
      if (isAnimating) {
        // Stop animation
        cancelAnimationFrame(animationId);
        isAnimating = false;
        animationToggle.textContent = "Start Animation";
      } else {
        // Start animation
        isAnimating = true;
        animationToggle.textContent = "Stop Animation";
        animateResolution();
      }
    });
    
    showFilterInfo.addEventListener("click", showFilterInformation);
    
    // Draw a continuous mathematical function
    function drawContinuousFunction(ctx, width, height, functionType) {
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      switch (functionType) {
        case "sine":
          drawSineWaveFunction(ctx, width, height);
          break;
        case "checkerboard":
          drawCheckerboardFunction(ctx, width, height);
          break;
        case "circles":
          drawConcentricCirclesFunction(ctx, width, height);
          break;
        case "scene":
          drawSimpleSceneFunction(ctx, width, height);
          break;
        default:
          drawSineWaveFunction(ctx, width, height);
      }
    }
    
    function drawSineWaveFunction(ctx, width, height) {
      // Draw a 2D sine wave pattern
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      
      const frequency = 10; // Number of waves
      
      // Draw the continuous function pixel by pixel
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          // Calculate sine wave value
          const xNorm = x / width * 2 * Math.PI * frequency;
          const yNorm = y / height * 2 * Math.PI * frequency;
          const value = Math.sin(xNorm) * Math.sin(yNorm);
          
          // Map value from [-1, 1] to [0, 255]
          const intensity = Math.floor((value + 1) * 127.5);
          
          // Set pixel color
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    function drawCheckerboardFunction(ctx, width, height) {
      // Draw a checkerboard pattern
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      
      const squareSize = 20; // Size of each square
      
      // Draw the continuous function pixel by pixel
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          // Calculate checkerboard value
          const xSquare = Math.floor(x / squareSize);
          const ySquare = Math.floor(y / height * (height / squareSize));
          const isBlack = (xSquare + ySquare) % 2 === 0;
          
          // Set pixel color
          ctx.fillStyle = isBlack ? "black" : "white";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    function drawConcentricCirclesFunction(ctx, width, height) {
      // Draw concentric circles
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2;
      const frequency = 15; // Number of circles
      
      // Draw the continuous function pixel by pixel
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          // Calculate distance from center
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate circle pattern value
          const value = Math.sin(distance / maxRadius * Math.PI * frequency);
          
          // Map value from [-1, 1] to [0, 255]
          const intensity = Math.floor((value + 1) * 127.5);
          
          // Set pixel color
          ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    function drawSimpleSceneFunction(ctx, width, height) {
      // Draw a simple scene with gradients and shapes
      
      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
      skyGradient.addColorStop(0, "#1e3c72");
      skyGradient.addColorStop(1, "#2a5298");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.6);
      
      // Ground
      const groundGradient = ctx.createLinearGradient(0, height * 0.6, 0, height);
      groundGradient.addColorStop(0, "#2ecc71");
      groundGradient.addColorStop(1, "#27ae60");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);
      
      // Sun
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.2, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // Mountains
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      ctx.lineTo(width * 0.3, height * 0.3);
      ctx.lineTo(width * 0.5, height * 0.5);
      ctx.lineTo(width * 0.7, height * 0.2);
      ctx.lineTo(width, height * 0.4);
      ctx.lineTo(width, height * 0.6);
      ctx.closePath();
      ctx.fill();
      
      // Tree
      drawTree(ctx, width * 0.2, height * 0.7, 50);
      drawTree(ctx, width * 0.5, height * 0.75, 40);
      drawTree(ctx, width * 0.8, height * 0.72, 45);
    }
    
    function drawTree(ctx, x, y, size) {
      // Tree trunk
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(x - size/10, y - size/2, size/5, size/2);
      
      // Tree foliage
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size/2, y - size/2);
      ctx.lineTo(x - size/2, y - size/2);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.8);
      ctx.lineTo(x + size/2, y - size/3);
      ctx.lineTo(x - size/2, y - size/3);
      ctx.closePath();
      ctx.fill();
    }
    
    // Render the sampled image based on the continuous function
    function renderSampledImage(resolution, technique) {
      // Create a temporary canvas for the sampled result
      const sampledCanvas = document.createElement("canvas");
      sampledCanvas.width = resolution;
      sampledCanvas.height = resolution;
      const sampledCtx = sampledCanvas.getContext("2d");
      
      // Clear the sampled canvas
      sampledCtx.fillStyle = "white";
      sampledCtx.fillRect(0, 0, resolution, resolution);
      
      // Get the continuous function data
      const continuousData = continuousCtx.getImageData(0, 0, continuousCanvas.width, continuousCanvas.height).data;
      
      // Sample the continuous function based on the technique
      const pixelSize = continuousCanvas.width / resolution;
      
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          let r = 0, g = 0, b = 0;
          
          if (technique === "point") {
            // Point sampling - just take the center point
            const centerX = Math.floor(x * pixelSize + pixelSize / 2);
            const centerY = Math.floor(y * pixelSize + pixelSize / 2);
            
            if (centerX < continuousCanvas.width && centerY < continuousCanvas.height) {
              const idx = (centerY * continuousCanvas.width + centerX) * 4;
              r = continuousData[idx];
              g = continuousData[idx + 1];
              b = continuousData[idx + 2];
            }
          } 
          else if (technique === "box") {
            // Box filter - average all pixels in the box
            let count = 0;
            
            for (let ky = 0; ky < pixelSize; ky++) {
              for (let kx = 0; kx < pixelSize; kx++) {
                const sampleX = Math.floor(x * pixelSize + kx);
                const sampleY = Math.floor(y * pixelSize + ky);
                
                if (sampleX < continuousCanvas.width && sampleY < continuousCanvas.height) {
                  const idx = (sampleY * continuousCanvas.width + sampleX) * 4;
                  r += continuousData[idx];
                  g += continuousData[idx + 1];
                  b += continuousData[idx + 2];
                  count++;
                }
              }
            }
            
            if (count > 0) {
              r = Math.round(r / count);
              g = Math.round(g / count);
              b = Math.round(b / count);
            }
          } 
          else if (technique === "gaussian") {
            // Gaussian filter - weighted average with Gaussian kernel
            let totalWeight = 0;
            const sigma = pixelSize / 3; // Standard deviation
            
            for (let ky = -Math.floor(pixelSize); ky <= Math.floor(pixelSize); ky++) {
              for (let kx = -Math.floor(pixelSize); kx <= Math.floor(pixelSize); kx++) {
                const sampleX = Math.floor(x * pixelSize + pixelSize / 2 + kx);
                const sampleY = Math.floor(y * pixelSize + pixelSize / 2 + ky);
                
                if (sampleX >= 0 && sampleX < continuousCanvas.width && 
                    sampleY >= 0 && sampleY < continuousCanvas.height) {
                  // Calculate Gaussian weight
                  const distance = Math.sqrt(kx * kx + ky * ky);
                  const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));
                  
                  const idx = (sampleY * continuousCanvas.width + sampleX) * 4;
                  r += continuousData[idx] * weight;
                  g += continuousData[idx + 1] * weight;
                  b += continuousData[idx + 2] * weight;
                  totalWeight += weight;
                }
              }
            }
            
            if (totalWeight > 0) {
              r = Math.round(r / totalWeight);
              g = Math.round(g / totalWeight);
              b = Math.round(b / totalWeight);
            }
          }
          
          // Set the pixel color in the sampled image
          sampledCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          sampledCtx.fillRect(x, y, 1, 1);
        }
      }
      
      // Scale up the sampled image to the display size
      samplingCtx.clearRect(0, 0, samplingCanvas.width, samplingCanvas.height);
      
      // Use nearest-neighbor scaling to show the pixels clearly
      samplingCtx.imageSmoothingEnabled = false;
      samplingCtx.drawImage(sampledCanvas, 0, 0, samplingCanvas.width, samplingCanvas.height);
      
      // Draw grid lines to show the pixels
      if (resolution <= 64) {
        samplingCtx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        samplingCtx.lineWidth = 0.5;
        
        const cellSize = samplingCanvas.width / resolution;
        
        for (let i = 1; i < resolution; i++) {
          // Vertical lines
          samplingCtx.beginPath();
          samplingCtx.moveTo(i * cellSize, 0);
          samplingCtx.lineTo(i * cellSize, samplingCanvas.height);
          samplingCtx.stroke();
          
          // Horizontal lines
          samplingCtx.beginPath();
          samplingCtx.moveTo(0, i * cellSize);
          samplingCtx.lineTo(samplingCanvas.width, i * cellSize);
          samplingCtx.stroke();
        }
      }
    }
    
    function showFilterInformation() {
      // Create modal for filter information
      const modal = document.createElement("div");
      modal.className = "filter-info-modal";
      
      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";
      
      const closeButton = document.createElement("span");
      closeButton.className = "close-button";
      closeButton.innerHTML = "&times;";
      closeButton.addEventListener("click", () => {
        document.body.removeChild(modal);
      });
      
      modalContent.innerHTML = `
        <h3>Sampling Techniques Explained</h3>
        <p>Sampling is the process of converting continuous data into discrete pixels. Different sampling techniques produce different results:</p>
        
        <h4>Point Sampling</h4>
        <p>Takes a single sample at the center of each pixel. Fast but prone to aliasing (jagged edges and moiré patterns).</p>
        
        <h4>Box Filter</h4>
        <p>Averages all points within each pixel area. Reduces aliasing but can cause blurring.</p>
        
        <h4>Gaussian Filter</h4>
        <p>Weighted average with more weight given to points near the center. Produces smoother results than box filter but may lose some detail.</p>
        
        <div class="filter-diagrams"></div>
      `;
      
      modalContent.appendChild(closeButton);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Draw filter diagrams
      drawFilterDiagrams();
    }
    
    function drawFilterDiagrams() {
      const diagramsContainer = document.querySelector(".filter-diagrams");
      if (!diagramsContainer) return;
      
      // Create canvases for each filter type
      const filters = ["point", "box", "gaussian"];
      const size = 100;
      
      filters.forEach(filter => {
        const container = document.createElement("div");
        container.className = "filter-diagram";
        
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        
        // Draw the filter kernel visualization
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);
        
        const center = size / 2;
        
        if (filter === "point") {
          // Point sampling - just a single point
          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.arc(center, center, 3, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (filter === "box") {
          // Box filter - uniform square
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(center - 15, center - 15, 30, 30);
        } 
        else if (filter === "gaussian") {
          // Gaussian filter - gradient circle
          const radius = 20;
          const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
          gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(center, center, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        container.appendChild(canvas);
        
        const label = document.createElement("p");
        label.textContent = filter.charAt(0).toUpperCase() + filter.slice(1);
        container.appendChild(label);
        
        diagramsContainer.appendChild(container);
      });
    }
    
    function animateResolution() {
      // Animate resolution changes
      function animate() {
        // Change resolution over time
        const time = Date.now() / 1000;
        const minRes = 8;
        const maxRes = 64;
        const range = maxRes - minRes;
        
        // Oscillate between min and max resolution
        const oscillation = Math.sin(time * 0.5) * 0.5 + 0.5; // [0, 1]
        const newResolution = Math.floor(minRes + oscillation * range);
        
        // Update slider and resolution
        resolutionSlider.value = newResolution;
        currentResolution = newResolution;
        resolutionValue.textContent = `${newResolution}×${newResolution}`;
        
        // Render with new resolution
        renderSampledImage(newResolution, samplingTechnique.value);
        
        // Continue animation
        if (isAnimating) {
          animationId = requestAnimationFrame(animate);
        }
      }
      
      animate();
    }
  }
  
  

    setupGridContainers();
  // ===== Color Depth Demo Section =====
  function initColorDepthDemo() {
    const sourceImage = document.getElementById("depth-source-image");
    const depthCanvas = document.getElementById("depth-canvas");
    const bitDepthSelect = document.getElementById("bit-depth");
    const applyButton = document.getElementById("apply-bit-depth");
    const imageSelect = document.getElementById("image-select");
    const fileSizeDisplay = document.getElementById("file-size");
    const compressionRatioDisplay = document.getElementById("compression-ratio");
  
    // Check if all required elements exist
    if (!sourceImage || !depthCanvas || !bitDepthSelect || !applyButton || 
        !imageSelect || !fileSizeDisplay || !compressionRatioDisplay) {
      console.error("Some required elements for the color depth demo are missing");
      return;
    }
  
    // Create local images instead of using external URLs
    const imageUrls = {
      landscape: null,
      portrait: null,
      colorful: null,
      gradient: null
    };
    
    // Create a landscape image
    const landscapeCanvas = document.createElement("canvas");
    landscapeCanvas.width = 400;
    landscapeCanvas.height = 400;
    const landscapeCtx = landscapeCanvas.getContext("2d");
    
    // Draw a simple landscape
    const skyGradient = landscapeCtx.createLinearGradient(0, 0, 0, 300);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#E0F7FF");
    landscapeCtx.fillStyle = skyGradient;
    landscapeCtx.fillRect(0, 0, 400, 300);
    
    // Ground
    landscapeCtx.fillStyle = "#228B22";
    landscapeCtx.fillRect(0, 300, 400, 100);
    
    // Sun
    landscapeCtx.fillStyle = "#FFD700";
    landscapeCtx.beginPath();
    landscapeCtx.arc(300, 80, 40, 0, Math.PI * 2);
    landscapeCtx.fill();
    
    // Mountains
    landscapeCtx.fillStyle = "#808080";
    landscapeCtx.beginPath();
    landscapeCtx.moveTo(0, 300);
    landscapeCtx.lineTo(150, 150);
    landscapeCtx.lineTo(250, 250);
    landscapeCtx.lineTo(350, 180);
    landscapeCtx.lineTo(400, 300);
    landscapeCtx.closePath();
    landscapeCtx.fill();
    
    // Store the landscape as a data URL
    imageUrls.landscape = landscapeCanvas.toDataURL();
    
    // Create a portrait image
    const portraitCanvas = document.createElement("canvas");
    portraitCanvas.width = 400;
    portraitCanvas.height = 400;
    const portraitCtx = portraitCanvas.getContext("2d");
    
    // Background
    portraitCtx.fillStyle = "#F5F5DC";
    portraitCtx.fillRect(0, 0, 400, 400);
    
    // Face
    portraitCtx.fillStyle = "#FFC0CB";
    portraitCtx.beginPath();
    portraitCtx.arc(200, 180, 120, 0, Math.PI * 2);
    portraitCtx.fill();
    
    // Eyes
    portraitCtx.fillStyle = "white";
    portraitCtx.beginPath();
    portraitCtx.arc(160, 160, 20, 0, Math.PI * 2);
    portraitCtx.arc(240, 160, 20, 0, Math.PI * 2);
    portraitCtx.fill();
    
    portraitCtx.fillStyle = "#1E90FF";
    portraitCtx.beginPath();
    portraitCtx.arc(160, 160, 10, 0, Math.PI * 2);
    portraitCtx.arc(240, 160, 10, 0, Math.PI * 2);
    portraitCtx.fill();
    
    // Mouth
    portraitCtx.strokeStyle = "#FF6347";
    portraitCtx.lineWidth = 5;
    portraitCtx.beginPath();
    portraitCtx.arc(200, 220, 50, 0.2 * Math.PI, 0.8 * Math.PI);
    portraitCtx.stroke();
    
    // Hair
    portraitCtx.fillStyle = "#8B4513";
    portraitCtx.beginPath();
    portraitCtx.arc(200, 120, 100, Math.PI, 2 * Math.PI);
    portraitCtx.fill();
    
    // Store the portrait as a data URL
    imageUrls.portrait = portraitCanvas.toDataURL();
    
    // Create a colorful image
    const colorfulCanvas = document.createElement("canvas");
    colorfulCanvas.width = 400;
    colorfulCanvas.height = 400;
    const colorfulCtx = colorfulCanvas.getContext("2d");
    
    // Draw colorful squares
    const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"];
    const squareSize = 400 / colors.length;
    
    for (let i = 0; i < colors.length; i++) {
      colorfulCtx.fillStyle = colors[i];
      colorfulCtx.fillRect(0, i * squareSize, 400, squareSize);
    }
    
    // Add some circles for visual interest
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 400;
      const radius = 10 + Math.random() * 30;
      
      colorfulCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      colorfulCtx.globalAlpha = 0.6;
      colorfulCtx.beginPath();
      colorfulCtx.arc(x, y, radius, 0, Math.PI * 2);
      colorfulCtx.fill();
    }
    
    colorfulCtx.globalAlpha = 1.0;
    
    // Store the colorful image as a data URL
    imageUrls.colorful = colorfulCanvas.toDataURL();
    
    // Create a gradient pattern for the "gradient" option
    const gradientCanvas = document.createElement("canvas");
    gradientCanvas.width = 400;
    gradientCanvas.height = 400;
    const gradientCtx = gradientCanvas.getContext("2d");
    
    // Create a colorful gradient
    const gradient = gradientCtx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, "#f1c40f");
    gradient.addColorStop(0.25, "#e74c3c");
    gradient.addColorStop(0.5, "#9b59b6");
    gradient.addColorStop(0.75, "#3498db");
    gradient.addColorStop(1, "#2ecc71");
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, 400, 400);
    
    // Add a simple pattern overlay
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x + y) % 2 === 0) {
          gradientCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
          gradientCtx.fillRect(x * 50, y * 50, 50, 50);
        }
      }
    }
    
    // Store the gradient as a data URL
    imageUrls.gradient = gradientCanvas.toDataURL();
  
    const ctx = depthCanvas.getContext("2d");
    let originalImageData = null;
    let originalFileSize = 0;
  
    // Apply bit depth when button is clicked
    applyButton.addEventListener("click", () => {
      const bitDepth = parseInt(bitDepthSelect.value);
      applyBitDepth(bitDepth);
    });
    
    // Change image when selection changes
    imageSelect.addEventListener("change", () => {
      loadSelectedImage();
    });
  
    // Initial image load
    loadSelectedImage();
    
    // Function to load the selected image
    function loadSelectedImage() {
      const selectedImage = imageSelect.value;
      sourceImage.src = imageUrls[selectedImage];
      
      // Wait for image to load
      sourceImage.onload = () => {
        // Draw original image to canvas
        ctx.drawImage(sourceImage, 0, 0, depthCanvas.width, depthCanvas.height);
        
        // Store original image data for comparison
        originalImageData = ctx.getImageData(0, 0, depthCanvas.width, depthCanvas.height);
        
        // Calculate original file size (approximate)
        originalFileSize = (depthCanvas.width * depthCanvas.height * 3) / 1024; // KB (24-bit)
        
        // Apply current bit depth
        const bitDepth = parseInt(bitDepthSelect.value);
        applyBitDepth(bitDepth);
      };
    }
  
    function applyBitDepth(bitDepth) {
      // Draw original image
      if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
      } else {
        ctx.drawImage(sourceImage, 0, 0, depthCanvas.width, depthCanvas.height);
      }
  
      // Get image data
      const imageData = ctx.getImageData(
        0,
        0,
        depthCanvas.width,
        depthCanvas.height
      );
      const data = imageData.data;
  
      // Calculate color levels based on bit depth
      const levelsPerChannel = Math.floor(Math.pow(2, bitDepth / 3));
      const factor = 255 / (levelsPerChannel - 1);
      
      // For non-divisible bit depths, calculate levels for each channel
      let levelsR, levelsG, levelsB;
      if (bitDepth % 3 === 0) {
        // Equal distribution
        levelsR = levelsG = levelsB = levelsPerChannel;
      } else if (bitDepth % 3 === 1) {
        // More levels for green (human eyes are more sensitive to green)
        levelsR = levelsPerChannel;
        levelsG = levelsPerChannel * 2;
        levelsB = levelsPerChannel;
      } else { // bitDepth % 3 === 2
        // More levels for green and red
        levelsR = levelsPerChannel * 2;
        levelsG = levelsPerChannel * 2;
        levelsB = levelsPerChannel;
      }
      
      const factorR = 255 / (levelsR - 1);
      const factorG = 255 / (levelsG - 1);
      const factorB = 255 / (levelsB - 1);
  
      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        // Special case for 1-bit (black and white)
        if (bitDepth === 1) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const bw = avg > 127 ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = bw;
        } else {
          // For other bit depths, quantize each channel separately
          data[i] = Math.round(data[i] / factorR) * factorR;       // Red
          data[i + 1] = Math.round(data[i + 1] / factorG) * factorG; // Green
          data[i + 2] = Math.round(data[i + 2] / factorB) * factorB; // Blue
        }
      }
  
      // Put the processed data back
      ctx.putImageData(imageData, 0, 0);
      
      // Update file size information
      const reducedFileSize = (depthCanvas.width * depthCanvas.height * bitDepth / 8) / 1024; // KB
      fileSizeDisplay.textContent = reducedFileSize.toFixed(2);
      
      // Calculate and display compression ratio
      const compressionRatio = (reducedFileSize / originalFileSize) * 100;
      compressionRatioDisplay.textContent = `(${compressionRatio.toFixed(1)}% of original)`;
    }
  }
  
  // Add this new function for binary grid panning
  function addBinaryPanningEventListeners(binaryGridWithAxes) {
    if (binaryGridWithAxes) {
      // Add wheel event for binary grid zooming
      binaryGridWithAxes.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomGrid(zoomFactor, false);
      });
      
      // Add mousedown event for binary grid panning with better event handling
      binaryGridWithAxes.addEventListener("mousedown", (e) => {
        // Explicitly check for middle button (button 1) or left button with Space modifier
        if (e.button === 1 || (e.button === 0 && e.getModifierState("Space"))) {
          // Prevent default browser behavior
          e.preventDefault();
          e.stopPropagation();
          
          // Set panning variables
          isBinaryPanning = true;
          startBinaryPanX = e.clientX - binaryPanX;
          startBinaryPanY = e.clientY - binaryPanY;
          binaryGridWithAxes.style.cursor = "grabbing";
          
          // Add specific listeners for this panning session
          document.addEventListener("mousemove", handleBinaryPanMove);
          document.addEventListener("mouseup", handleBinaryPanEnd);
        }
      });
      
      // Still add mouseleave event for safety
      binaryGridWithAxes.addEventListener("mouseleave", () => {
        if (isBinaryPanning) {
          isBinaryPanning = false;
          binaryGridWithAxes.style.cursor = "default";
          
          // Clean up event listeners
          document.removeEventListener("mousemove", handleBinaryPanMove);
          document.removeEventListener("mouseup", handleBinaryPanEnd);
        }
      });
    }
  }
  
  // Add these helper functions for binary panning
  function handleBinaryPanMove(e) {
    if (isBinaryPanning) {
      e.preventDefault();
      binaryPanX = e.clientX - startBinaryPanX;
      binaryPanY = e.clientY - startBinaryPanY;
      applyBinaryTransform();
    }
  }
  
  function handleBinaryPanEnd(e) {
    if (isBinaryPanning) {
      e.preventDefault();
      isBinaryPanning = false;
      
      const binaryGridWithAxes = document.querySelector('.binary-grid-with-axes');
      if (binaryGridWithAxes) {
        binaryGridWithAxes.style.cursor = e.getModifierState("Space") ? "grab" : "default";
      }
      
      // Clean up event listeners
      document.removeEventListener("mousemove", handleBinaryPanMove);
      document.removeEventListener("mouseup", handleBinaryPanEnd);
    }
  }
  
  