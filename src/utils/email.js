/**
 * Sends a request to the Next.js API route to initiate an email send operation.
 * * @param {string} templateId - The type of email being sent (e.g., 'PRODUCT_DELIST', 'CUSTOM_OUTREACH').
 * @param {object} formData - The data collected from the admin form.
 * @returns {object} The JSON response body from the API.
 */
export async function sendEmail(templateId, formData) {
    // Determine the correct API endpoint based on the template type
    // We are currently only supporting 'send-adhoc' for the product delisting and one off message logic.
    // Future template IDs will need new routes or a consolidated route.
    const endpoint = '/api/email/send-adhoc'; 
    
    // For the initial MVP, we pass all relevant form data to the single route.
    // The API route will consume the specific fields it needs (productId, delistReason, etc.).

    const payload = {
        templateId: templateId,
        ...formData
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            // Throw an error if the HTTP status is not 2xx
            const error = new Error(data.error || 'API call failed');
            error.details = data.details;
            throw error;
        }

        return data; // Returns { message: '...', messageId: '...' }

    } catch (error) {
        console.error('Error in sendEmail utility:', error);
        throw new Error(`Email sending failed: ${error.details || error.message}`);
    }
}

// Future Bulk Send Utility (Placeholder)
export async function sendBulkEmail(formData) {
    // This will call the future /api/email/send-bulk endpoint
    console.log('Bulk send utility triggered. Implement API call to /api/email/send-bulk here.');
    return { status: 'queued', message: 'Bulk job initiated.' };
}