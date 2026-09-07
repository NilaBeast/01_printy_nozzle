import "dotenv/config";
import app from './app.js';


// Run app.listen() only when NOT on Vercel
if (!process.env.VERCEL) {
    const PORT = process.env.SERVER_PORT || 3000;
    app.listen(PORT, () => {
        console.log(`App is running on port ${PORT}`);
    });
}

// Export for Vercel serverless
export default app;