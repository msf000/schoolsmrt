
import './polyfills'; // Must be first
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("CRITICAL: Root element not found");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("FAIL: Mounting React application failed", error);
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Tajawal, sans-serif; text-align: center;">
        <div>
          <h1 style="color: #4f46e5;">حدث خطأ أثناء تحميل التطبيق</h1>
          <p>يرجى مسح ذاكرة التخزين المؤقت وإعادة المحاولة</p>
          <button onclick="localStorage.clear(); location.reload();" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">تصفير البيانات وإعادة التحميل</button>
        </div>
      </div>
    `;
  }
}
