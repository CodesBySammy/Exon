document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadForm = document.getElementById('uploadForm');
    const excelFileInput = document.getElementById('excelFile');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingIndicator = document.getElementById('loading');
    const mappingSection = document.getElementById('mapping-section');
    const attributesContainer = document.getElementById('attributes-container');
    const convertBtn = document.getElementById('convertBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultSection = document.getElementById('result-section');
    const downloadBtn = document.getElementById('downloadBtn');
    const newConversionBtn = document.getElementById('newConversionBtn');
    const jsonPreview = document.getElementById('jsonPreview');
    const selectAllBtn = document.getElementById('selectAll');
    const deselectAllBtn = document.getElementById('deselectAll');

    // State variables
    let excelData = null;
    let mappedAttributes = [];
    let convertedJson = null;

    // Display selected file name
    excelFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
        } else {
            fileNameDisplay.textContent = 'No file chosen';
        }
    });

    // Load required libraries dynamically
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Process Excel file in browser
    async function processExcelFile(file) {
        try {
            // Load required libraries if they're not already loaded
            if (!window.XLSX) {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Get first sheet
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // Convert to JSON
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                        
                        // Extract headers (first row)
                        const headers = jsonData[0];
                        
                        // Extract data rows
                        const rows = jsonData.slice(1).map(row => {
                            const rowData = {};
                            headers.forEach((header, index) => {
                                rowData[header] = row[index];
                            });
                            return rowData;
                        });
                        
                        resolve({
                            columns: headers,
                            data: rows
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            throw new Error(`Error processing Excel file: ${error.message}`);
        }
    }

    // Handle form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('excelFile');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an Excel file');
            return;
        }
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        try {
            // Process file in browser
            excelData = await processExcelFile(file);
            
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            // Generate attribute mapping UI
            generateAttributeMapping(excelData.columns);
            
            // Show mapping section
            mappingSection.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing file: ' + error.message);
            loadingIndicator.classList.add('hidden');
        }
    });

    // Generate attribute mapping UI
    function generateAttributeMapping(columns) {
        attributesContainer.innerHTML = '';
        mappedAttributes = [];
        
        columns.forEach(column => {
            // Create a mapping entry for each column
            const attributeRow = document.createElement('div');
            attributeRow.className = 'attribute-row';
            
            // Create label with checkbox
            const label = document.createElement('label');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.dataset.column = column;
            
            // Excel column name display
            const excelColumnSpan = document.createElement('span');
            excelColumnSpan.className = 'excel-column';
            excelColumnSpan.textContent = column;
            
            label.appendChild(checkbox);
            label.appendChild(excelColumnSpan);
            
            // JSON attribute input field
            const jsonAttributeDiv = document.createElement('div');
            jsonAttributeDiv.className = 'json-attribute';
            
            const attributeInput = document.createElement('input');
            attributeInput.type = 'text';
            attributeInput.value = column.toLowerCase().replace(/\s+/g, '_');
            attributeInput.dataset.column = column;
            
            jsonAttributeDiv.appendChild(attributeInput);
            
            // Add to row
            attributeRow.appendChild(label);
            attributeRow.appendChild(jsonAttributeDiv);
            
            // Add to container
            attributesContainer.appendChild(attributeRow);
            
            // Add to mapped attributes
            mappedAttributes.push({
                excelColumn: column,
                jsonAttribute: attributeInput.value,
                include: true
            });
            
            // Add event listeners for changes
            checkbox.addEventListener('change', (e) => {
                const index = mappedAttributes.findIndex(item => item.excelColumn === column);
                if (index !== -1) {
                    mappedAttributes[index].include = e.target.checked;
                    
                    // Toggle disabled state of the corresponding input
                    attributeInput.disabled = !e.target.checked;
                    if (!e.target.checked) {
                        attributeInput.classList.add('disabled');
                    } else {
                        attributeInput.classList.remove('disabled');
                    }
                }
            });
            
            attributeInput.addEventListener('input', (e) => {
                const index = mappedAttributes.findIndex(item => item.excelColumn === column);
                if (index !== -1) {
                    mappedAttributes[index].jsonAttribute = e.target.value;
                }
            });
        });
    }
    
    // Select/Deselect All buttons
    selectAllBtn.addEventListener('click', () => {
        const checkboxes = attributesContainer.querySelectorAll('input[type="checkbox"]');
        const inputs = attributesContainer.querySelectorAll('.json-attribute input');
        
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = true;
            inputs[index].disabled = false;
            inputs[index].classList.remove('disabled');
            
            const columnName = checkbox.dataset.column;
            const mappedIndex = mappedAttributes.findIndex(item => item.excelColumn === columnName);
            if (mappedIndex !== -1) {
                mappedAttributes[mappedIndex].include = true;
            }
        });
    });
    
    deselectAllBtn.addEventListener('click', () => {
        const checkboxes = attributesContainer.querySelectorAll('input[type="checkbox"]');
        const inputs = attributesContainer.querySelectorAll('.json-attribute input');
        
        checkboxes.forEach((checkbox, index) => {
            checkbox.checked = false;
            inputs[index].disabled = true;
            inputs[index].classList.add('disabled');
            
            const columnName = checkbox.dataset.column;
            const mappedIndex = mappedAttributes.findIndex(item => item.excelColumn === columnName);
            if (mappedIndex !== -1) {
                mappedAttributes[mappedIndex].include = false;
            }
        });
    });
    
    // Convert button event listener
    convertBtn.addEventListener('click', () => {
        try {
            // Filter out excluded attributes
            const finalMappings = mappedAttributes.filter(item => item.include);
            
            // Ensure at least one attribute is selected
            if (finalMappings.length === 0) {
                alert('Please select at least one attribute to include in the JSON');
                return;
            }
            
            // Show loading
            loadingIndicator.classList.remove('hidden');
            mappingSection.classList.add('hidden');
            
            // Process the conversion in browser
            const result = excelData.data.map(row => {
                const mappedRow = {};
                
                finalMappings.forEach(mapping => {
                    if (row.hasOwnProperty(mapping.excelColumn)) {
                        mappedRow[mapping.jsonAttribute] = row[mapping.excelColumn];
                    }
                });
                
                return mappedRow;
            });
            
            convertedJson = result;
            
            // Hide loading and show result
            loadingIndicator.classList.add('hidden');
            resultSection.classList.remove('hidden');
            
            // Display JSON preview (limit to first 5 items for large datasets)
            const previewData = convertedJson.length > 5 
                ? [...convertedJson.slice(0, 5), '... (truncated for preview)'] 
                : convertedJson;
            
            jsonPreview.textContent = JSON.stringify(previewData, null, 2);
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error converting data: ' + error.message);
            loadingIndicator.classList.add('hidden');
            mappingSection.classList.remove('hidden');
        }
    });
    
    // Download button event listener
    downloadBtn.addEventListener('click', () => {
        if (!convertedJson) return;
        
        const jsonStr = JSON.stringify(convertedJson, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted_data.json';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    });
    
    // Reset and New Conversion buttons
    resetBtn.addEventListener('click', () => {
        mappingSection.classList.add('hidden');
        fileNameDisplay.textContent = 'No file chosen';
        excelFileInput.value = '';
        attributesContainer.innerHTML = '';
        excelData = null;
        mappedAttributes = [];
    });
    
    newConversionBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        fileNameDisplay.textContent = 'No file chosen';
        excelFileInput.value = '';
        attributesContainer.innerHTML = '';
        excelData = null;
        mappedAttributes = [];
        convertedJson = null;
    });
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
  
  // PWA Installation Button Functionality
  let deferredPrompt;
  const installButton = document.getElementById('installButton');
  
  // Make sure the button exists
  if (installButton) {
    // Initially show the button for better visibility (remove this in production if you want)
    installButton.style.display = 'block';
    
    // Check if the app can be installed
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      console.log('App is installable! beforeinstallprompt event fired');
      
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      
      // Show the install button
      installButton.style.display = 'block';
    });
  
    // Handle the install button click
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log('No installation prompt available yet');
        return;
      }
      
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // We've used the prompt, and can't use it again, so clear it
      deferredPrompt = null;
      
      // Hide the install button
      installButton.style.display = 'none';
    });
  
    // Hide the button when the app is installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      installButton.style.display = 'none';
    });
  } else {
    console.error('Install button not found. Make sure to add a button with id="installButton" to your HTML');
  }
  
  // This ensures the button is visible initially, but will be hidden if not installable
  // after a short delay (gives time for the beforeinstallprompt event to fire)
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (installButton && !deferredPrompt) {
        // If after 3 seconds we still don't have an install prompt
        // and we're in a browser that supports PWA but it's already installed,
        // hide the button
        if ('serviceWorker' in navigator && window.matchMedia('(display-mode: browser)').matches) {
          // Check if we're in standalone mode already (app installed)
          if (window.matchMedia('(display-mode: standalone)').matches) {
            installButton.style.display = 'none';
          }
        }
      }
    }, 3000);
  });