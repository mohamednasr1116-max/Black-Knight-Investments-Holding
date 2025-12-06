
export const notificationService = {
    // Request permission for browser notifications
    requestPermission: async () => {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return false;
        }
        
        if (Notification.permission === "granted") {
            return true;
        }
        
        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    },

    // Send a browser notification
    sendBrowserNotification: (title: string, body: string) => {
        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: '/vite.svg' // Optional: path to app icon
            });
        }
    },

    // Simulate sending an email (In a real app, this calls a backend API)
    sendEmailWarning: async (toEmail: string, subject: string, body: string): Promise<boolean> => {
        // Mocking an API call
        console.log(`[EMAIL SERVICE] Sending email to: ${toEmail}`);
        console.log(`[EMAIL SERVICE] Subject: ${subject}`);
        console.log(`[EMAIL SERVICE] Body: ${body}`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 1000);
        });
    }
};
