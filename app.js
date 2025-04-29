document.addEventListener('DOMContentLoaded', () => {
    const formSection = document.getElementById('form-section');
    const resultsSection = document.getElementById('results-section');
    const calculatorForm = document.getElementById('calculator-form');
    const startOverButton = document.getElementById('start-over');

    // --- Core Calculation Logic (from calculator-core.js) --- 

    /**
     * Formats a number as a currency string (USD).
     */
    function formatCurrency(amount) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            return "$0.00"; 
        }
        return numAmount.toLocaleString("en-US", { style: "currency", currency: "USD" });
    }

    /**
     * Calculates the maintenance fee inflation projection.
     */
    function calculateInflationProjection(initialFee, inflationRate, years) {
        let projection = [];
        let annualCost = parseFloat(initialFee) || 0;
        let cumulativeCost = 0;
        let prevYearCost = annualCost * (1 + inflationRate); // Cost for Year 1

        for (let i = 1; i <= years; i++) {
            if (i === 1) {
                annualCost = prevYearCost;
                cumulativeCost = 0; // As per spreadsheet
            } else {
                annualCost = prevYearCost * (1 + inflationRate);
                cumulativeCost += prevYearCost; // Add the *previous* year's cost to cumulative
            }
            projection.push({
                year: i,
                annualCost: annualCost,
                cumulativeCost: cumulativeCost
            });
            prevYearCost = annualCost; // Update for next iteration
        }
        return projection;
    }

    /**
     * Calculates termination costs.
     */
    function calculateTerminationCosts(resortIndex, annualFee) {
        let liquidationCost = 0;
        let transferFees = 1800;
        let processingFee = 449;
        let mra = 0; 
        let inflationRate = 0.092; 
        const currentAnnualFee = parseFloat(annualFee) || 0;

        // Values based on user's spreadsheet (Drop Sheet 1 & 2)
        if (resortIndex === 0) { // Assumed Resort 1 corresponds to Drop Sheet 1 (WYNDHAM)
            liquidationCost = 84569.5065; 
            mra = 27464.67;
            inflationRate = 0.095;
        } else if (resortIndex === 1) { // Assumed Resort 2 corresponds to Drop Sheet 2 (GASLAMP)
            liquidationCost = 0; 
            mra = 37552.27;
            inflationRate = 0.091;
        } 
        // Add more else if blocks here if there are more resort sheets

        const projection = calculateInflationProjection(currentAnnualFee, inflationRate, 30);
        const totalCostOfOwnership = projection.length > 0 ? projection[projection.length - 1].cumulativeCost : 0;
        const grossLiquidationPrice = liquidationCost + transferFees + processingFee;
        const netTermination = grossLiquidationPrice - mra; 

        return {
            resortIndex: resortIndex,
            annualFee: currentAnnualFee,
            inflationRate: inflationRate,
            totalCostOfOwnership: totalCostOfOwnership,
            liquidationCost: liquidationCost,
            transferFees: transferFees,
            processingFee: processingFee,
            grossLiquidationPrice: grossLiquidationPrice,
            mra: mra,
            netTermination: netTermination
        };
    }

    // --- Display Logic --- 

    /**
     * Populates Page 1 (Overall Projection).
     */
    function displayPage1(data) {
        let ownerNames = [data.owner1Name, data.owner2Name].filter(Boolean).join(", ");
        document.getElementById("ownerName").textContent = ownerNames || "N/A";
        
        let totalInitialFee = parseFloat(data.maintenanceFee) || 0;
        document.getElementById("totalInitialFee").textContent = formatCurrency(totalInitialFee);
        
        const overallInflationRate = 0.092; // Default overall rate
        const projection = calculateInflationProjection(totalInitialFee, overallInflationRate, 30);
        const tableBody = document.getElementById("projectionTableBody");
        tableBody.innerHTML = ""; 
        projection.forEach(item => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = item.year;
            row.insertCell().textContent = formatCurrency(item.annualCost);
            row.insertCell().textContent = item.year === 1 ? formatCurrency(0) : formatCurrency(item.cumulativeCost);
        });
    }

    /**
     * Generic function to populate a resort comparison page.
     */
    function displayResortComparisonPage(data, resortIndex, pageId) {
        const resort = data.resorts[resortIndex];
        if (!resort || !resort.name) {
             // Hide the page if resort data is missing
             const pageElement = document.getElementById(`${pageId}Content`);
             if(pageElement) pageElement.style.display = 'none';
             return; 
        }

        // Ensure page is visible if data exists
        const pageElement = document.getElementById(`${pageId}Content`);
        if(pageElement) pageElement.style.display = 'block';

        // Calculate the fee for this specific resort (assuming total fee is split if two resorts)
        const numResorts = data.resorts.length;
        const feePerResort = (parseFloat(data.maintenanceFee) || 0) / numResorts;
        const annualFee = feePerResort;

        let ownerNames = [data.owner1Name, data.owner2Name].filter(Boolean).join(", ");
        document.getElementById(`${pageId}OwnerName`).textContent = ownerNames || "N/A";
        document.getElementById(`${pageId}ResortName`).textContent = resort.name || "N/A";
        document.getElementById(`${pageId}ResortFee`).textContent = formatCurrency(annualFee);
        
        const costs = calculateTerminationCosts(resortIndex, annualFee);
        document.getElementById(`${pageId}InflationRate`).textContent = (costs.inflationRate * 100).toFixed(1) + "%";
        document.getElementById(`${pageId}Option1AnnualFee`).textContent = formatCurrency(annualFee);
        document.getElementById(`${pageId}Option1TotalCost`).textContent = formatCurrency(costs.totalCostOfOwnership);
        document.getElementById(`${pageId}Option2LiquidationCost`).textContent = formatCurrency(costs.liquidationCost);
        document.getElementById(`${pageId}Option2TransferFees`).textContent = formatCurrency(costs.transferFees);
        document.getElementById(`${pageId}Option2ProcessingFee`).textContent = formatCurrency(costs.processingFee);
        document.getElementById(`${pageId}Option2GrossLiquidation`).textContent = formatCurrency(costs.grossLiquidationPrice);
        document.getElementById(`${pageId}Option2MRA`).textContent = formatCurrency(costs.mra);
        document.getElementById(`${pageId}Option2NetTermination`).textContent = formatCurrency(costs.netTermination);
    }

    // --- Event Handlers --- 

    calculatorForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        // Capture form data
        const formData = new FormData(calculatorForm);
        const data = {
            owner1Name: formData.get('owner1Name'),
            owner2Name: formData.get('owner2Name'),
            maintenanceFee: formData.get('maintenanceFee'),
            resorts: [
                { name: formData.get('resort1Name') },
                { name: formData.get('resort2Name') }
            ].filter(r => r.name && r.name.trim() !== '') // Only include resorts with names
        };

        // Perform calculations and display results
        displayPage1(data);
        displayResortComparisonPage(data, 0, 'page2'); // Display Resort 1
        displayResortComparisonPage(data, 1, 'page3'); // Display Resort 2 (will hide if no name)

        // Switch views
        formSection.style.display = 'none';
        resultsSection.style.display = 'block';
    });

    startOverButton.addEventListener('click', () => {
        // Reset form
        calculatorForm.reset();
        
        // Clear results (optional, but good practice)
        document.getElementById("ownerName").textContent = '';
        document.getElementById("totalInitialFee").textContent = '';
        document.getElementById("projectionTableBody").innerHTML = '';
        // Add clearing for page 2 and 3 elements if needed

        // Switch views back
        resultsSection.style.display = 'none';
        formSection.style.display = 'block';
    });

    console.log("Iframe Calculator App Initialized");
});
